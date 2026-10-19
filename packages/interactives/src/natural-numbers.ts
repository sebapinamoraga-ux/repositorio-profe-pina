/** Matemática de los números naturales: divisores, primos, factores, MCM y mcd. */

const requireNatural = (value: number, name: string) => {
  if (!Number.isInteger(value) || value < 1)
    throw new Error(`${name} debe ser un número natural: ${value}`);
};

/** Escribe un natural con punto de miles, como en Chile: 3.623. */
export const formatNatural = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 }).format(value);

/** Divisores de n en orden creciente. */
export function divisores(n: number): number[] {
  requireNatural(n, 'n');
  const found: number[] = [];
  for (let d = 1; d <= n; d++) if (n % d === 0) found.push(d);
  return found;
}

/** Un natural es primo si tiene exactamente dos divisores. */
export const esPrimo = (n: number) => Number.isInteger(n) && n >= 2 && divisores(n).length === 2;

/** Pares (a, b) con a ≤ b y a · b = n: los rectángulos de n cuadrados. */
export function paresDivisores(n: number): [number, number][] {
  return divisores(n)
    .filter((d) => d * d <= n)
    .map((d) => [d, n / d]);
}

/** Factores primos de n con repetición, de menor a mayor: 360 → 2, 2, 2, 3, 3, 5. */
export function factoresPrimos(n: number): number[] {
  requireNatural(n, 'n');
  const factores: number[] = [];
  let resto = n;
  for (let p = 2; resto > 1; p++)
    while (resto % p === 0) {
      factores.push(p);
      resto /= p;
    }
  return factores;
}

const SUPERINDICES = ['⁰', '¹', '²', '³', '⁴', '⁵', '⁶', '⁷', '⁸', '⁹'];
const superindice = (n: number) =>
  String(n)
    .split('')
    .map((d) => SUPERINDICES[Number(d)] ?? d)
    .join('');

/** Escritura con potencias: 360 → «2³ · 3² · 5». */
export function escrituraPrima(n: number): string {
  const cuenta = new Map<number, number>();
  for (const p of factoresPrimos(n)) cuenta.set(p, (cuenta.get(p) ?? 0) + 1);
  return [...cuenta]
    .map(([p, k]) => (k === 1 ? String(p) : `${p}${superindice(k)}`))
    .join(' · ');
}

/** Múltiplos de n hasta el tope, sin el cero. */
export function multiplosHasta(n: number, tope: number): number[] {
  requireNatural(n, 'n');
  return Array.from({ length: Math.floor(tope / n) }, (_, i) => n * (i + 1));
}

const mcd2 = (a: number, b: number): number => (b === 0 ? a : mcd2(b, a % b));

export function mcd(numeros: readonly number[]): number {
  if (!numeros.length) throw new Error('El mcd requiere al menos un número.');
  numeros.forEach((n) => requireNatural(n, 'Cada número'));
  return numeros.reduce((acc, n) => mcd2(acc, n));
}

export function mcm(numeros: readonly number[]): number {
  if (!numeros.length) throw new Error('El MCM requiere al menos un número.');
  numeros.forEach((n) => requireNatural(n, 'Cada número'));
  return numeros.reduce((acc, n) => (acc * n) / mcd2(acc, n));
}

/** Algoritmo de la división: D = d · q + r con 0 ≤ r < d. */
export function dividir(dividendo: number, divisor: number): { cociente: number; resto: number } {
  if (!Number.isInteger(dividendo) || dividendo < 0)
    throw new Error(`El dividendo debe ser un cardinal: ${dividendo}`);
  requireNatural(divisor, 'El divisor');
  return { cociente: Math.floor(dividendo / divisor), resto: dividendo % divisor };
}

/** Cifras de n por posición, de la mayor a las unidades: 3623 → [3, 6, 2, 3]. */
export function cifras(n: number): number[] {
  requireNatural(n, 'n');
  return String(n).split('').map(Number);
}

/** Una etapa de corte: el largo del trozo y el paso en que se prueba. */
export interface EtapaCorte {
  trozo: number;
  paso: number;
}

/**
 * Trozo con que se cortan las barras en un paso: la última etapa alcanzada, o ninguno si
 * todavía no empieza. Al imprimir, el de la última etapa. Los pasos deben crecer.
 */
export function trozoVigente(
  etapas: readonly EtapaCorte[],
  paso: number,
  imprimir: boolean,
): number | undefined {
  etapas.forEach((etapa, k) => {
    requireNatural(etapa.trozo, 'Cada trozo');
    const anterior = etapas[k - 1];
    if (anterior && etapa.paso <= anterior.paso)
      throw new Error('Los pasos de los intentos y del trozo final deben crecer.');
  });
  if (imprimir) return etapas.at(-1)?.trozo;
  return etapas.filter((etapa) => etapa.paso <= paso).at(-1)?.trozo;
}

/** Números tachados por la criba: los múltiplos de cada primo indicado, sin el primo. */
export function tachadosPorCriba(max: number, primos: readonly number[]): Set<number> {
  const tachados = new Set<number>();
  for (const p of primos) {
    if (!esPrimo(p)) throw new Error(`La criba tacha múltiplos de primos: ${p} no es primo.`);
    for (let m = 2 * p; m <= max; m += p) tachados.add(m);
  }
  return tachados;
}
