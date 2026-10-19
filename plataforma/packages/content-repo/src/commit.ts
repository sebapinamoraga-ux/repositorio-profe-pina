import type { ContentProblem } from '@aula/content-model/content-files';
import type { GitHubClient, TreeChange } from './github.ts';
import {
  loadSnapshot,
  snapshotFiles,
  type BlobCache,
  type Snapshot,
} from './snapshot.ts';
import { overlay, rebase, type WorkingCopy } from './working-copy.ts';

export type SaveResult =
  | { kind: 'saved'; commit: string; snapshot: Snapshot; wc: WorkingCopy }
  | { kind: 'nothing'; snapshot: Snapshot; wc: WorkingCopy }
  | { kind: 'conflicts'; snapshot: Snapshot; wc: WorkingCopy }
  | {
      kind: 'invalid';
      snapshot: Snapshot;
      wc: WorkingCopy;
      problems: ContentProblem[];
    };

export interface SaveOptions {
  message: string;
  cache: BlobCache;
  /** Comprueba el contenido resultante; si hay problemas, no se guarda. */
  validate?: (
    files: ReadonlyMap<string, string>,
    snapshot: Snapshot,
    changed: ReadonlySet<string>,
  ) => Promise<ContentProblem[]>;
  maxAttempts?: number;
}

/**
 * Guarda todos los cambios en un solo commit sobre la rama. Si la rama avanzó mientras
 * tanto, trae lo nuevo, vuelve a validar y reintenta; si hay archivos tocados en los dos
 * lados, se detiene y devuelve los conflictos para que la docente decida.
 */
export async function saveChanges(
  client: GitHubClient,
  start: { snapshot: Snapshot; wc: WorkingCopy },
  options: SaveOptions,
): Promise<SaveResult> {
  let { snapshot, wc } = start;
  const attempts = options.maxAttempts ?? 3;
  for (let attempt = 0; attempt < attempts; attempt++) {
    const head = await client.getHead();
    if (head !== snapshot.commit) {
      snapshot = await loadSnapshot(client, options.cache, {
        previous: snapshot,
        head,
      });
      wc = rebase(wc, snapshot);
    }
    if (wc.conflicts.length) return { kind: 'conflicts', snapshot, wc };
    const entries = Object.entries(wc.changes);
    if (!entries.length) return { kind: 'nothing', snapshot, wc };
    const changed = new Set(entries.map(([path]) => path));
    const files = overlay(snapshotFiles(snapshot), wc);
    const problems = options.validate
      ? await options.validate(files, snapshot, changed)
      : [];
    if (problems.length) return { kind: 'invalid', snapshot, wc, problems };
    const tree = await client.createTree(
      snapshot.tree,
      entries.map(
        ([path, change]): TreeChange =>
          change.op === 'put'
            ? { path, content: change.text }
            : { path, delete: true },
      ),
    );
    const commit = await client.createCommit(options.message, tree, head);
    if ((await client.updateRef(commit)) === 'not-fast-forward') continue;
    const known = new Map(
      entries.flatMap(([path, change]) =>
        change.op === 'put' ? [[path, change.text] as const] : [],
      ),
    );
    const next = await loadSnapshot(client, options.cache, {
      previous: snapshot,
      head: commit,
      known,
    });
    return {
      kind: 'saved',
      commit,
      snapshot: next,
      wc: { ...wc, changes: {}, conflicts: [] },
    };
  }
  throw new Error(
    'La rama cambió varias veces mientras se guardaba. Vuelve a intentarlo.',
  );
}
