import { describe, expect, it } from 'vitest';
import {
  satisfiesLinearEquation,
  solveLinearSystem,
  yOnLine,
  type LinearEquation,
} from './linear-system';

const eq = (a: number, b: number, c: number): LinearEquation => ({ a, b, c });

describe('sistemas lineales', () => {
  it('resuelve y comprueba el sistema de la cafetería', () => {
    const first = eq(2, 3, 5100);
    const second = eq(4, 1, 6700);
    const solution = solveLinearSystem(first, second);
    expect(solution).toEqual({ x: 1500, y: 700 });
    expect(first.a * solution!.x + first.b * solution!.y).toBe(first.c);
    expect(second.a * solution!.x + second.b * solution!.y).toBe(second.c);
  });

  describe('sistemas de la clase', () => {
    const cases: [LinearEquation, LinearEquation, number, number][] = [
      [eq(1, 1, 7), eq(1, -1, 1), 4, 3],
      [eq(2, 1, 11), eq(1, 2, 10), 4, 3],
      [eq(3, 2, 16), eq(1, 2, 8), 4, 2],
      [eq(2, 3, 19), eq(2, -1, 7), 5, 3],
      [eq(1, 1, 30), eq(4, 2, 80), 10, 20],
    ];
    for (const [first, second, x, y] of cases)
      it(`comprueba (${x},${y}) en ambas ecuaciones`, () => {
        const solution = solveLinearSystem(first, second);
        expect(solution).toEqual({ x, y });
        expect(satisfiesLinearEquation(first, { x, y })).toBe(true);
        expect(satisfiesLinearEquation(second, { x, y })).toBe(true);
      });
  });

  it('rechaza un punto que no está en la recta', () => {
    expect(satisfiesLinearEquation(eq(1, 1, 7), { x: 4, y: 4 })).toBe(false);
  });

  it('no inventa una intersección para rectas paralelas', () => {
    expect(solveLinearSystem(eq(1, 1, 2), eq(2, 2, 5))).toBeNull();
  });

  it('no resuelve con coeficientes no finitos', () => {
    expect(solveLinearSystem(eq(Infinity, 1, 2), eq(1, 1, 5))).toBeNull();
    expect(solveLinearSystem(eq(NaN, 1, 2), eq(1, 1, 5))).toBeNull();
  });

  it('calcula un punto de una recta', () => {
    expect(yOnLine(eq(2, 3, 5100), 1500)).toBe(700);
  });

  it('no calcula y en una recta vertical', () => {
    expect(yOnLine(eq(1, 0, 3), 3)).toBeNull();
  });
});
