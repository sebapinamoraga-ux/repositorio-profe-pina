export interface LinearEquation {
  a: number;
  b: number;
  c: number;
}

export interface Point {
  x: number;
  y: number;
}

/** Solución única de ax + by = c para dos ecuaciones; null si son paralelas, coincidentes o no finitas. */
export function solveLinearSystem(
  first: LinearEquation,
  second: LinearEquation,
): Point | null {
  const determinant = first.a * second.b - second.a * first.b;
  if (!Number.isFinite(determinant) || Math.abs(determinant) <= 1e-10)
    return null;
  return {
    x: (first.c * second.b - second.c * first.b) / determinant,
    y: (first.a * second.c - second.a * first.c) / determinant,
  };
}

/** Indica si el punto cumple la ecuación (tolerancia 1e-9 por redondeo). */
export function satisfiesLinearEquation(
  equation: LinearEquation,
  point: Point,
): boolean {
  return (
    Math.abs(equation.a * point.x + equation.b * point.y - equation.c) < 1e-9
  );
}

export function yOnLine(equation: LinearEquation, x: number): number | null {
  if (Math.abs(equation.b) <= 1e-10) return null;
  return (equation.c - equation.a * x) / equation.b;
}
