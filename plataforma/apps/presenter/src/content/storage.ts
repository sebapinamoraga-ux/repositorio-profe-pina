import { z } from 'zod';
import type { BlobCache, Snapshot, WorkingCopy } from '@aula/content-repo';
import { read, write } from '../store/persist';

/** Repositorio del sitio publicado; la pantalla Conexión permite usar otro. */
export const DEFAULT_REPO = 'sebapinamoraga-ux/repositorio-profe-pina';
export const DEFAULT_BRANCH = 'main';

export const CONNECTION_KEY = 'profe-pina-aula-github';
export const CHANGES_KEY = 'profe-pina-aula-cambios-v1';

const connectionSchema = z.object({
  repo: z.string().min(3),
  branch: z.string().min(1),
  token: z.string().min(1),
});
export type Connection = z.infer<typeof connectionSchema>;

/** El token queda solo en este navegador; nunca va en URLs, registros ni BroadcastChannel. */
export function loadConnection(): Connection | null {
  try {
    const parsed = connectionSchema.safeParse(JSON.parse(read(CONNECTION_KEY) ?? ''));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export const saveConnection = (connection: Connection | null) =>
  write(CONNECTION_KEY, connection ? JSON.stringify(connection) : null);

const fileChangeSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('put'), text: z.string(), baseSha: z.string().nullable() }),
  z.object({ op: z.literal('delete'), baseSha: z.string() }),
]);
const workingCopySchema = z.object({
  version: z.literal(1),
  repo: z.string(),
  changes: z.record(fileChangeSchema),
  conflicts: z.array(
    z.object({
      path: z.string(),
      ours: fileChangeSchema,
      theirs: z.string().nullable(),
      theirsSha: z.string().nullable(),
    }),
  ),
});

export function parseWorkingCopy(raw: string | null): WorkingCopy | null {
  if (!raw) return null;
  try {
    const parsed = workingCopySchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
export const loadWorkingCopy = () => parseWorkingCopy(read(CHANGES_KEY));
export const saveWorkingCopy = (wc: WorkingCopy) =>
  write(
    CHANGES_KEY,
    Object.keys(wc.changes).length || wc.conflicts.length ? JSON.stringify(wc) : null,
  );

const snapshotSchema = z.object({
  repo: z.string(),
  commit: z.string(),
  tree: z.string(),
  paths: z.array(z.string()),
  files: z.record(z.object({ sha: z.string(), text: z.string() })),
  loadedAt: z.string(),
});

/** IndexedDB nativo: blobs por SHA y el último snapshot, para abrir sin conexión. */
const DB_NAME = 'profe-pina-aula-contenido';
let dbPromise: Promise<IDBDatabase | null> | null = null;
function db(): Promise<IDBDatabase | null> {
  dbPromise ??= new Promise((done) => {
    try {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('blobs');
        request.result.createObjectStore('state');
      };
      request.onsuccess = () => done(request.result);
      request.onerror = () => done(null);
      request.onblocked = () => done(null);
    } catch {
      done(null);
    }
  });
  return dbPromise;
}

async function idbGet(store: string, key: string): Promise<unknown> {
  const database = await db();
  if (!database) return undefined;
  return new Promise((done) => {
    try {
      const request = database.transaction(store).objectStore(store).get(key);
      request.onsuccess = () => done(request.result);
      request.onerror = () => done(undefined);
    } catch {
      done(undefined);
    }
  });
}

async function idbSet(store: string, key: string, value: unknown): Promise<void> {
  const database = await db();
  if (!database) return;
  await new Promise<void>((done) => {
    try {
      const tx = database.transaction(store, 'readwrite');
      tx.objectStore(store).put(value, key);
      tx.oncomplete = () => done();
      tx.onerror = () => done();
      tx.onabort = () => done();
    } catch {
      done();
    }
  });
}

const memory = new Map<string, string>();
export const blobCache: BlobCache = {
  async get(sha) {
    const hit = memory.get(sha);
    if (hit !== undefined) return hit;
    const stored = await idbGet('blobs', sha);
    return typeof stored === 'string' ? stored : undefined;
  },
  async set(sha, text) {
    memory.set(sha, text);
    await idbSet('blobs', sha, text);
  },
};

export async function loadCachedSnapshot(repo: string): Promise<Snapshot | null> {
  const parsed = snapshotSchema.safeParse(await idbGet('state', 'snapshot'));
  return parsed.success && parsed.data.repo === repo ? parsed.data : null;
}
export const saveCachedSnapshot = (snapshot: Snapshot) =>
  idbSet('state', 'snapshot', snapshot);
