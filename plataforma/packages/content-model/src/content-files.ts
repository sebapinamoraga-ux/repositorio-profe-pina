import { parse } from 'yaml';
import { z, type ZodError, type ZodType, type ZodTypeDef } from 'zod';
import {
  activitySchema,
  curriculumSchema,
  lessonSchema,
  mascotGallerySchema,
  planningSchema,
  type Activity,
  type Curriculum,
  type Lesson,
  type MascotGallery,
  type Planning,
  type Slide,
  slideSchema,
} from './index.ts';
import { parseFrontmatter, splitSource } from './frontmatter.ts';

/**
 * Contenido como mapa ruta → texto, con rutas relativas a la raíz del repositorio
 * (`contenido/cursos/…/clases/<id>/clase.yaml`) y saltos de línea LF. Es la misma forma en disco,
 * en el build y en la API de GitHub, así que las tres fuentes se leen igual.
 */
export type ContentFiles = ReadonlyMap<string, string>;

export interface ContentProblem {
  path: string;
  message: string;
}

export interface SlideFile {
  /** Nombre en clase.yaml (`apertura.mdx`). */
  file: string;
  path: string;
  text: string;
  slide: Slide;
  body: string;
}

export interface LessonEntry {
  meta: Lesson;
  /** Carpeta de la clase (`contenido/cursos/competencia-matematica-3m/clases/sistemas-2x2`). */
  dir: string;
  /** Biblioteca de la carpeta en que vive la clase; null si no está dentro de un curso. */
  home: string | null;
  /** Guía pedagógica (`guia.md`), si existe. */
  guide: { path: string; text: string } | null;
  path: string;
  text: string;
  /** Solo las láminas que se pudieron leer; las demás quedan en `problems`. */
  slides: SlideFile[];
  /** Láminas de `repaso`, con la misma lectura que las de la clase. */
  repaso: SlideFile[];
}

/** Una biblioteca: `curso.yaml` en su carpeta; el identificador es `id` o el nombre de la carpeta. */
export interface PlanningFile {
  id: string;
  path: string;
  /** Carpeta del curso: sus clases viven en `<dir>/clases/<id>`. */
  dir: string;
  planning: Planning;
}

export interface ContentBundle {
  lessons: LessonEntry[];
  activities: Record<string, Activity>;
  activityPaths: Record<string, string>;
  curriculum: (Curriculum & { path: string })[];
  /** Bibliotecas: un `curso.yaml` cada una, en orden de ruta. */
  plannings: PlanningFile[];
  gallery: MascotGallery | null;
  problems: ContentProblem[];
}

/** Carpeta del contenido, en la raíz del repositorio. */
export const CONTENT_ROOT = 'contenido';
export const SHARED_DIR = `${CONTENT_ROOT}/comun`;
export const GALLERY_PATH = `${SHARED_DIR}/galeria/plantillas-mascota.json`;
export const CURRICULUM_DIR = `${SHARED_DIR}/curriculo`;
/** Banco de actividades compartido; las de una sola clase viven en su carpeta. */
export const SHARED_ACTIVITIES_DIR = `${SHARED_DIR}/actividades`;
/** Carpeta de los cursos nuevos. */
export const COURSES_DIR = `${CONTENT_ROOT}/cursos`;
/** Clases que no están dentro de ningún curso. */
export const UNASSIGNED_DIR = `${CONTENT_ROOT}/sin-curso`;
export const PLANNING_FILE = 'curso.yaml';
export const LESSON_FILE = 'clase.yaml';
export const GUIDE_FILE = 'guia.md';
export const SLIDES_DIR = 'laminas';
const PLANNING_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const inContent = (path: string) => path.startsWith(`${CONTENT_ROOT}/`);
const dirOf = (path: string) => path.slice(0, path.lastIndexOf('/'));
const nameOf = (path: string) => path.slice(path.lastIndexOf('/') + 1);
export const isPlanningPath = (path: string) =>
  inContent(path) && path.endsWith(`/${PLANNING_FILE}`);
/** `contenido/…/clases/<id>/clase.yaml`. */
export const isLessonPath = (path: string) =>
  inContent(path) && /\/clases\/[^/]+\/clase\.yaml$/.test(path);
/** `contenido/…/actividades/<id>.yaml`. */
export const isActivityPath = (path: string) =>
  inContent(path) && /\/actividades\/[^/]+\.yaml$/.test(path);
/** `contenido/…/clases/<id>/guia.md`. */
export const isGuidePath = (path: string) =>
  inContent(path) && /\/clases\/[^/]+\/guia\.md$/.test(path);
