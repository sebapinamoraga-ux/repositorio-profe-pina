/** Dónde va una lámina: el tramo y la posición dentro de él (0 = al comienzo). */
export interface DropTarget {
  tramo: number;
  at: number;
}

export type Groups = readonly (readonly string[])[];

export type GroupsEdit =
  | { ok: true; groups: string[][] }
  | { ok: false; emptied: number };

/** Un tramo no puede quedar sin láminas (verifyLessonPlan): se avisa cuál. */
function checked(groups: string[][]): GroupsEdit {
  const emptied = groups.findIndex((group) => group.length === 0);
  return emptied >= 0 ? { ok: false, emptied } : { ok: true, groups };
}

/**
 * Lleva las láminas `ids` (en el orden en que están en la lista) a `target`. La posición se
 * cuenta sobre la lista antes de mover, como la ve quien arrastra.
 */
export function moveIds(
  groups: Groups,
  ids: readonly string[],
  target: DropTarget,
): GroupsEdit {
  const moving = new Set(ids);
  const ordered = groups.flat().filter((id) => moving.has(id));
  const destination = groups[target.tramo];
  if (!destination) return { ok: true, groups: groups.map((g) => [...g]) };
  const removedBefore = destination
    .slice(0, target.at)
    .filter((id) => moving.has(id)).length;
  const next = groups.map((group) => group.filter((id) => !moving.has(id)));
  next[target.tramo]?.splice(target.at - removedBefore, 0, ...ordered);
  return checked(next);
}

/** Agrega una lámina nueva en `target`. */
export function insertId(
  groups: Groups,
  id: string,
  target: DropTarget,
): string[][] {
  const next = groups.map((group) => [...group]);
  next[target.tramo]?.splice(target.at, 0, id);
  return next;
}

/** Quita una lámina de su tramo. */
export function removeId(groups: Groups, id: string): GroupsEdit {
  return checked(groups.map((group) => group.filter((other) => other !== id)));
}

/** Dónde queda una lámina al subirla (-1) o bajarla (+1) un lugar, también entre tramos. */
export function stepTarget(
  groups: Groups,
  id: string,
  direction: -1 | 1,
): DropTarget | null {
  const tramo = groups.findIndex((group) => group.includes(id));
  const group = groups[tramo];
  if (!group) return null;
  const at = group.indexOf(id);
  if (direction < 0) {
    if (at > 0) return { tramo, at: at - 1 };
    const previous = groups[tramo - 1];
    return previous ? { tramo: tramo - 1, at: previous.length } : null;
  }
  if (at < group.length - 1) return { tramo, at: at + 2 };
  return groups[tramo + 1] ? { tramo: tramo + 1, at: 0 } : null;
}

/** Posición `tramo/at` de una lámina. */
export function locate(groups: Groups, id: string): DropTarget | null {
  const tramo = groups.findIndex((group) => group.includes(id));
  return tramo < 0 ? null : { tramo, at: groups[tramo]?.indexOf(id) ?? 0 };
}
