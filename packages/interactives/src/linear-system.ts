export interface LinearEquation {
  a: number;
  b: number;
  c: number;
}

export interface Point {
  x: number;
  y: number;
}

export function solveLinearSystem(
  first: LinearEquation,
  second: LinearEquation,
): Point | null {
  const determinant = first.a * second.b - second.a * first.b;
  if (Math.abs(determinant) <= 1e-10) return null;
  return {
    x: (first.c * second.b - second.c * first.b) / determinant,
    y: (first.a * second.c - second.a * first.c) / determinant,
  };
}

export function yOnLine(equation: LinearEquation, x: number): number | null {
  if (Math.abs(equation.b) <= 1e-10) return null;
  return (equation.c - equation.a * x) / equation.b;
}
