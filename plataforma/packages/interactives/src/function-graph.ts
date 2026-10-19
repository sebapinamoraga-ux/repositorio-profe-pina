import { solveLinearSystem } from './linear-system';

/** Curvas declaradas por el contenido; el motor no conoce ejemplos específicos. */
export type Curva =
  | { tipo: 'afin'; m: number; n: number }
  | { tipo: 'cuadratica'; a: number; b: number; c: number }
  | { tipo: 'circunferencia'; h: number; k: number; r: number };

export interface Ventana {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface PuntoGrafico {
  x: number;
  y: number;
}

/** Rechaza ventanas vacías o no finitas antes de dibujar. */
export function validarVentana(ventana: Ventana): void {
  const values = [ventana.xMin, ventana.xMax, ventana.yMin, ventana.yMax];
  if (!values.every(Number.isFinite))
    throw new Error('La ventana del gráfico debe tener límites finitos.');
  if (ventana.xMin >= ventana.xMax || ventana.yMin >= ventana.yMax)
    throw new Error(
      'La ventana del gráfico requiere xMin < xMax e yMin < yMax.',
    );
}

export function validarCurva(curva: Curva): void {
  const values =
    curva.tipo === 'afin'
      ? [curva.m, curva.n]
      : curva.tipo === 'cuadratica'
        ? [curva.a, curva.b, curva.c]
        : [curva.h, curva.k, curva.r];
  if (!values.every(Number.isFinite))
    throw new Error('Los coeficientes de la curva deben ser finitos.');
  if (curva.tipo === 'cuadratica' && curva.a === 0)
    throw new Error('Una función cuadrática requiere a ≠ 0.');
  if (curva.tipo === 'circunferencia' && curva.r <= 0)
    throw new Error('El radio de la circunferencia debe ser positivo.');
}

type CurvaFuncion = Exclude<Curva, { tipo: 'circunferencia' }>;

function evaluar(curva: CurvaFuncion, x: number): number {
  return curva.tipo === 'afin'
    ? curva.m * x + curva.n
    : curva.a * x * x + curva.b * x + curva.c;
}

/** Valor de una curva que es función; null para la circunferencia. */
export function valorFuncion(curva: Curva, x: number): number | null {
  return curva.tipo === 'circunferencia' ? null : evaluar(curva, x);
}

/** Ordenadas en que la recta vertical x = valor corta la curva, de menor a mayor. */
export function cortesVerticales(curva: Curva, x: number): number[] {
  if (curva.tipo !== 'circunferencia') return [evaluar(curva, x)];
  const { h, k, r } = curva;
  const squared = r * r - (x - h) * (x - h);
  if (squared < -1e-10) return [];
  if (Math.abs(squared) <= 1e-10) return [k];
  const offset = Math.sqrt(squared);
  return [k - offset, k + offset];
}

/** Muestreo determinista de la curva; el recorte visual lo hace el SVG. */
export function muestrearCurva(
  curva: Curva,
  ventana: Ventana,
  muestras = 240,
): PuntoGrafico[] {
  validarCurva(curva);
  validarVentana(ventana);
  if (curva.tipo === 'circunferencia')
    return Array.from({ length: muestras + 1 }, (_, i) => {
      const angle = (2 * Math.PI * i) / muestras;
      return {
        x: curva.h + curva.r * Math.cos(angle),
        y: curva.k + curva.r * Math.sin(angle),
      };
    });
  const step = (ventana.xMax - ventana.xMin) / muestras;
  return Array.from({ length: muestras + 1 }, (_, i) => {
    const x = ventana.xMin + i * step;
    return { x, y: evaluar(curva, x) };
  });
}

/** Marcas enteras múltiplos de paso dentro del intervalo, incluido el cero si corresponde. */
export function marcasEje(min: number, max: number, paso: number): number[] {
  if (!(paso > 0) || !Number.isFinite(paso))
    throw new Error('El paso de la grilla debe ser positivo.');
  const first = Math.ceil(min / paso - 1e-9);
  const last = Math.floor(max / paso + 1e-9);
  if (last - first > 60) throw new Error('La grilla tiene demasiadas marcas.');
  return Array.from({ length: last - first + 1 }, (_, i) =>
    Number(((first + i) * paso).toFixed(10)),
  );
}

/** Indica si una recta vertical corta la curva en más de un punto dentro de la ventana. */
export function fallaRectaVertical(
  curva: Curva,
  x: number,
  ventana: Ventana,
): boolean {
  return (
    cortesVerticales(curva, x).filter(
      (y) => y >= ventana.yMin - 1e-9 && y <= ventana.yMax + 1e-9,
    ).length > 1
  );
}

export interface FuncionAfin {
  m: number;
  n: number;
}

/** Punto común de dos funciones afines; resuelve el sistema y = m1x + n1, y = m2x + n2. */
export function interseccionAfines(
  primera: FuncionAfin,
  segunda: FuncionAfin,
): PuntoGrafico | null {
  return solveLinearSystem(
    { a: primera.m, b: -1, c: -primera.n },
    { a: segunda.m, b: -1, c: -segunda.n },
  );
}

export interface TramoMenor {
  desde: number;
  hasta: number;
  /** 1 si la primera función es menor en el tramo, 2 si lo es la segunda. */
  menor: 1 | 2;
}

/** Tramos de [xMin, xMax] en que cada función toma el menor valor. */
export function tramosMenor(
  primera: FuncionAfin,
  segunda: FuncionAfin,
  xMin: number,
  xMax: number,
): TramoMenor[] {
  const corte = interseccionAfines(primera, segunda);
  const menorEn = (x: number): 1 | 2 =>
    primera.m * x + primera.n <= segunda.m * x + segunda.n ? 1 : 2;
  if (!corte || corte.x <= xMin || corte.x >= xMax) {
    const medio = (xMin + xMax) / 2;
    return [{ desde: xMin, hasta: xMax, menor: menorEn(medio) }];
  }
  return [
    { desde: xMin, hasta: corte.x, menor: menorEn((xMin + corte.x) / 2) },
    { desde: corte.x, hasta: xMax, menor: menorEn((corte.x + xMax) / 2) },
  ];
}

const formatoCoeficiente = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value);

/** Escribe ax² + bx + c omitiendo términos nulos y coeficientes 1; con a = 0 queda la recta bx + c. */
export function expresionCuadratica(a: number, b: number, c: number): string {
  const terminos = [
    { coef: a, parte: 'x²' },
    { coef: b, parte: 'x' },
    { coef: c, parte: '' },
  ].filter((termino) => termino.coef !== 0);
  if (terminos.length === 0) return '0';
  return terminos
    .map(({ coef, parte }, index) => {
      const absoluto = Math.abs(coef);
      const numero =
        absoluto === 1 && parte !== '' ? '' : formatoCoeficiente(absoluto);
      const signo =
        index === 0 ? (coef < 0 ? '−' : '') : coef < 0 ? ' − ' : ' + ';
      return `${signo}${numero}${parte}`;
    })
    .join('');
}

/** Vértice de y = ax² + bx + c (a ≠ 0): x = −b/(2a) e y = f(x). */
export function verticeCuadratica(
  a: number,
  b: number,
  c: number,
): PuntoGrafico {
  if (a === 0) throw new Error('Sin término cuadrático no hay vértice.');
  // Sumar 0 convierte −0 en 0, para no escribir «(−0; 0)».
  const x = -b / (2 * a) + 0;
  return { x, y: a * x * x + b * x + c + 0 };
}
