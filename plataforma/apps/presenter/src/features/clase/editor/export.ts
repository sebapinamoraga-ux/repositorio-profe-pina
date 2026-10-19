import type { LessonEntry } from '@aula/content-model/content-files';

export interface LessonExport {
  folder: string;
  files: { path: string; text: string }[];
}

/**
 * Copia de respaldo de una clase (clase.yaml, guia.md, laminas/*.mdx y sus actividades), tal como está en la app,
 * con la estructura de su carpeta en contenido/. Guardar en el repositorio no depende de esto.
 */
export function buildExport(
  files: ReadonlyMap<string, string>,
  lesson: LessonEntry,
): LessonExport {
  const folder = lesson.meta.id;
  return {
    folder,
    files: [...files]
      .filter(([path]) => path.startsWith(`${lesson.dir}/`))
      .map(([path, text]) => ({
        path: `${folder}/${path.slice(lesson.dir.length + 1)}`,
        text,
      })),
  };
}
