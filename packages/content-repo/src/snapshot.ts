import { isContentText } from '@aula/content-model/content-files';
import type { GitHubClient } from './github.ts';

/** Estado del repositorio en un commit: todas las rutas y el texto del contenido. */
export interface Snapshot {
  repo: string;
  commit: string;
  tree: string;
  /** Todas las rutas versionadas (incluye imágenes, para comprobar las poses). */
  paths: string[];
  /** Archivos de texto de `content/`, con el SHA de su blob. */
  files: Record<string, { sha: string; text: string }>;
  loadedAt: string;
}

/** Blobs por SHA: su contenido nunca cambia, así que se guardan sin caducidad. */
export interface BlobCache {
  get(sha: string): Promise<string | undefined>;
  set(sha: string, text: string): Promise<void>;
}

export const memoryBlobCache = (): BlobCache => {
  const map = new Map<string, string>();
  return {
    get: async (sha) => map.get(sha),
    set: async (sha, text) => {
      map.set(sha, text);
    },
  };
};

export function snapshotFiles(snapshot: Snapshot): Map<string, string> {
  return new Map(
    Object.entries(snapshot.files).map(([path, file]) => [path, file.text]),
  );
}

async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const k = next++;
      const item = items[k];
      if (item !== undefined) results[k] = await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

/**
 * Lee el contenido del commit `head` (o del que apunta la rama). Solo descarga los blobs
 * que no están en el snapshot anterior ni en la caché; `known` aporta textos recién subidos.
 */
export async function loadSnapshot(
  client: GitHubClient,
  cache: BlobCache,
  options: {
    previous?: Snapshot | null;
    head?: string;
    known?: ReadonlyMap<string, string>;
  } = {},
): Promise<Snapshot> {
  const repo = `${client.repo.owner}/${client.repo.name}@${client.repo.branch}`;
  const head = options.head ?? (await client.getHead());
  const previous = options.previous?.repo === repo ? options.previous : null;
  if (previous?.commit === head) return previous;
  const commit = await client.getCommit(head);
  const entries = (await client.getTree(commit.tree)).filter(
    (entry) => entry.type === 'blob',
  );
  const wanted = entries.filter((entry) => isContentText(entry.path));
  const files: Snapshot['files'] = {};
  await mapLimit(wanted, 8, async (entry) => {
    const old = previous?.files[entry.path];
    let text = old?.sha === entry.sha ? old.text : undefined;
    const known = options.known?.get(entry.path);
    if (text === undefined && known !== undefined) {
      text = known;
      await cache.set(entry.sha, known);
    }
    text ??= await cache.get(entry.sha);
    if (text === undefined) {
      text = await client.getBlob(entry.sha);
      await cache.set(entry.sha, text);
    }
    files[entry.path] = { sha: entry.sha, text };
  });
  return {
    repo,
    commit: head,
    tree: commit.tree,
    paths: entries.map((entry) => entry.path).sort(),
    files,
    loadedAt: new Date().toISOString(),
  };
}
