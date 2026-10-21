import { useCallback, useEffect, useRef, useState } from 'react';

/** Cuántos cambios se recuerdan: los últimos. */
export const HISTORY_LIMIT = 5;

export interface HistoryEntry {
  seq: number;
  label: string;
  at: number;
  /** Cambios seguidos con la misma clave (tecleo en un campo) se funden en una entrada. */
  key?: string;
  /** Vuelve la copia de trabajo a como estaba antes de este cambio (`content.snap()`). */
  undo: () => void;
}

interface Recorded {
  label: string;
  undo: () => void;
  key?: string;
  at?: number;
}

/**
 * Agrega un cambio (la lista va del más nuevo al más antiguo). Si repite la clave del último,
 * se funde con él: queda el deshacer más antiguo, que es el que vuelve a antes de teclear.
 */
export function recordEntry(
  entries: readonly HistoryEntry[],
  entry: Recorded,
  seq: number,
  now: number = Date.now(),
): HistoryEntry[] {
  const [latest, ...rest] = entries;
  if (latest && entry.key !== undefined && latest.key === entry.key)
    return [{ ...latest, label: entry.label, at: entry.at ?? now }, ...rest];
  const next: HistoryEntry = {
    seq,
    label: entry.label,
    at: entry.at ?? now,
    undo: entry.undo,
    ...(entry.key !== undefined ? { key: entry.key } : {}),
  };
  return [next, ...entries].slice(0, HISTORY_LIMIT);
}

/**
 * Deshace la entrada `k` (0 = la última) y todas las posteriores. Como cada `undo` restaura
 * toda la copia de trabajo, basta llamar al de la entrada más antigua de las deshechas.
 */
export function rewindEntries(entries: readonly HistoryEntry[], k: number) {
  const target = entries[k];
  if (!target) return null;
  return {
    undo: target.undo,
    rest: entries.slice(k + 1),
    message:
      k === 0 ? `Deshecho: ${target.label}` : `Se deshicieron ${k + 1} cambios`,
  };
}

interface State {
  scope: string;
  list: HistoryEntry[];
  seq: number;
}

/**
 * Historial de cambios de una clase, en memoria: se vacía al cambiar de `scope` (la clase) y
 * hay que vaciarlo con `clear()` cuando `content.snap()` ya no sirve (al publicar o guardar
 * «Datos de la clase»), porque restaurar tras eso devolvería archivos ya publicados.
 */
export function useHistory(scope: string) {
  const [state, setState] = useState<State>({ scope, list: [], seq: 0 });
  const current = state.scope === scope ? state : { scope, list: [], seq: 0 };
  const latest = useRef(current);
  useEffect(() => {
    latest.current = current;
  });

  const rec = useCallback(
    (label: string, undo: () => void, key?: string) =>
      setState((prev) => {
        const base = prev.scope === scope ? prev : { scope, list: [], seq: 0 };
        const seq = base.seq + 1;
        return {
          scope,
          seq,
          list: recordEntry(
            base.list,
            { label, undo, ...(key !== undefined ? { key } : {}) },
            seq,
          ),
        };
      }),
    [scope],
  );

  /** Deshace desde la entrada `k`; devuelve el mensaje para el aviso, o null si no hay nada. */
  const undoTo = useCallback(
    (k: number): string | null => {
      const result = rewindEntries(latest.current.list, k);
      if (!result) return null;
      result.undo();
      setState((prev) => ({ ...prev, scope, list: result.rest }));
      return result.message;
    },
    [scope],
  );

  const clear = useCallback(
    () => setState((prev) => ({ ...prev, scope, list: [] })),
    [scope],
  );

  return {
    entries: current.list,
    rec,
    undoTo,
    undo: () => undoTo(0),
    clear,
    canUndo: current.list.length > 0,
  };
}
