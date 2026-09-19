export type Equation = readonly [number, number, number];
export function solveSystem(a: Equation, b: Equation) {
  const determinant = a[0] * b[1] - b[0] * a[1];
  if (!Number.isFinite(determinant)) throw new Error('Coeficientes no finitos');
  if (Math.abs(determinant) < 1e-10) return null;
  return {
    x: (a[2] * b[1] - b[2] * a[1]) / determinant,
    y: (a[0] * b[2] - b[0] * a[2]) / determinant,
  };
}
export function satisfies(e: Equation, x: number, y: number) {
  return Math.abs(e[0] * x + e[1] * y - e[2]) < 1e-9;
}
