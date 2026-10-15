/** Fracciones como partes de barras iguales: qué partes se toman y cómo se escriben. */
import { mcd } from './natural-numbers';

const requireNatural = (value: number, name: string, max: number) => {
  if (!Number.isInteger(value) || value < 1 || value > max)
    throw new Error(`${name} debe ser un natural entre 1 y ${max}: ${value}`);
};

/**
 * Partes tomadas de cada barra ([barra][parte]). Con `porBarra`, se toman `tomadas` partes de
 * cada barra (un reparto); si no, se toman en orden, llenando una barra antes de la siguiente.
 */
export function partesTomadas(
  barras: number,
  partes: number,
  tomadas: number,
  porBarra: boolean,
): boolean[][] {
  requireNatural(barras, 'El número de barras', 6);
  requireNatural(partes, 'El número de partes', 24);
  const tope = porBarra ? partes : barras * partes;
  if (!Number.isInteger(tomadas) || tomadas < 0 || tomadas > tope)
    throw new Error(`Las partes tomadas deben estar entre 0 y ${tope}: ${tomadas}`);
  return Array.from({ length: barras }, (_, b) =>
    Array.from({ length: partes }, (_, k) =>
      porBarra ? k < tomadas : b * partes + k < tomadas,
    ),
  );
}

/** Escritura a/b de una fracción, sin simplificar: 6/8. */
export const escribirFraccion = (a: number, b: number) => `${a}/${b}`;

/** Fracción irreducible: divide numerador y denominador por su mcd. */
export function simplificar(a: number, b: number): [number, number] {
  if (a === 0) return [0, 1];
  const g = mcd([a, b]);
  return [a / g, b / g];
}
