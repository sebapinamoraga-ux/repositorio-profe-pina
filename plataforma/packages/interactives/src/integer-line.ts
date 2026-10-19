/** Matemática de la recta de los enteros: desplazamientos, opuestos y escritura con signos. */

const requireInteger = (value: number, name: string) => {
  if (!Number.isInteger(value)) throw new Error(`${name} debe ser un número entero: ${value}`);
};

/** Escribe un entero con el signo menos tipográfico (−3), nunca «-0». */
export function formatEntero(value: number): string {
  requireInteger(value, 'El valor');
  return value < 0 ? `−${Math.abs(value)}` : String(Math.abs(value));
}

/** Un entero negativo va entre paréntesis cuando sigue a un signo de operación: 5 + (−8). */
export const operando = (value: number) =>
  value < 0 ? `(${formatEntero(value)})` : formatEntero(value);

/** Posiciones que recorre la flecha: la inicial y la que deja cada salto. */
export function recorrido(desde: number, saltos: readonly number[]): number[] {
  requireInteger(desde, 'El punto de partida');
  const posiciones = [desde];
  for (const salto of saltos) {
    requireInteger(salto, 'Cada salto');
    posiciones.push((posiciones.at(-1) ?? desde) + salto);
  }
  return posiciones;
}

/** Las dos lecturas de la misma resta: a − b y a + (−b), con su resultado común. */
export function lecturasResta(a: number, b: number): { resta: string; suma: string; resultado: number } {
  requireInteger(a, 'a');
  requireInteger(b, 'b');
  const resultado = a + -b;
  const fin = ` = ${formatEntero(resultado)}`;
  return {
    resta: `${formatEntero(a)} − ${operando(b)}${fin}`,
    suma: `${formatEntero(a)} + ${operando(-b)}${fin}`,
    resultado,
  };
}

/** Marcas de la recta a rotular: todas si caben, cada 2 en rectas medianas y cada 5 en las largas. */
export function rotulosRecta(min: number, max: number): number[] {
  requireInteger(min, 'El mínimo');
  requireInteger(max, 'El máximo');
  if (!(min < max)) throw new Error('La recta requiere min < max.');
  if (max - min > 60) throw new Error('La recta tiene demasiadas marcas.');
  const largo = max - min;
  const cada = largo > 30 ? 5 : largo > 16 ? 2 : 1;
  return Array.from({ length: max - min + 1 }, (_, i) => min + i).filter(
    (value) => value % cada === 0,
  );
}
