import type { Activity, Lesson, Planning, PlannedLesson } from '@aula/content-model';
import {
  ACTIVITIES_DIR,
  NEW_LESSON_DIR,
  PLANNING_DIR,
  slidePath,
  type ContentBundle,
  type LessonEntry,
  type PlanningFile,
} from '@aula/content-model/content-files';
import { toMdx } from '@aula/content-model/frontmatter';
import {
  ACTIVITY_KEYS,
  LESSON_KEYS,
  patchYaml,
  stringifyYaml,
} from '@aula/content-model/yaml-patch';
import type { EditedSlide } from '../store/schema';
import { slugify } from '../store/teacher';
import { planningReducer, type PlanningAction } from './library';

/** Escritura de un archivo del repositorio; `null` lo borra. */
export interface FileWrite {
  path: string;
  text: string | null;
}

/** Biblioteca de las clases nuevas cuando aún no hay ninguna. */
export const DEFAULT_LIBRARY_ID = 'm1-2027';
const PLANNING_HEADER =
  '# Biblioteca docente: unidades, orden y fechas de sus clases. Se edita desde la app (Clases).\n' +
  '# El título es público: usa un nombre genérico, sin datos privados de cursos.\n';
const PLANNING_KEYS = ['title', 'calendario', 'units'];

export function findLesson(bundle: ContentBundle, id: string): LessonEntry | undefined {
  return bundle.lessons.find((lesson) => lesson.meta.id === id);
}

export const slideFile = (slide: { id: string }) => `${slide.id}.mdx`;

/** Láminas editables de una clase, en el orden de lesson.yaml. */
export function editableSlides(lesson: LessonEntry | undefined): EditedSlide[] {
  return (lesson?.slides ?? []).map(({ slide, body }) => ({ ...slide, body }));
}

/** Láminas del repaso del estudiante, en el orden de `repaso` en lesson.yaml. */
export function editableRepaso(lesson: LessonEntry | undefined): EditedSlide[] {
  return (lesson?.repaso ?? []).map(({ slide, body }) => ({ ...slide, body }));
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
  const kept = new Set([...slides.map(slideFile), ...(lesson.meta.repaso ?? [])]);
  for (const slide of slides)
    writes.push({ path: slidePath(lesson.dir, slideFile(slide)), text: toMdx(slide) });
  for (const file of lesson.meta.slides)
    if (!kept.has(file)) writes.push({ path: slidePath(lesson.dir, file), text: null });
  writes.push(
    ...writeLesson(bundle, lessonId, { slides: slides.map(slideFile) }),
  );
  return writes;
}

/**
 * Reemplaza las láminas del repaso del estudiante: escribe cada .mdx, borra las quitadas y
 * ajusta `repaso` en lesson.yaml (sin la clave si queda vacío). No toca `slides` ni `tramos`.
 */
