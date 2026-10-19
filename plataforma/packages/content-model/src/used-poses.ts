import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { mascotGallerySchema } from './index.ts';
import { usedPosesFromSources } from './poses.ts';
import { CONTENT_ROOT, GALLERY_PATH } from './content-files.ts';
import { repoRoot } from './read-content.ts';

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

/** Poses que usan las láminas y las plantillas, leídas del disco desde la raíz del repositorio. */
export async function usedMascotPoses(
  root: string = repoRoot(),
): Promise<number[]> {
  const gallery = mascotGallerySchema.parse(
    JSON.parse(await readFile(join(root, GALLERY_PATH), 'utf8')),
  );
  const texts = await Promise.all(
    (await mdxFiles(join(root, CONTENT_ROOT))).map((file) =>
      readFile(file, 'utf8'),
    ),
  );
  return usedPosesFromSources(gallery, texts);
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
