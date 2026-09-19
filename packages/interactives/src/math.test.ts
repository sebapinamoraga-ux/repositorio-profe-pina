import { describe, it, expect } from 'vitest';
import { solveSystem, satisfies, type Equation } from './math';
describe('Sistemas de la clase', () => {
  const cases: [Equation, Equation, number, number][] = [
    [[1, 1, 7], [1, -1, 1], 4, 3],
    [[2, 1, 11], [1, 2, 10], 4, 3],
    [[3, 2, 16], [1, 2, 8], 4, 2],
    [[2, 3, 19], [2, -1, 7], 5, 3],
    [[1, 1, 30], [4, 2, 80], 10, 20],
  ];
  for (const [a, b, x, y] of cases)
    it(`comprueba (${x},${y}) en ambas ecuaciones`, () => {
      expect(solveSystem(a, b)).toEqual({ x, y });
      expect(satisfies(a, x, y)).toBe(true);
      expect(satisfies(b, x, y)).toBe(true);
    });
  it('no divide por cero en rectas paralelas', () => {
    expect(solveSystem([1, 1, 7], [2, 2, 15])).toBeNull();
  });
});
