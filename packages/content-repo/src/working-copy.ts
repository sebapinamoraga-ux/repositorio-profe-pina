import type { Snapshot } from './snapshot.ts';

/**
 * Cambio pendiente de un archivo. `baseSha` es el blob sobre el que se editó (null si el
 * archivo no existía): al guardar, si la rama ya tiene otro blob en esa ruta, hay conflicto.
 */
export type FileChange =
  | { op: 'put'; text: string; baseSha: string | null }
  | { op: 'delete'; baseSha: string };

export interface Conflict {
  path: string;
  ours: FileChange;
  /** Texto actual en la rama, o null si allí se borró. */
  theirs: string | null;
  theirsSha: string | null;
}

/** Cambios aún no guardados en el repositorio. Se conservan en el navegador hasta guardar. */
export interface WorkingCopy {
  version: 1;
  repo: string;
  changes: Record<string, FileChange>;
  conflicts: Conflict[];
}

export const emptyWorkingCopy = (repo: string): WorkingCopy => ({
  version: 1,
  repo,
  changes: {},
  conflicts: [],
});

export const changeCount = (wc: WorkingCopy) =>
  Object.keys(wc.changes).length + wc.conflicts.length;

/** Contenido efectivo: el snapshot con los cambios encima (los conflictos usan nuestra versión). */
export function overlay(
  base: ReadonlyMap<string, string>,
  wc: WorkingCopy,
): Map<string, string> {
  const files = new Map(base);
  const apply = (path: string, change: FileChange) => {
    if (change.op === 'put') files.set(path, change.text);
    else files.delete(path);
  };
  for (const conflict of wc.conflicts) apply(conflict.path, conflict.ours);
  for (const [path, change] of Object.entries(wc.changes)) apply(path, change);
  return files;
}

function withChange(
  wc: WorkingCopy,
  path: string,
  change: FileChange | null,
): WorkingCopy {
  const changes = { ...wc.changes };
  if (change) changes[path] = change;
  else delete changes[path];
  return {
    ...wc,
    changes,
    conflicts: wc.conflicts.filter((conflict) => conflict.path !== path),
  };
}

/** Escribe un archivo. Si queda igual que en la rama, el cambio desaparece. */
export function putFile(
  wc: WorkingCopy,
  snapshot: Snapshot,
  path: string,
  text: string,
): WorkingCopy {
  const head = snapshot.files[path];
  const existing = wc.changes[path] ?? wc.conflicts.find((c) => c.path === path)?.ours;
  if (head && head.text === text) return withChange(wc, path, null);
  return withChange(wc, path, {
    op: 'put',
    text,
    baseSha: existing ? existing.baseSha : (head?.sha ?? null),
  });
}

export function deleteFile(
  wc: WorkingCopy,
  snapshot: Snapshot,
  path: string,
): WorkingCopy {
  const head = snapshot.files[path];
  const existing = wc.changes[path];
  if (!head) return withChange(wc, path, null);
  return withChange(wc, path, {
    op: 'delete',
    baseSha: existing?.baseSha ?? head.sha,
  });
}

/**
 * Trae los cambios sobre un snapshot más reciente. Los archivos que nadie más tocó siguen
 * pendientes; los que ya quedaron iguales se descartan; el resto pasa a conflicto.
 */
export function rebase(wc: WorkingCopy, snapshot: Snapshot): WorkingCopy {
  const changes: Record<string, FileChange> = {};
  const conflicts: Conflict[] = [...wc.conflicts];
  for (const [path, change] of Object.entries(wc.changes)) {
    const head = snapshot.files[path];
    const headSha = head?.sha ?? null;
    if (headSha === change.baseSha) {
      changes[path] = change;
      continue;
    }
    const applied =
      change.op === 'put' ? head?.text === change.text : head === undefined;
    if (applied) continue;
    conflicts.push({
      path,
      ours: change,
      theirs: head?.text ?? null,
      theirsSha: headSha,
    });
  }
  // Conflictos anteriores: se actualiza la versión de la rama.
  for (const conflict of conflicts) {
    const head = snapshot.files[conflict.path];
    conflict.theirs = head?.text ?? null;
    conflict.theirsSha = head?.sha ?? null;
  }
  return { ...wc, changes, conflicts };
}

/** «Conservar mi versión» la vuelve a aplicar sobre la rama; «tomar la del repositorio» la descarta. */
export function resolveConflict(
  wc: WorkingCopy,
  path: string,
  choice: 'mine' | 'theirs',
): WorkingCopy {
  const conflict = wc.conflicts.find((item) => item.path === path);
  if (!conflict) return wc;
  const conflicts = wc.conflicts.filter((item) => item.path !== path);
  if (choice === 'theirs') return { ...wc, conflicts };
  const ours = conflict.ours;
  const changes = { ...wc.changes };
  if (ours.op === 'put')
    changes[path] = { op: 'put', text: ours.text, baseSha: conflict.theirsSha };
  else if (conflict.theirsSha)
    changes[path] = { op: 'delete', baseSha: conflict.theirsSha };
  return { ...wc, changes, conflicts };
}

const sameChange = (a: FileChange, b: FileChange) =>
  a.op === b.op && (a.op !== 'put' || (b.op === 'put' && a.text === b.text));

/**
 * Tras guardar: quita lo que ya quedó en la rama y conserva lo editado mientras se guardaba,
 * ahora sobre el nuevo snapshot (sin que aparezcan conflictos consigo mismo).
 */
export function settleSaved(
  current: WorkingCopy,
  sent: Readonly<Record<string, FileChange>>,
  snapshot: Snapshot,
): WorkingCopy {
  const changes: Record<string, FileChange> = {};
  for (const [path, change] of Object.entries(current.changes)) {
    const was = sent[path];
    const head = snapshot.files[path];
    if (was && sameChange(was, change)) continue;
    if (change.op === 'put' && head?.text === change.text) continue;
    if (!was) changes[path] = change;
    else if (change.op === 'put')
      changes[path] = { ...change, baseSha: head?.sha ?? null };
    else if (head) changes[path] = { op: 'delete', baseSha: head.sha };
  }
  return { ...current, changes };
}
