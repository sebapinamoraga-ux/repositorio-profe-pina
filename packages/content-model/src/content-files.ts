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
 * (`content/lessons/…/lesson.yaml`) y saltos de línea LF. Es la misma forma en disco,
 * en el build y en la API de GitHub, así que las tres fuentes se leen igual.
 */
export type ContentFiles = ReadonlyMap<string, string>;

export interface ContentProblem {
  path: string;
  message: string;
}

export interface SlideFile {
  /** Nombre en lesson.yaml (`apertura.mdx`). */
  file: string;
  path: string;
  text: string;
  slide: Slide;
  body: string;
}

export interface LessonEntry {
  meta: Lesson;
  /** Carpeta de la clase (`content/lessons/m1/algebra/sistemas-2x2`). */
  dir: string;
  path: string;
  text: string;
  /** Solo las láminas que se pudieron leer; las demás quedan en `problems`. */
  slides: SlideFile[];
}

export interface ContentBundle {
  lessons: LessonEntry[];
  activities: Record<string, Activity>;
  activityPaths: Record<string, string>;
  curriculum: (Curriculum & { path: string })[];
  planning: Planning | null;
  planningPath: string | null;
  gallery: MascotGallery | null;
  problems: ContentProblem[];
}

export const GALLERY_PATH = 'content/galleries/mascot-presence.json';
export const LESSONS_DIR = 'content/lessons';
export const ACTIVITIES_DIR = 'content/activities';
export const CURRICULUM_DIR = 'content/curriculum';
export const PLANNING_DIR = 'content/planning';
/** Carpeta por defecto de las clases nuevas, como en `npm run lesson:new`. */
export const NEW_LESSON_DIR = 'content/lessons/m1/algebra';

/** Archivos de texto que forman el contenido (las imágenes no se leen). */
export function isContentText(path: string) {
  return path.startsWith('content/') && /\.(?:ya?ml|mdx|json)$/.test(path);
}

export const lessonDir = (path: string) => path.slice(0, path.lastIndexOf('/'));
export const slidePath = (dir: string, file: string) => `${dir}/slides/${file}`;

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
    planning: null,
    planningPath: null,
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
    } else if (path.startsWith(`${ACTIVITIES_DIR}/`) && path.endsWith('.yaml')) {
      const read = cached('activity', path, text, () => readActivity(text));
      if (read.error || !read.value) problem(path, read.error ?? 'Actividad vacía');
      else if (bundle.activities[read.value.id])
        problem(path, `Actividad duplicada: ${read.value.id}`);
      else {
        bundle.activities[read.value.id] = read.value;
        bundle.activityPaths[read.value.id] = path;
      }
    } else if (path.startsWith(`${CURRICULUM_DIR}/`) && path.endsWith('.yaml')) {
      const read = cached('curriculum', path, text, () => readCurriculum(text));
      if (read.error || !read.value) problem(path, read.error ?? 'Referencia vacía');
      else bundle.curriculum.push({ ...read.value, path });
    } else if (path.startsWith(`${PLANNING_DIR}/`) && path.endsWith('.yaml')) {
      const read = cached('planning', path, text, () => readPlanning(text));
      if (read.error || !read.value) problem(path, read.error ?? 'Planificación vacía');
      else if (bundle.planning)
        problem(path, 'Solo puede haber un archivo de planificación.');
      else {
        bundle.planning = read.value;
        bundle.planningPath = path;
      }
    } else if (path.startsWith(`${LESSONS_DIR}/`) && path.endsWith('/lesson.yaml')) {
      const strict = cached('lesson', path, text, () => readLesson(text));
      const read = strict.value
        ? strict
        : cached('lesson-draft', path, text, () => readLessonDraft(text));
      if (strict.error) problem(path, strict.error);
      if (!read.value) continue;
      const meta = read.value;
      const dir = lessonDir(path);
      const slides: SlideFile[] = [];
      for (const file of meta.slides) {
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
        if (split.value) slides.push({ file, path: source, text: slideText, ...split.value });
      }
      bundle.lessons.push({ meta, dir, path, text, slides });
    }
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
