import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { mascotGallerySchema } from './index.ts';

async function mdxFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? mdxFiles(join(dir, entry.name))
          : Promise.resolve(
              entry.name.endsWith('.mdx') ? [join(dir, entry.name)] : [],
            ),
      ),
    )
  ).flat();
}

/** Poses que aparecen en la galería o en alguna diapositiva: las únicas que el sitio y git necesitan. */
export async function usedMascotPoses(contentRoot: string): Promise<number[]> {
  const poses = new Set<number>();
  const gallery = mascotGallerySchema.parse(
    JSON.parse(
      await readFile(
        join(contentRoot, 'galleries', 'mascot-presence.json'),
        'utf8',
      ),
    ),
  );
  for (const template of gallery.templates) poses.add(template.mascot.pose);
  for (const file of await mdxFiles(join(contentRoot, 'lessons')))
    for (const match of (await readFile(file, 'utf8')).matchAll(
      /\bpose=(?:\{\s*(\d+)\s*\}|"(\d+)")/g,
    ))
      poses.add(Number(match[1] ?? match[2]));
  return [...poses].sort((a, b) => a - b);
}

/** Ruta del único PNG `N-descripcion.png` de una pose. */
export async function mascotPngPath(
  pngDir: string,
  pose: number,
): Promise<string> {
  const matches = (await readdir(pngDir)).filter(
    (name) => name.startsWith(`${pose}-`) && name.endsWith('.png'),
  );
  const [match] = matches;
  if (matches.length !== 1 || !match)
    throw new Error(
      `La pose ${pose} debe tener un único PNG en ${pngDir} (hay ${matches.length}).`,
    );
  return join(pngDir, match);
}
