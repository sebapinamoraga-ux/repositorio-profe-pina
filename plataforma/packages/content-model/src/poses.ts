import type { MascotGallery } from './index.ts';

export const MASCOT_PNG_DIR = 'content/assets/mascotas/png';

/** Poses que aparecen en la galería o en alguna diapositiva: las únicas que el sitio y git necesitan. */
export function usedPosesFromSources(
  gallery: MascotGallery,
  mdxTexts: Iterable<string>,
): number[] {
  const poses = new Set<number>();
  for (const template of gallery.templates) poses.add(template.mascot.pose);
  for (const text of mdxTexts)
    for (const match of text.matchAll(/\bpose=(?:\{\s*(\d+)\s*\}|"(\d+)")/g))
      poses.add(Number(match[1] ?? match[2]));
  return [...poses].sort((a, b) => a - b);
}

/** Pose de un archivo `N-descripcion.png`, o null si el nombre no sigue la convención. */
export function poseOfPng(path: string): number | null {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const match = /^(\d+)-.*\.png$/.exec(name);
  return match ? Number(match[1]) : null;
}
