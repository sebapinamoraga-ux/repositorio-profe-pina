/** Relaciones entre dos conjuntos finitos declaradas por el contenido como «a → b». */
export interface Flecha {
  desde: string;
  hasta: string;
}

/** Lee «3 → 9» o «3 -> 9» y exige que ambos extremos existan en sus conjuntos. */
export function parsearFlechas(
  flechas: string[],
  entradas: string[],
  salidas: string[],
): Flecha[] {
  return flechas.map((texto) => {
    const partes = texto.split(/→|->/);
    if (partes.length !== 2)
      throw new Error(`Flecha no válida (usa «a → b»): ${texto}`);
    const desde = (partes[0] ?? '').trim();
    const hasta = (partes[1] ?? '').trim();
    if (!entradas.includes(desde))
      throw new Error(`La flecha parte de un elemento desconocido: ${desde}`);
    if (!salidas.includes(hasta))
      throw new Error(`La flecha llega a un elemento desconocido: ${hasta}`);
    return { desde, hasta };
  });
}

/** Entradas que no tienen exactamente una imagen: las que impiden que la relación sea función. */
export function entradasInvalidas(
  entradas: string[],
  flechas: Flecha[],
): string[] {
  return entradas.filter(
    (entrada) => flechas.filter((f) => f.desde === entrada).length !== 1,
  );
}

/** Salidas alcanzadas por alguna flecha: el recorrido de la relación. */
export function salidasAlcanzadas(
  salidas: string[],
  flechas: Flecha[],
): string[] {
  return salidas.filter((salida) => flechas.some((f) => f.hasta === salida));
}
