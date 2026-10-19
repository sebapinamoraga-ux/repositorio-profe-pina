import { buildFiles, compiledSlides } from 'virtual:aula-catalog';
import { parseContentFiles } from '@aula/content-model/content-files';
import type { CompiledContent } from '../store/deck';

/** Contenido empaquetado con el sitio: en producción, solo clases publicadas. */
export const BUILD_FILES: ReadonlyMap<string, string> = new Map(
  Object.entries(buildFiles),
);
export const buildBundle = parseContentFiles(BUILD_FILES);

/** La lámina precompilada sirve mientras su texto sea idéntico al del build. */
export function compiledFor(path: string, text: string): CompiledContent | undefined {
  return buildFiles[path] === text ? compiledSlides[path] : undefined;
}
