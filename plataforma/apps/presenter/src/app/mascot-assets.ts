import { mascotFiles } from 'virtual:aula-mascots';

/** Solo las poses que la galería o alguna diapositiva usan; content-plugin las descubre en el contenido. */
export const bundledMascotPoses: readonly number[] = Object.keys(mascotFiles)
  .map(Number)
  .sort((a, b) => a - b);

export function mascotUrl(pose: number): string {
  const url = mascotFiles[pose];
  if (!url) throw new Error(`No hay recurso cargado para la pose ${pose}.`);
  return url;
}
