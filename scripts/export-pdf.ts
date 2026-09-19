import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'yaml';
import { lessonSchema } from '../packages/content-model/src/index';
import { walk } from './content-check';
const at = process.argv.indexOf('--lesson');
const id = at >= 0 ? process.argv[at + 1] : 'sistemas-2x2';
if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
  throw new Error('Identificador de clase inválido');
let expected = 0;
for (const file of await walk(resolve('content/lessons'))) {
  if (!file.endsWith('lesson.yaml')) continue;
  const lesson = lessonSchema.parse(parse(await readFile(file, 'utf8')));
  if (lesson.id === id && lesson.status === 'published')
    expected = lesson.slides.length;
}
if (!expected) throw new Error('Clase publicada no encontrada.');
const server = await preview({
  configFile: resolve('apps/presenter/vite.config.ts'),
  preview: { port: 4173, host: '127.0.0.1', strictPort: true },
});
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1600, height: 900 },
  });
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
  await mkdir('output/qa', { recursive: true });
  for (let i = 0; i < expected; i++)
    await page
      .locator('.slide')
      .nth(i)
      .screenshot({
        path: `output/qa/slide-${String(i + 1).padStart(2, '0')}.png`,
      });
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
          for (const file of (await walk(resolve('dist'))).sort()) {
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
} finally {
  await browser.close();
  await new Promise<void>((resolve, reject) =>
    server.httpServer.close((error) => (error ? reject(error) : resolve())),
  );
}
