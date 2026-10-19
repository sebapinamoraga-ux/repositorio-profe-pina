import {
  CONTENT_ROOT,
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
  // Cambios hechos antes de la mudanza a contenido/: sus rutas ya no existen.
  const legacy = [...changed]
    .filter((path) => !path.startsWith(`${CONTENT_ROOT}/`))
    .map((path) => ({
      path,
      message:
        'Este cambio usa la organización anterior del contenido, que ya no existe. Descártalo y vuelve a hacerlo.',
    }));
  return [...legacy, ...result.problems];
}

/** Nombre legible de una ruta del repositorio para los mensajes. */
export function describePath(path: string): string {
  const lesson = /\/clases\/([^/]+)\/(clase\.yaml|guia\.md|laminas\/([^/]+)\.mdx)$/.exec(path);
  if (lesson?.[3]) return `Lámina ${lesson[3]} (${lesson[1]})`;
  if (lesson?.[2] === 'guia.md') return `Guía de la clase ${lesson[1]}`;
  if (lesson?.[1]) return `Datos de la clase ${lesson[1]}`;
  const activity = /\/actividades\/([^/]+)\.yaml$/.exec(path);
  if (activity?.[1]) return `Actividad ${activity[1]}`;
  if (path.endsWith('/curso.yaml')) return 'Planificación de unidades';
  return path;
}