export function writeRepaso(
  bundle: ContentBundle,
  lessonId: string,
  repaso: readonly EditedSlide[],
): FileWrite[] {
  const lesson = findLesson(bundle, lessonId);
  if (!lesson) return [];
  const writes: FileWrite[] = [];
  const kept = new Set([...repaso.map(slideFile), ...lesson.meta.slides]);
  for (const slide of repaso)
    writes.push({ path: slidePath(lesson.dir, slideFile(slide)), text: toMdx(slide) });
  for (const file of lesson.meta.repaso ?? [])
    if (!kept.has(file)) writes.push({ path: slidePath(lesson.dir, file), text: null });
  writes.push(
    ...writeLesson(bundle, lessonId, {
      repaso: repaso.length ? repaso.map(slideFile) : undefined,
    }),
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

export function planningFile(
  bundle: ContentBundle,
  libraryId: string,
): PlanningFile | undefined {
  return bundle.plannings.find((item) => item.id === libraryId);
}

/** Biblioteca por omisión: la primera, o la de siempre si aún no hay ninguna. */
export function defaultLibraryId(bundle: ContentBundle): string {
  return bundle.plannings[0]?.id ?? DEFAULT_LIBRARY_ID;
}

/** Biblioteca que planifica una clase; null si ninguna. */
export function libraryOfLesson(bundle: ContentBundle, lessonId: string): string | null {
  return (
    bundle.plannings.find(({ planning }) =>
      planning.units.some((unit) => unit.lessons.some((item) => item.id === lessonId)),
    )?.id ?? null
  );
}

export function planningOf(bundle: ContentBundle, libraryId: string): Planning {
  return planningFile(bundle, libraryId)?.planning ?? { units: [] };
}

export function writePlanning(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  libraryId: string,
  next: Planning,
): FileWrite[] {
  const path = planningFile(bundle, libraryId)?.path ?? `${PLANNING_DIR}/${libraryId}.yaml`;
  const original = files.get(path);
  const value: Record<string, unknown> = { ...next };
  if (!next.title) delete value.title;
  return [
    {
      path,
      text: original
        ? patchYaml(original, value, PLANNING_KEYS)
        : PLANNING_HEADER + stringifyYaml(value, PLANNING_KEYS),
    },
  ];
}

/** Cambios de la planificación de una biblioteca; sin biblioteca no hay nada que escribir. */
export function planningWrites(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  libraryId: string | null,
  ...actions: PlanningAction[]
): FileWrite[] {
  if (!libraryId) return [];
  const next = actions.reduce(planningReducer, planningOf(bundle, libraryId));
  return writePlanning(bundle, files, libraryId, next);
}

/** Crea una biblioteca vacía; el identificador (nombre del archivo) sale del título. */
export function createLibrary(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  title: string,
): { id: string; writes: FileWrite[] } {
  const taken = new Set([
    ...bundle.plannings.map((item) => item.id),
    ...[...files.keys()]
      .filter((path) => path.startsWith(`${PLANNING_DIR}/`))
      .map((path) => path.slice(PLANNING_DIR.length + 1).replace(/\.yaml$/, '')),
  ]);
  const id = slugify(title, taken);
  return {
    id,
    writes: writePlanning(bundle, files, id, { title: title.trim(), units: [] }),
  };
}

/** Borra el archivo de una biblioteca; sus clases quedan «Sin unidad». */
export function removeLibrary(bundle: ContentBundle, libraryId: string): FileWrite[] {
  const file = planningFile(bundle, libraryId);
  return file ? [{ path: file.path, text: null }] : [];
}

/**
 * Copia una clase a otra biblioteca: láminas, repaso y datos con un identificador nuevo, en la
 * unidad del mismo nombre (que se crea si falta). La clase original no cambia.
 */
export function copyLesson(
  bundle: ContentBundle,
  files: ReadonlyMap<string, string>,
  input: {
    id: string;
    title: string;
    objective: string;
    unitTitle: string;
    libraryId: string;
    taken: ReadonlySet<string>;
  },
): { id: string; writes: FileWrite[] } {
  let id = `${input.id}-${input.libraryId}`;
  for (let k = 2; input.taken.has(id); k++) id = `${input.id}-${input.libraryId}-${k}`;
  const planning = planningOf(bundle, input.libraryId);
  const units = new Set(planning.units.map((unit) => unit.id));
  let unitId = planning.units.find((unit) => unit.title === input.unitTitle)?.id;
  const actions: PlanningAction[] = [];
  if (!unitId) {
    let n = units.size + 1;
    while (units.has(`u${n}`)) n++;
    unitId = `u${n}`;
    actions.push({ type: 'addUnit', id: unitId, title: input.unitTitle });
  }
  const source = findLesson(bundle, input.id);
  const lesson: PlannedLesson = source
    ? { id }
    : { id, title: input.title, ...(input.objective ? { objective: input.objective } : {}) };
  actions.push({ type: 'addLesson', unitId, lesson });
  const writes: FileWrite[] = source
    ? createLesson(bundle, {
        id,
        title: input.title,
        objective: input.objective,
        slides: editableSlides(source),
        repaso: editableRepaso(source),
        base: source.meta,
      })
    : [];
  writes.push(...planningWrites(bundle, files, input.libraryId, ...actions));
  return { id, writes };
}

/** lesson.yaml de una clase nueva: borrador con los mínimos que pide content:check. */
export function newLessonMeta(
  bundle: ContentBundle,
  input: { id: string; title: string; objective: string; slides: string[]; repaso?: string[] },
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
    ...(input.repaso?.length ? { repaso: input.repaso } : {}),
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
    repaso?: readonly EditedSlide[];
    base?: Lesson;
  },
): FileWrite[] {
  const dir = `${NEW_LESSON_DIR}/${input.id}`;
  const repaso = input.repaso ?? [];
  const meta = newLessonMeta(
    bundle,
    { ...input, slides: input.slides.map(slideFile), repaso: repaso.map(slideFile) },
    input.base,
  );
  return [
    {
      path: `${dir}/lesson.yaml`,
      text: stringifyYaml({ ...meta }, LESSON_KEYS),
    },
    ...[...input.slides, ...repaso].map((slide) => ({
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
/** Láminas que usan una actividad, con la lista (clase o repaso) y su posición en ella. */
export function activityUses(bundle: ContentBundle, id: string) {
  return bundle.lessons.flatMap((lesson) =>
    (['slides', 'repaso'] as const).flatMap((list) =>
      lesson[list].flatMap((file, index) =>
        file.slide.activities.includes(id)
          ? [{ lesson: lesson.meta, slide: file.slide, list, index }]
          : [],
      ),
    ),
  );
}
