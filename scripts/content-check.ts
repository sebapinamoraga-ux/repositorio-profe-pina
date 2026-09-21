import { execFileSync } from 'node:child_process';
import { readFile, readdir } from 'node:fs/promises';
import { resolve, join, basename } from 'node:path';
import { parse } from 'yaml';
import { compile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { validateMdxTree } from '../packages/content-model/src/validate-mdx';
import { parseFrontmatter } from '../packages/content-model/src/frontmatter';
import {
  lessonSchema,
  slideSchema,
  activitySchema,
  mascotGallerySchema,
  mascotTemplateMdx,
} from '../packages/content-model/src/index';
import {
  mascotPngPath,
  usedMascotPoses,
} from '../packages/content-model/src/used-poses';
export async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((e) =>
        e.isDirectory()
          ? walk(join(dir, e.name))
          : Promise.resolve([join(dir, e.name)]),
      ),
    )
  ).flat();
}
function git(...args: string[]): string | undefined {
  try {
    return execFileSync('git', args, { encoding: 'utf8', stdio: 'pipe' });
  } catch {
    return undefined;
  }
}
/** Todas las PNG viven en disco; git y el sitio solo llevan las poses que el contenido usa. */
async function checkMascotAssets(root: string) {
  const pngDir = join(root, 'assets', 'mascotas', 'png');
  const used = await usedMascotPoses(root);
  const usedSet = new Set(used);
  for (const pose of used) {
    const path = await mascotPngPath(pngDir, pose);
    if (git('check-ignore', '-q', path) !== undefined)
      throw new Error(
        `La pose ${pose} se usa pero git la ignora: añade "!content/assets/mascotas/png/${pose}-*.png" a .gitignore.`,
      );
  }
  const tracked = git('ls-files', '-z', '--', 'content/assets/mascotas/png');
  for (const file of (tracked ?? '').split('\0').filter(Boolean)) {
    const pose = Number(/^(\d+)-/.exec(basename(file))?.[1]);
    if (!usedSet.has(pose))
      throw new Error(
        `${file} está versionado pero ninguna diapositiva ni plantilla lo usa: quítalo de git (git rm --cached) y de la lista de .gitignore.`,
      );
  }
}
export async function checkContent() {
  const root = resolve('content');
  const gallery = mascotGallerySchema.parse(
    JSON.parse(
      await readFile(join(root, 'galleries', 'mascot-presence.json'), 'utf8'),
    ),
  );
  await checkMascotAssets(root);
  const templateIds = new Set(gallery.templates.map((template) => template.id));
  for (const template of gallery.templates) {
    const source = mascotTemplateMdx(template);
    const slide = slideSchema.parse(parseFrontmatter(source));
    await compile(source, {
      remarkPlugins: [
        remarkFrontmatter,
        () => (tree: unknown) => validateMdxTree(tree, slide, templateIds),
        remarkMdxFrontmatter,
        remarkMath,
      ],
      rehypePlugins: [
        [rehypeKatex, { throwOnError: true, strict: 'error', trust: false }],
      ],
    });
  }
  const activityIds = new Set<string>();
  for (const path of await walk(join(root, 'activities'))) {
    if (!path.endsWith('.yaml')) continue;
    const data = activitySchema.parse(parse(await readFile(path, 'utf8')));
    if (activityIds.has(data.id))
      throw new Error(`Actividad duplicada: ${path}`);
    activityIds.add(data.id);
  }
  const curriculum = new Set<string>();
  for (const path of await walk(join(root, 'curriculum'))) {
    const value: unknown = parse(await readFile(path, 'utf8'));
    if (
      typeof value !== 'object' ||
      !value ||
      !('id' in value) ||
      typeof value.id !== 'string'
    )
      throw new Error(path);
    curriculum.add(value.id);
  }
  const ids = new Set<string>();
  let count = 0;
  for (const path of await walk(join(root, 'lessons'))) {
    if (basename(path) !== 'lesson.yaml') continue;
    try {
      const lesson = lessonSchema.parse(parse(await readFile(path, 'utf8')));
      if (ids.has(lesson.id))
        throw new Error('Identificador de clase duplicado');
      ids.add(lesson.id);
      if (new Set(lesson.slides).size !== lesson.slides.length)
        throw new Error('Archivo de diapositiva repetido');
      for (const ref of lesson.curriculum)
        if (!curriculum.has(ref))
          throw new Error(`Referencia curricular desconocida: ${ref}`);
      const slideIds = new Set<string>();
      for (const file of lesson.slides) {
        const slidePath = join(path, '..', 'slides', file);
        try {
          const text = await readFile(slidePath, 'utf8');
          for (const line of text.split('\n')) {
            if (line.includes('$$') && line.trim() !== '$$')
              throw new Error('Coloca cada delimitador $$ en su propia línea.');
          }
          const slide = slideSchema.parse(parseFrontmatter(text));
          if (slideIds.has(slide.id))
            throw new Error(`ID duplicado ${slide.id}`);
          slideIds.add(slide.id);
          for (const ref of slide.activities)
            if (!activityIds.has(ref))
              throw new Error(`Actividad desconocida ${ref}`);
          await compile(text, {
            remarkPlugins: [
              remarkFrontmatter,
              () => (tree: unknown) =>
                validateMdxTree(tree, slide, templateIds),
              remarkMdxFrontmatter,
              remarkMath,
            ],
            rehypePlugins: [
              [
                rehypeKatex,
                { throwOnError: true, strict: 'error', trust: false },
              ],
            ],
          });
          count++;
        } catch (error) {
          throw new Error(`${slidePath}: ${String(error)}`);
        }
      }
    } catch (error) {
      throw new Error(`${path}: ${String(error)}`);
    }
  }
  console.log(
    `Contenido válido: ${ids.size} clase(s), ${count} diapositivas, ${activityIds.size} actividad(es).`,
  );
}
if (process.argv[1]?.endsWith('content-check.ts')) await checkContent();