const isCurriculumPath = (path: string) =>
  path.startsWith(`${CURRICULUM_DIR}/`) && path.endsWith('.yaml');

/** Identificador de una biblioteca: `id` en curso.yaml o, si falta, el nombre de su carpeta. */
export const planningId = (path: string, planning?: { id?: string | undefined }) =>
  planning?.id ?? nameOf(dirOf(path));
/** Carpeta de un curso nuevo con ese identificador. */
export const courseDir = (id: string) => `${COURSES_DIR}/${id}`;
/** Carpeta de una clase dentro de la carpeta de su curso (o fuera de todo curso). */
export const lessonDirIn = (libraryDir: string | null, lessonId: string) =>
  `${libraryDir ?? UNASSIGNED_DIR}/clases/${lessonId}`;
/** Ruta de una actividad nueva: en la carpeta de su clase o en el banco compartido. */
export const activityPathIn = (lessonDir: string | null, activityId: string) =>
  `${lessonDir ? `${lessonDir}/actividades` : SHARED_ACTIVITIES_DIR}/${activityId}.yaml`;

/** Archivos de texto que forman el contenido (las imágenes no se leen). */
export function isContentText(path: string) {
  return inContent(path) && (/\.(?:ya?ml|mdx|json)$/.test(path) || isGuidePath(path));
}

export const lessonDir = dirOf;
export const lessonPath = (dir: string) => `${dir}/${LESSON_FILE}`;
export const guidePath = (dir: string) => `${dir}/${GUIDE_FILE}`;
export const slidePath = (dir: string, file: string) => `${dir}/${SLIDES_DIR}/${file}`;
/** Carpeta del curso al que pertenece una carpeta de clase (`…/clases/<id>` → `…`). */
const courseOfLesson = (dir: string) => dir.slice(0, dir.lastIndexOf('/clases/'));

export function zodMessage(error: ZodError): string {
  return error.issues
    .map((issue) =>
      issue.path.length ? `${issue.path.join('.')}: ${issue.message}` : issue.message,
    )
    .join('; ');
}

const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

/** Lectura por archivo: el texto decide el resultado, así que se reutiliza mientras no cambie. */
const cache = new Map<string, { value: unknown; error: string | null }>();
function cached<T>(kind: string, path: string, text: string, read: () => T) {
  const key = `${kind}\0${path}\0${text}`;
  let entry = cache.get(key);
  if (!entry) {
    try {
      entry = { value: read(), error: null };
    } catch (error) {
      entry = { value: null, error: message(error) };
    }
    cache.set(key, entry);
    if (cache.size > 4000) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }
  return entry as { value: T | null; error: string | null };
}

function schemaReader<T>(schema: ZodType<T, ZodTypeDef, unknown>) {
  return (text: string, json = false): T => {
    const parsed = schema.safeParse(json ? JSON.parse(text) : parse(text));
    if (!parsed.success) throw new Error(zodMessage(parsed.error));
    return parsed.data;
  };
}
const readLesson = schemaReader(lessonSchema);
/**
 * Lectura tolerante para lo que se está editando: una clase o lámina con un campo vacío
 * sigue visible en la app (y su problema se informa) en vez de desaparecer.
 */
const lessonDraftSchema = lessonSchema.extend({
  title: z.string(),
  duration: z.number(),
  prerequisites: z.array(z.string()),
  objectives: z.array(z.string()),
  skills: z.array(z.string()),
  curriculum: z.array(z.string()),
  slides: z.array(z.string()),
  repaso: z.array(z.string()).optional(),
});
const slideDraftSchema = slideSchema.extend({
  id: z.string(),
  title: z.string(),
  steps: z.number().int().min(0),
});
const readLessonDraft = schemaReader(lessonDraftSchema);
function splitDraft(text: string): { slide: Slide; body: string } {
  const normalized = text.replaceAll('\r\n', '\n');
  const parsed = slideDraftSchema.safeParse(parseFrontmatter(normalized));
  if (!parsed.success) throw new Error(zodMessage(parsed.error));
  const lines = normalized.split('\n');
  const end = lines.indexOf('---', 1);
  return { slide: parsed.data, body: lines.slice(end + 1).join('\n') };
}
const readActivity = schemaReader(activitySchema);
const readCurriculum = schemaReader(curriculumSchema);
const readPlanning = schemaReader(planningSchema);
const readGallery = schemaReader(mascotGallerySchema);

