import {
  GALLERY_PATH,
  type ContentProblem,
} from '@aula/content-model/content-files';
import type { Snapshot } from '@aula/content-repo';

/**
 * Las reglas de content:check sobre el contenido que se va a guardar. Solo compila las
 * láminas que cambiaron: el resto ya pasó la verificación del repositorio.
 */
export async function validateForSave(
  files: ReadonlyMap<string, string>,
  snapshot: Snapshot,
  changed: ReadonlySet<string>,
): Promise<ContentProblem[]> {
  const { checkContentFiles } = await import('@aula/content-model/check-content');
  const result = await checkContentFiles(files, {
    trackedPaths: new Set(snapshot.paths),
    shouldCompile: (path) =>
      changed.has(path) ||
      (path.startsWith(`${GALLERY_PATH}#`) && changed.has(GALLERY_PATH)),
  });
  return result.problems;
}

/** Nombre legible de una ruta del repositorio para los mensajes. */
export function describePath(path: string): string {
  const lesson = /^content\/lessons\/.+?\/([^/]+)\/(lesson\.yaml|slides\/([^/]+)\.mdx)$/.exec(path);
  if (lesson?.[3]) return `Lámina ${lesson[3]} (${lesson[1]})`;
  if (lesson?.[1]) return `Datos de la clase ${lesson[1]}`;
  const activity = /^content\/activities\/([^/]+)\.yaml$/.exec(path);
  if (activity?.[1]) return `Actividad ${activity[1]}`;
  if (path.startsWith('content/planning/')) return 'Planificación de unidades';
  return path;
}
