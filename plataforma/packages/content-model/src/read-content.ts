import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, sep } from 'node:path';
import { isContentText } from './content-files.ts';

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(join(dir, entry.name))
          : Promise.resolve([join(dir, entry.name)]),
      ),
    )
  ).flat();
}

let root: string | undefined;
/**
 * Raíz del repositorio: la carpeta que contiene `plataforma/` y el contenido. Se busca
 * hacia arriba desde la carpeta actual, porque los comandos se ejecutan dentro de plataforma/.
 */
export function repoRoot(): string {
  if (root) return root;
  for (let dir = process.cwd(); ; dir = dirname(dir)) {
    if (existsSync(join(dir, 'plataforma', 'package.json')))
      return (root = dir);
    if (dirname(dir) === dir)
      throw new Error(
        'No se encontró la raíz del repositorio (falta plataforma/package.json).',
      );
  }
}
/** Ruta absoluta de un archivo dado con su ruta de git (`content/…`). */
export const repoPath = (...parts: string[]) => join(repoRoot(), ...parts);

/** Lee `content/` del disco como mapa ruta → texto, con las mismas rutas que usa git. */
export async function readContentFiles(
  base: string = repoRoot(),
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const path of (await walk(join(base, 'content'))).sort()) {
    const key = relative(base, path).split(sep).join('/');
    if (!isContentText(key)) continue;
    files.set(key, (await readFile(path, 'utf8')).replaceAll('\r\n', '\n'));
  }
  return files;
}
