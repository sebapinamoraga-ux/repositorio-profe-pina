import { describe, expect, it } from 'vitest';
import { parsearIntervalo, perteneceIntervalo } from './interval';
import { interseccionAfines, tramosMenor } from './function-graph';

describe('intervalos', () => {
  it('lee extremos abiertos, cerrados, infinitos y decimales con coma', () => {
    expect(parsearIntervalo('[0; 7,5[')).toEqual({
      desde: 0,
      hasta: 7.5,
      cerradoDesde: true,
      cerradoHasta: false,
    });
    expect(parsearIntervalo(']7,5; +∞[')).toEqual({
      desde: 7.5,
      hasta: Number.POSITIVE_INFINITY,
      cerradoDesde: false,
      cerradoHasta: false,
    });
    expect(parsearIntervalo(']−∞; 3]').desde).toBe(Number.NEGATIVE_INFINITY);
    expect(parsearIntervalo('[1.500; 3.750]').hasta).toBe(3750);
  });

  it('rechaza intervalos mal escritos', () => {
    expect(() => parsearIntervalo('[3; 1]')).toThrow();
    expect(() => parsearIntervalo('[0; +∞]')).toThrow('infinito');
    expect(() => parsearIntervalo('0; 2')).toThrow();
    expect(() => parsearIntervalo('[a; 2]')).toThrow();
  });

  it('decide la pertenencia según el tipo de extremo', () => {
    const libre = parsearIntervalo('[0; 7,5[');
    expect(perteneceIntervalo(libre, 0)).toBe(true);
    expect(perteneceIntervalo(libre, 7.5)).toBe(false);
    expect(perteneceIntervalo(parsearIntervalo(']7,5; +∞['), 10)).toBe(true);
  });
});

describe('comparación de funciones afines', () => {
  const libre = { m: 500, n: 0 };
  const base = { m: 300, n: 1500 };

  it('encuentra la intersección resolviendo el sistema', () => {
    expect(interseccionAfines(libre, base)).toEqual({ x: 7.5, y: 3750 });
    expect(interseccionAfines({ m: 2, n: 1 }, { m: 2, n: 3 })).toBeNull();
  });

  it('identifica qué función es menor antes y después del corte', () => {
    expect(tramosMenor(libre, base, 0, 12)).toEqual([
      { desde: 0, hasta: 7.5, menor: 1 },
      { desde: 7.5, hasta: 12, menor: 2 },
    ]);
    expect(tramosMenor({ m: 2, n: 1 }, { m: 2, n: 3 }, 0, 5)).toEqual([
      { desde: 0, hasta: 5, menor: 1 },
    ]);
  });
});
