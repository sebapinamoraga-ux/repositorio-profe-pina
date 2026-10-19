import { describe, expect, it } from 'vitest';
import { formatEntero, lecturasResta, operando, recorrido, rotulosRecta } from './integer-line';

describe('recta de los enteros', () => {
  it('escribe los negativos con signo menos y sin cero negativo', () => {
    expect(formatEntero(-3)).toBe('−3');
    expect(formatEntero(-0)).toBe('0');
    expect(formatEntero(7)).toBe('7');
    expect(operando(-8)).toBe('(−8)');
    expect(operando(8)).toBe('8');
    expect(() => formatEntero(1.5)).toThrow('entero');
  });

  it('recorre los saltos en orden desde el punto de partida', () => {
    expect(recorrido(5, [-8])).toEqual([5, -3]);
    expect(recorrido(-2, [6, -3])).toEqual([-2, 4, 1]);
    expect(recorrido(0, [])).toEqual([0]);
  });

  it('lee cada resta como la suma del opuesto, con el mismo resultado', () => {
    expect(lecturasResta(5, 8)).toEqual({ resta: '5 − 8 = −3', suma: '5 + (−8) = −3', resultado: -3 });
    expect(lecturasResta(4, -3)).toEqual({ resta: '4 − (−3) = 7', suma: '4 + 3 = 7', resultado: 7 });
    expect(lecturasResta(-2, 0).resultado).toBe(-2);
    for (let a = -10; a <= 10; a++)
      for (let b = -10; b <= 10; b++) expect(lecturasResta(a, b).resultado).toBe(a - b);
  });

  it('rotula cada entero en rectas cortas, cada 2 en las medianas y cada 5 en las largas', () => {
    expect(rotulosRecta(-3, 3)).toEqual([-3, -2, -1, 0, 1, 2, 3]);
    expect(rotulosRecta(-10, 10)).toEqual([-10, -8, -6, -4, -2, 0, 2, 4, 6, 8, 10]);
    expect(rotulosRecta(-20, 20)).toEqual([-20, -15, -10, -5, 0, 5, 10, 15, 20]);
    expect(() => rotulosRecta(3, 3)).toThrow('min < max');
  });
});
