import { readFile, readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
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

/** Lee `content/` del disco como mapa ruta → texto, con las mismas rutas que usa git. */
export async function readContentFiles(
  repoRoot: string,
): Promise<Map<string, string>> {
  const files = new Map<string, string>();
  for (const path of (await walk(join(repoRoot, 'content'))).sort()) {
    const key = relative(repoRoot, path).split(sep).join('/');
    if (!isContentText(key)) continue;
    files.set(key, (await readFile(path, 'utf8')).replaceAll('\r\n', '\n'));
  }
  return files;
}
