import { describe, expect, it } from 'vitest';
import { insertId, locate, moveIds, removeId, stepTarget } from './layout-ops';

const groups = [['a', 'b'], ['c', 'd', 'e'], ['f']];

describe('mover láminas entre tramos', () => {
  it('mueve dentro del tramo contando la posición antes de mover', () => {
    expect(moveIds(groups, ['a'], { tramo: 0, at: 2 })).toEqual({
      ok: true,
      groups: [['b', 'a'], ['c', 'd', 'e'], ['f']],
    });
    expect(moveIds(groups, ['b'], { tramo: 0, at: 0 })).toEqual({
      ok: true,
      groups: [['b', 'a'], ['c', 'd', 'e'], ['f']],
    });
    expect(moveIds(groups, ['e'], { tramo: 1, at: 1 })).toEqual({
      ok: true,
      groups: [['a', 'b'], ['c', 'e', 'd'], ['f']],
    });
  });
  it('mueve a otro tramo y varias juntas conservan su orden', () => {
    expect(moveIds(groups, ['d'], { tramo: 2, at: 0 })).toEqual({
      ok: true,
      groups: [
        ['a', 'b'],
        ['c', 'e'],
        ['d', 'f'],
      ],
    });
    expect(moveIds(groups, ['e', 'c'], { tramo: 0, at: 1 })).toEqual({
      ok: true,
      groups: [['a', 'c', 'e', 'b'], ['d'], ['f']],
    });
  });
  it('no deja un tramo vacío', () => {
    expect(moveIds(groups, ['f'], { tramo: 0, at: 0 })).toEqual({
      ok: false,
      emptied: 2,
    });
    expect(removeId(groups, 'f')).toEqual({ ok: false, emptied: 2 });
    expect(removeId(groups, 'a')).toEqual({
      ok: true,
      groups: [['b'], ['c', 'd', 'e'], ['f']],
    });
  });
  it('inserta una lámina nueva', () => {
    expect(insertId(groups, 'x', { tramo: 1, at: 3 })[1]).toEqual([
      'c',
      'd',
      'e',
      'x',
    ]);
  });
  it('Alt + flechas mueve un lugar y cruza tramos', () => {
    expect(stepTarget(groups, 'b', -1)).toEqual({ tramo: 0, at: 0 });
    expect(stepTarget(groups, 'a', -1)).toBeNull();
    expect(stepTarget(groups, 'c', -1)).toEqual({ tramo: 0, at: 2 });
    expect(stepTarget(groups, 'e', 1)).toEqual({ tramo: 2, at: 0 });
    expect(stepTarget(groups, 'f', 1)).toBeNull();
    expect(stepTarget(groups, 'c', 1)).toEqual({ tramo: 1, at: 2 });
    const down = stepTarget(groups, 'c', 1);
    expect(down && moveIds(groups, ['c'], down)).toEqual({
      ok: true,
      groups: [['a', 'b'], ['d', 'c', 'e'], ['f']],
    });
    expect(locate(groups, 'd')).toEqual({ tramo: 1, at: 1 });
  });
});