/** Interpreta el contenido sin detenerse en el primer error: lo que no se puede leer va a `problems`. */
export function parseContentFiles(files: ContentFiles): ContentBundle {
  const bundle: ContentBundle = {
    lessons: [],
    activities: {},
    activityPaths: {},
    curriculum: [],
    plannings: [],
    gallery: null,
    problems: [],
  };
  const problem = (path: string, text: string) =>
    bundle.problems.push({ path, message: text });
  const paths = [...files.keys()].sort();
  for (const path of paths) {
    const text = files.get(path) ?? '';
    if (path === GALLERY_PATH) {
      const read = cached('gallery', path, text, () => readGallery(text, true));
      if (read.error) problem(path, read.error);
      else bundle.gallery = read.value;
    } else if (isActivityPath(path)) {
      const read = cached('activity', path, text, () => readActivity(text));
      if (read.error || !read.value) problem(path, read.error ?? 'Actividad vacía');
      else if (bundle.activities[read.value.id])
        problem(path, `Actividad duplicada: ${read.value.id}`);
      else {
        bundle.activities[read.value.id] = read.value;
        bundle.activityPaths[read.value.id] = path;
      }
    } else if (isCurriculumPath(path)) {
      const read = cached('curriculum', path, text, () => readCurriculum(text));
      if (read.error || !read.value) problem(path, read.error ?? 'Referencia vacía');
      else bundle.curriculum.push({ ...read.value, path });
    } else if (isPlanningPath(path)) {
      const read = cached('planning', path, text, () => readPlanning(text));
      const id = planningId(path, read.value ?? undefined);
      if (read.error || !read.value) problem(path, read.error ?? 'Planificación vacía');
      else if (!PLANNING_ID.test(id))
        problem(path, `Nombre de biblioteca no válido: ${id}. Usa minúsculas, números y guiones.`);
      else if (bundle.plannings.some((item) => item.id === id))
        problem(path, `Biblioteca duplicada: ${id}.`);
      else bundle.plannings.push({ id, path, dir: dirOf(path), planning: read.value });
    } else if (isLessonPath(path)) {
      const strict = cached('lesson', path, text, () => readLesson(text));
      const read = strict.value
        ? strict
        : cached('lesson-draft', path, text, () => readLessonDraft(text));
      if (strict.error) problem(path, strict.error);
      if (!read.value) continue;
      const meta = read.value;
      const dir = lessonDir(path);
      const readSlides = (list: readonly string[]) => {
        const read: SlideFile[] = [];
        for (const file of list) {
          const source = slidePath(dir, file);
          const slideText = files.get(source);
          if (slideText === undefined) {
            problem(source, `Falta el archivo de la lámina ${file}.`);
            continue;
          }
          const strict = cached('slide', source, slideText, () => splitSource(slideText));
          const split = strict.value
            ? strict
            : cached('slide-draft', source, slideText, () => splitDraft(slideText));
          if (strict.error) problem(source, strict.error);
          if (split.value) read.push({ file, path: source, text: slideText, ...split.value });
        }
        return read;
      };
      const guideText = files.get(guidePath(dir));
      bundle.lessons.push({
        meta,
        dir,
        home: null,
        guide: guideText === undefined ? null : { path: guidePath(dir), text: guideText },
        path,
        text,
        slides: readSlides(meta.slides),
        repaso: readSlides(meta.repaso ?? []),
      });
    }
  }
  // Una clase vive en la carpeta de su curso y se llama como su carpeta.
  const byDir = new Map(bundle.plannings.map((item) => [item.dir, item.id]));
  for (const lesson of bundle.lessons) {
    lesson.home = byDir.get(courseOfLesson(lesson.dir)) ?? null;
    if (nameOf(lesson.dir) !== lesson.meta.id)
      problem(
        lesson.path,
        `La carpeta de la clase debe llamarse como su identificador (${lesson.meta.id}).`,
      );
  }
  // Cada biblioteca tiene sus propias clases: reutilizar una en otra es copiarla.
  const owner = new Map<string, string>();
  for (const { id, path, planning } of bundle.plannings)
    for (const unit of planning.units)
      for (const lesson of unit.lessons) {
        const other = owner.get(lesson.id);
        if (other && other !== id)
          problem(
            path,
            `La clase ${lesson.id} ya está en la biblioteca ${other}. Para usarla aquí, cópiala.`,
          );
        else owner.set(lesson.id, id);
      }
  return bundle;
}

/** Lecciones por identificador (si hay duplicados, gana la primera ruta). */
export function lessonsById(bundle: ContentBundle): Map<string, LessonEntry> {
  const map = new Map<string, LessonEntry>();
  for (const lesson of bundle.lessons)
    if (!map.has(lesson.meta.id)) map.set(lesson.meta.id, lesson);
  return map;
}
