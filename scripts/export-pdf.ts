import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { lessonSchema } from '../packages/content-model/src/index';
import { walk } from './content-check';
import { PDF_BUILD_DIR } from './build-dirs';
process.env.AULA_OUT_DIR = PDF_BUILD_DIR;
const at = process.argv.indexOf('--lesson');
/** --published exporta todas las clases publicadas (lo que necesita publish:pdf en CI). */
const all = process.argv.includes('--published');
const wanted = at >= 0 ? process.argv[at + 1] : 'sistemas-2x2';
if (!all && (!wanted || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(wanted)))
  throw new Error('Identificador de clase inválido');
const lessons: { id: string; expected: number }[] = [];
for (const file of (await walk(resolve('content/lessons'))).sort()) {
  if (!file.endsWith('lesson.yaml')) continue;
  const lesson = lessonSchema.parse(parse(await readFile(file, 'utf8')));
  if (all ? lesson.status === 'published' : lesson.id === wanted)
    lessons.push({ id: lesson.id, expected: lesson.slides.length });
}
if (!lessons.length && !all) throw new Error('Clase no encontrada.');
const server = await preview({
  configFile: resolve('apps/presenter/vite.config.ts'),
  preview: { port: 4173, host: '127.0.0.1', strictPort: true },
});
const browser = await chromium.launch();
try {
  for (const { id, expected } of lessons) {
    const page = await browser.newPage({
      viewport: { width: 1600, height: 900 },
    });
    const qa = lessons.length > 1 ? `output/qa/${id}` : 'output/qa';
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const base = process.env.BASE_PATH || '/';
    await page.goto(`http://127.0.0.1:4173${base}#clase=${id}&modo=pdf`, {
      waitUntil: 'networkidle',
    });
    await page.evaluate(() => document.fonts.ready);
    if ((await page.locator('.slide').count()) !== expected)
      throw new Error('Cantidad de diapositivas inesperada');
    if (errors.length) throw new Error(errors.join('\n'));
    const overflow = await page.locator('.slide').evaluateAll((slides) =>
      slides
        .filter((s) => {
          const content = s.querySelector('.slide-content');
          const footer = s.querySelector('footer');
          return (
            !content ||
            !footer ||
            content.getBoundingClientRect().bottom >
              footer.getBoundingClientRect().top - 5
          );
        })
        .map((s) => s.getAttribute('data-slide')),
    );
    if (overflow.length)
      throw new Error(`Contenido fuera del lienzo: ${overflow.join(', ')}`);
    await mkdir('output/pdf', { recursive: true });
    await mkdir(qa, { recursive: true });
    for (let i = 0; i < expected; i++)
      await page
        .locator('.slide')
        .nth(i)
        .screenshot({
          path: `${qa}/slide-${String(i + 1).padStart(2, '0')}.png`,
        });
    await page.emulateMedia({ media: 'print' });
    const shadowed = await page.locator('.print-deck').evaluate((deck) => {
      const found = new Set<string>();
      for (const el of [deck, ...deck.querySelectorAll('*')])
        for (const pseudo of [null, '::before', '::after']) {
          const style = getComputedStyle(el, pseudo);
          if (
            style.boxShadow !== 'none' ||
            style.textShadow !== 'none' ||
            /blur|drop-shadow/.test(style.filter)
          )
            found.add(
              el.closest('.slide')?.getAttribute('data-slide') ?? 'fuera',
            );
        }
      return [...found];
    });
    if (shadowed.length)
      throw new Error(
        `Sombras o desenfoques en el PDF (se ven mal en visores antiguos): ${shadowed.join(', ')}`,
      );
    await page.pdf({
      path: `output/pdf/${id}.pdf`,
      preferCSSPageSize: true,
      printBackground: true,
      displayHeaderFooter: false,
    });
    await writeFile(
      `output/pdf/${id}.json`,
      JSON.stringify(
        {
          lesson: id,
          slides: expected,
          generatedAt: new Date().toISOString(),
          revision: process.env.GITHUB_SHA ?? 'local',
          buildHash: await (async () => {
            const hash = createHash('sha256');
            for (const file of (await walk(resolve(PDF_BUILD_DIR))).sort()) {
              hash.update(await readFile(file));
            }
            return hash.digest('hex');
          })(),
        },
        null,
        2,
      ),
    );
    console.log(
      `PDF creado: output/pdf/${id}.pdf (${expected} páginas esperadas)`,
    );
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
