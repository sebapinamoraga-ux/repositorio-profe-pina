import { describe, expect, it } from 'vitest';
import {
  entradasInvalidas,
  parsearFlechas,
  salidasAlcanzadas,
} from './sagittal';

describe('diagrama sagital', () => {
  const entradas = ['1', '2', '3'];
  const salidas = ['500', '1.000', '1.500', '2.000'];

  it('lee flechas con ambas notaciones', () => {
    expect(parsearFlechas(['1 → 500', '2->1.000'], entradas, salidas)).toEqual([
      { desde: '1', hasta: '500' },
      { desde: '2', hasta: '1.000' },
    ]);
  });

  it('rechaza flechas mal escritas o con elementos desconocidos', () => {
    expect(() => parsearFlechas(['1 500'], entradas, salidas)).toThrow();
    expect(() => parsearFlechas(['4 → 500'], entradas, salidas)).toThrow(
      'desconocido',
    );
    expect(() => parsearFlechas(['1 → 9'], entradas, salidas)).toThrow(
      'desconocido',
    );
  });

  it('detecta entradas sin imagen o con dos imágenes', () => {
    const funcion = parsearFlechas(
      ['1 → 500', '2 → 1.000', '3 → 1.500'],
      entradas,
      salidas,
    );
    expect(entradasInvalidas(entradas, funcion)).toEqual([]);
    const relacion = parsearFlechas(
      ['1 → 500', '1 → 1.000', '2 → 1.500'],
      entradas,
      salidas,
    );
    expect(entradasInvalidas(entradas, relacion)).toEqual(['1', '3']);
  });

  it('identifica el recorrido como las salidas alcanzadas', () => {
    const funcion = parsearFlechas(
      ['1 → 500', '2 → 1.000', '3 → 1.500'],
      entradas,
      salidas,
    );
    expect(salidasAlcanzadas(salidas, funcion)).toEqual([
      '500',
      '1.000',
      '1.500',
    ]);
  });
});
