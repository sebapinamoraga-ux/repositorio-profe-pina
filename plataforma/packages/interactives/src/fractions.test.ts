import { describe, expect, it } from 'vitest';
import { escribirFraccion, partesTomadas, simplificar } from './fractions';

describe('fracciones en barras', () => {
  it('toma partes en orden o una cantidad por barra', () => {
    expect(partesTomadas(1, 4, 3, false)).toEqual([[true, true, true, false]]);
    expect(partesTomadas(2, 2, 3, false)).toEqual([
      [true, true],
      [true, false],
    ]);
    expect(partesTomadas(3, 4, 1, true)).toEqual([
      [true, false, false, false],
      [true, false, false, false],
      [true, false, false, false],
    ]);
  });
  it('rechaza partes imposibles', () => {
    expect(() => partesTomadas(1, 4, 5, false)).toThrow('entre 0 y 4');
    expect(() => partesTomadas(3, 4, 5, true)).toThrow('entre 0 y 4');
    expect(() => partesTomadas(1, 0, 0, false)).toThrow('partes');
  });
  it('escribe y simplifica', () => {
    expect(escribirFraccion(6, 8)).toBe('6/8');
    expect(simplificar(18, 24)).toEqual([3, 4]);
    expect(simplificar(10, 15)).toEqual([2, 3]);
    expect(simplificar(0, 5)).toEqual([0, 1]);
  });
});
