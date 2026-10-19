/** Intervalo real en notación escolar chilena: ]a; b[ abierto, [a; b] cerrado. */
export interface Intervalo {
  desde: number;
  hasta: number;
  cerradoDesde: boolean;
  cerradoHasta: boolean;
}

function leerExtremo(texto: string): number {
  const limpio = texto.trim().replace('−', '-');
  if (limpio === '+∞' || limpio === '∞') return Number.POSITIVE_INFINITY;
  if (limpio === '-∞') return Number.NEGATIVE_INFINITY;
  if (!/^-?\d+(\.\d{3})*(,\d+)?$/.test(limpio))
    throw new Error(`Extremo de intervalo no válido: ${texto}`);
  return Number(limpio.replaceAll('.', '').replace(',', '.'));
}

/**
 * Lee «[0; 7,5[», «]7,5; +∞[» o «]−∞; 3]». Separa los extremos con punto y coma
 * para no confundirlos con la coma decimal.
 */
export function parsearIntervalo(texto: string): Intervalo {
  const match = /^\s*([[\]])([^;]+);([^;]+)([[\]])\s*$/.exec(texto);
  if (!match) throw new Error(`Intervalo no válido: ${texto}`);
  const [, abre = '', izquierdo = '', derecho = '', cierra = ''] = match;
  const intervalo: Intervalo = {
    desde: leerExtremo(izquierdo),
    hasta: leerExtremo(derecho),
    cerradoDesde: abre === '[',
    cerradoHasta: cierra === ']',
  };
  if (!(intervalo.desde < intervalo.hasta))
    throw new Error(`El intervalo requiere extremo izquierdo menor: ${texto}`);
  if (
    (!Number.isFinite(intervalo.desde) && intervalo.cerradoDesde) ||
    (!Number.isFinite(intervalo.hasta) && intervalo.cerradoHasta)
  )
    throw new Error(`Un extremo infinito siempre es abierto: ${texto}`);
  return intervalo;
}

/** Indica si x pertenece al intervalo. */
export function perteneceIntervalo(intervalo: Intervalo, x: number): boolean {
  const sobreDesde = intervalo.cerradoDesde
    ? x >= intervalo.desde
    : x > intervalo.desde;
  const bajoHasta = intervalo.cerradoHasta
    ? x <= intervalo.hasta
    : x < intervalo.hasta;
  return sobreDesde && bajoHasta;
}
