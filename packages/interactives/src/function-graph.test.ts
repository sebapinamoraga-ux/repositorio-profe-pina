import { describe, expect, it } from 'vitest';
import {
  cortesVerticales,
  expresionCuadratica,
  fallaRectaVertical,
  marcasEje,
  muestrearCurva,
  valorFuncion,
  validarCurva,
  validarVentana,
  type Curva,
} from './function-graph';

const ventana = { xMin: -4, xMax: 4, yMin: -3, yMax: 5 };

describe('gráfico de funciones', () => {
  it('valoriza funciones afines y cuadráticas', () => {
    expect(valorFuncion({ tipo: 'afin', m: 2, n: 1 }, 3)).toBe(7);
    expect(valorFuncion({ tipo: 'cuadratica', a: 1, b: 0, c: 1 }, -3)).toBe(10);
    expect(valorFuncion({ tipo: 'circunferencia', h: 0, k: 0, r: 2 }, 0)).toBe(
      null,
    );
  });

  it('una recta vertical corta una vez a una función y dos a la circunferencia', () => {
    const parabola: Curva = { tipo: 'cuadratica', a: 1, b: 0, c: -2 };
    const circle: Curva = { tipo: 'circunferencia', h: 0, k: 1, r: 3 };
    expect(cortesVerticales(parabola, 1)).toEqual([-1]);
    expect(cortesVerticales(circle, 0)).toEqual([-2, 4]);
    expect(cortesVerticales(circle, 3)).toEqual([1]);
    expect(cortesVerticales(circle, 3.5)).toEqual([]);
    expect(fallaRectaVertical(parabola, 1, ventana)).toBe(false);
    expect(fallaRectaVertical(circle, 0, ventana)).toBe(true);
  });

  it('muestrea de forma determinista dentro de la ventana', () => {
    const points = muestrearCurva({ tipo: 'afin', m: 2, n: 1 }, ventana, 8);
    expect(points).toHaveLength(9);
    expect(points[0]).toEqual({ x: -4, y: -7 });
    expect(points[8]).toEqual({ x: 4, y: 9 });
    const circle = muestrearCurva(
      { tipo: 'circunferencia', h: 0, k: 0, r: 2 },
      ventana,
      4,
    );
    expect(circle[0]).toEqual({ x: 2, y: 0 });
    expect(circle[2]?.x).toBeCloseTo(-2);
  });

  it('genera marcas de la grilla que incluyen el cero', () => {
    expect(marcasEje(-3, 5, 1)).toEqual([-3, -2, -1, 0, 1, 2, 3, 4, 5]);
    expect(marcasEje(0.5, 4, 2)).toEqual([2, 4]);
    expect(() => marcasEje(0, 4, 0)).toThrow();
  });

  it('rechaza parámetros inválidos', () => {
    expect(() =>
      validarVentana({ xMin: 2, xMax: 2, yMin: 0, yMax: 1 }),
    ).toThrow();
    expect(() =>
      validarCurva({ tipo: 'cuadratica', a: 0, b: 1, c: 0 }),
    ).toThrow();
    expect(() =>
      validarCurva({ tipo: 'circunferencia', h: 0, k: 0, r: 0 }),
    ).toThrow();
    expect(() => validarCurva({ tipo: 'afin', m: Number.NaN, n: 0 })).toThrow();
  });
});

describe('expresionCuadratica', () => {
  it('omite términos nulos y coeficientes 1', () => {
    expect(expresionCuadratica(1, 0, 0)).toBe('x²');
    expect(expresionCuadratica(-1, 0, 3)).toBe('−x² + 3');
    expect(expresionCuadratica(0.5, -2, -1)).toBe('0,5x² − 2x − 1');
  });
  it('con a = 0 escribe la recta y con todo nulo escribe 0', () => {
    expect(expresionCuadratica(0, 1, 2)).toBe('x + 2');
    expect(expresionCuadratica(0, 0, 0)).toBe('0');
  });
});
