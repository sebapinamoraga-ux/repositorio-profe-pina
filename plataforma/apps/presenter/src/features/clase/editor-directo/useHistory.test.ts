import { describe, expect, it, vi } from 'vitest';
import {
  HISTORY_LIMIT,
  recordEntry,
  rewindEntries,
  type HistoryEntry,
} from './useHistory';

const noop = () => undefined;
function record(
  entries: HistoryEntry[],
  label: string,
  key?: string,
  undo = noop,
) {
  return recordEntry(
    entries,
    { label, undo, ...(key !== undefined ? { key } : {}) },
    entries.length + 1,
    1000,
  );
}

describe('historial de cambios', () => {
  it('la lista va del más nuevo al más antiguo y conserva los últimos cinco', () => {
    let entries: HistoryEntry[] = [];
    for (let k = 1; k <= HISTORY_LIMIT + 2; k++)
      entries = recordEntry(
        entries,
        { label: `Cambio ${k}`, undo: noop },
        k,
        k,
      );
    expect(entries.map((e) => e.label)).toEqual([
      'Cambio 7',
      'Cambio 6',
      'Cambio 5',
      'Cambio 4',
      'Cambio 3',
    ]);
  });

  it('el tecleo seguido en un mismo campo se funde y conserva el deshacer más antiguo', () => {
    const first = vi.fn();
    const second = vi.fn();
    let entries = record(
      [],
      'Cambió el título de la lámina',
      'titulo:a',
      first,
    );
    entries = record(
      entries,
      'Cambió el título de la lámina',
      'titulo:a',
      second,
    );
    expect(entries).toHaveLength(1);
    expect(entries[0]?.undo).toBe(first);
    // Otra clave, o la misma tras otro cambio, abre una entrada nueva.
    entries = record(entries, 'Agregó un paso');
    entries = record(entries, 'Cambió el título de la lámina', 'titulo:a');
    expect(entries.map((e) => e.label)).toEqual([
      'Cambió el título de la lámina',
      'Agregó un paso',
      'Cambió el título de la lámina',
    ]);
  });

  it('deshacer una entrada deshace también las posteriores, con el aviso que corresponde', () => {
    const undos = [vi.fn(), vi.fn(), vi.fn()];
    let entries: HistoryEntry[] = [];
    undos.forEach((undo, k) => {
      entries = record(entries, `Cambio ${k + 1}`, undefined, undo);
    });
    const last = rewindEntries(entries, 0);
    expect(last?.message).toBe('Deshecho: Cambio 3');
    expect(last?.undo).toBe(undos[2]);
    expect(last?.rest.map((e) => e.label)).toEqual(['Cambio 2', 'Cambio 1']);
    const older = rewindEntries(entries, 1);
    // Basta el deshacer de la más antigua: restaura toda la copia de trabajo.
    expect(older?.undo).toBe(undos[1]);
    expect(older?.message).toBe('Se deshicieron 2 cambios');
    expect(older?.rest.map((e) => e.label)).toEqual(['Cambio 1']);
    expect(rewindEntries(entries, 3)).toBeNull();
  });
});
