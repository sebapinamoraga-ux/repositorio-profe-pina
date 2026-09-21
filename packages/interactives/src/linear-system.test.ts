import { describe, expect, it } from 'vitest';
import { solveLinearSystem, yOnLine } from './linear-system';

describe('sistemas lineales', () => {
  it('resuelve y comprueba el sistema de la cafetería', () => {
    const first = { a: 2, b: 3, c: 5100 };
    const second = { a: 4, b: 1, c: 6700 };
    const solution = solveLinearSystem(first, second);
    expect(solution).toEqual({ x: 1500, y: 700 });
    expect(first.a * solution!.x + first.b * solution!.y).toBe(first.c);
    expect(second.a * solution!.x + second.b * solution!.y).toBe(second.c);
  });

  it('no inventa una intersección para rectas paralelas', () => {
    expect(
      solveLinearSystem(
        { a: 1, b: 1, c: 2 },
        { a: 2, b: 2, c: 5 },
      ),
    ).toBeNull();
  });

  it('calcula un punto de una recta', () => {
    expect(yOnLine({ a: 2, b: 3, c: 5100 }, 1500)).toBe(700);
  });
});
