import type { Activity, Lesson, Planning } from '@aula/content-model';
import {
  ACTIVITIES_DIR,
  NEW_LESSON_DIR,
  PLANNING_DIR,
  slidePath,
  type ContentBundle,
  type LessonEntry,
} from '@aula/content-model/content-files';
import { toMdx } from '@aula/content-model/frontmatter';
import {
  ACTIVITY_KEYS,
  LESSON_KEYS,
  patchYaml,
  stringifyYaml,
} from '@aula/content-model/yaml-patch';
import type { EditedSlide } from '../store/schema';
import { planningReducer, type PlanningAction } from './library';

/** Escritura de un archivo del repositorio; `null` lo borra. */
export interface FileWrite {
  path: string;
  text: string | null;
}

export const DEFAULT_PLANNING_PATH = `${PLANNING_DIR}/m1-2027.yaml`;
const PLANNING_HEADER =
  '# Planificación de unidades: orden de la biblioteca docente. Se edita desde la app (Biblioteca).\n';

export function findLesson(bundle: ContentBundle, id: string): LessonEntry | undefined {
  return bundle.lessons.find((lesson) => lesson.meta.id === id);
}

export const slideFile = (slide: { id: string }) => `${slide.id}.mdx`;

/** Láminas editables de una clase, en el orden de lesson.yaml. */
export function editableSlides(lesson: LessonEntry | undefined): EditedSlide[] {
  return (lesson?.slides ?? []).map(({ slide, body }) => ({ ...slide, body }));
}

/** Reemplaza las láminas de una clase: escribe cada .mdx, borra los quitados y ajusta lesson.yaml. */
export function writeSlides(
  bundle: ContentBundle,
  lessonId: string,
  slides: readonly EditedSlide[],
): FileWrite[] {
  const lesson = findLesson(bundle, lessonId);
  if (!lesson) return [];
  const writes: FileWrite[] = [];
  const kept = new Set(slides.map(slideFile));
  for (const slide of slides)
    writes.push({ path: slidePath(lesson.dir, slideFile(slide)), text: toMdx(slide) });
  for (const file of lesson.meta.slides)
    if (!kept.has(file)) writes.push({ path: slidePath(lesson.dir, file), text: null });
  writes.push(
    ...writeLesson(bundle, lessonId, { slides: slides.map(slideFile) }),
  );
  return writes;
}

/** Cambia campos de lesson.yaml conservando el resto del archivo. */
export function writeLesson(
  bundle: ContentBundle,
  lessonId: string,
  patch: Partial<Lesson>,
): FileWrite[] {
  const lesson = findLesson(bundle, lessonId);
  if (!lesson) return [];
  const next: Record<string, unknown> = { ...lesson.meta, ...patch };
  if (!next.tramos || (Array.isArray(next.tramos) && !next.tramos.length))
    delete next.tramos;
  return [{ path: lesson.path, text: patchYaml(lesson.text, next, LESSON_KEYS) }];
}

export function planningOf(bundle: ContentBundle): Planning {
  return bundle.planning ?? { units: [] };
}

export function writePlanning(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  next: Planning,
): FileWrite[] {
  const path = bundle.planningPath ?? DEFAULT_PLANNING_PATH;
  const original = files.get(path);
  return [
    {
      path,
      text: original
        ? patchYaml(original, next, ['units'])
        : PLANNING_HEADER + stringifyYaml(next, ['units']),
    },
  ];
}

export function planningWrites(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  ...actions: PlanningAction[]
): FileWrite[] {
  const next = actions.reduce(planningReducer, planningOf(bundle));
  return writePlanning(bundle, files, next);
}

/** lesson.yaml de una clase nueva: borrador con los mínimos que pide content:check. */
export function newLessonMeta(
  bundle: ContentBundle,
  input: { id: string; title: string; objective: string; slides: string[] },
  base?: Lesson,
): Lesson {
  const curriculum = base?.curriculum.length
    ? base.curriculum
    : bundle.curriculum.slice(0, 1).map((item) => item.id);
  return {
    id: input.id,
    title: input.title || 'Nueva clase',
    subject: base?.subject ?? 'm1',
    axis: base?.axis ?? 'Álgebra y funciones',
    duration: base?.duration ?? 80,
    prerequisites: base?.prerequisites.length
      ? [...base.prerequisites]
      : ['Definir conocimientos previos'],
    objectives: [input.objective || base?.objectives[0] || 'Definir un objetivo observable'],
    skills: base?.skills.length ? [...base.skills] : ['Resolver problemas'],
    curriculum: [...curriculum],
    status: 'draft',
    slides: input.slides,
  };
}

/** Crea la carpeta de una clase (lesson.yaml + láminas) como borrador. */
export function createLesson(
  bundle: ContentBundle,
  input: {
    id: string;
    title: string;
    objective: string;
    slides: readonly EditedSlide[];
    base?: Lesson;
  },
): FileWrite[] {
  const dir = `${NEW_LESSON_DIR}/${input.id}`;
  const meta = newLessonMeta(
    bundle,
    { ...input, slides: input.slides.map(slideFile) },
    input.base,
  );
  return [
    {
      path: `${dir}/lesson.yaml`,
      text: stringifyYaml({ ...meta }, LESSON_KEYS),
    },
    ...input.slides.map((slide) => ({
      path: slidePath(dir, slideFile(slide)),
      text: toMdx(slide),
    })),
  ];
}

/** Borra todos los archivos de la carpeta de una clase. */
export function removeLessonFiles(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  lessonId: string,
): FileWrite[] {
  const lesson = findLesson(bundle, lessonId);
  if (!lesson) return [];
  return [...files.keys()]
    .filter((path) => path.startsWith(`${lesson.dir}/`))
    .map((path) => ({ path, text: null }));
}

export function activityPath(bundle: ContentBundle, id: string) {
  return bundle.activityPaths[id] ?? `${ACTIVITIES_DIR}/${id}.yaml`;
}

export function writeActivity(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  activity: Activity,
): FileWrite[] {
  const path = activityPath(bundle, activity.id);
  const original = files.get(path);
  const value: Record<string, unknown> = { ...activity };
  return [
    {
      path,
      text: original
        ? patchYaml(original, value, ACTIVITY_KEYS)
        : stringifyYaml(value, ACTIVITY_KEYS),
    },
  ];
}

export function removeActivity(bundle: ContentBundle, id: string): FileWrite[] {
  const path = bundle.activityPaths[id];
  return path ? [{ path, text: null }] : [];
}

/** Láminas que usan una actividad. */
export function activityUses(bundle: ContentBundle, id: string) {
  return bundle.lessons.flatMap((lesson) =>
    lesson.slides
      .filter((file) => file.slide.activities.includes(id))
      .map((file) => ({ lesson: lesson.meta, slide: file.slide })),
  );
}
