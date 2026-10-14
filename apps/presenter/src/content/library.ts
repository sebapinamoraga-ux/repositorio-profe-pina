import type {
  Lesson,
  LessonMark,
  PlannedLesson,
  Planning,
} from '@aula/content-model';
import type { ContentBundle } from '@aula/content-model/content-files';

/** Una biblioteca (un archivo de content/planning): un curso, el canal de YouTube… */
export interface LibraryInfo {
  id: string;
  title: string;
  path: string;
}

export interface Unit {
  id: string;
  title: string;
  /** Biblioteca de la unidad; null en «Sin unidad», que se ve en todas. */
  libraryId: string | null;
}

/** Una clase en la biblioteca: lo planificado, completado con su lesson.yaml si existe. */
export interface LibraryEntry {
  id: string;
  /** Biblioteca dueña de la clase; null si ninguna la planifica aún. */
  libraryId: string | null;
  unitId: string;
  title: string;
  objective: string;
  duration: number;
  status: LessonMark;
  /** Estado en el repositorio; null si aún no tiene lesson.yaml. */
  repoStatus: Lesson['status'] | null;
  /** Día planificado (AAAA-MM-DD), si la planificación lo indica. */
  date: string | null;
}

export interface Library {
  libraries: LibraryInfo[];
  units: Unit[];
  entries: LibraryEntry[];
}

/** Clases del repositorio que ninguna biblioteca ubica: se muestran en todas. */
export const UNPLANNED_UNIT: Unit = { id: 'sin-unidad', title: 'Sin unidad', libraryId: null };

/** Unidades que se ven en una biblioteca: las suyas y, al final, «Sin unidad». */
export function unitsIn(library: Library, libraryId: string | null): Unit[] {
  return library.units.filter((unit) => unit.libraryId === libraryId || unit.libraryId === null);
}

/** Clases que se ven en una biblioteca: las suyas y las que ninguna planifica. */
export function entriesIn(library: Library, libraryId: string | null): LibraryEntry[] {
  return library.entries.filter(
    (entry) => entry.libraryId === libraryId || entry.libraryId === null,
  );
}

export function entryOf(
  planned: PlannedLesson | undefined,
  lesson: Lesson | undefined,
  id: string,
  unitId: string,
  libraryId: string | null = null,
): LibraryEntry {
  if (!lesson)
    return {
      id,
      libraryId,
      unitId,
      title: planned?.title ?? id,
      objective: planned?.objective ?? '',
      duration: 80,
      status: 'por-preparar',
      repoStatus: null,
      date: planned?.date ?? null,
    };
  const mark =
    planned?.mark && planned.mark !== 'por-preparar'
      ? planned.mark
      : lesson.status === 'published'
        ? 'lista'
        : 'en-preparacion';
  return {
    id,
    libraryId,
    unitId,
    title: lesson.title,
    objective: lesson.objectives[0] ?? '',
    duration: lesson.duration,
    status: mark,
    repoStatus: lesson.status,
    date: planned?.date ?? null,
  };
}

export function libraryOf(bundle: ContentBundle): Library {
  const lessons = new Map(bundle.lessons.map((l) => [l.meta.id, l.meta]));
  const libraries: LibraryInfo[] = [];
  const units: Unit[] = [];
  const entries: LibraryEntry[] = [];
  const placed = new Set<string>();
  for (const { id: libraryId, path, planning } of bundle.plannings) {
    libraries.push({ id: libraryId, title: planning.title?.trim() || libraryId, path });
    for (const unit of planning.units) {
      units.push({ id: unit.id, title: unit.title, libraryId });
      for (const planned of unit.lessons) {
        if (placed.has(planned.id)) continue;
        placed.add(planned.id);
        entries.push(
          entryOf(planned, lessons.get(planned.id), planned.id, unit.id, libraryId),
        );
      }
    }
  }
  const loose = bundle.lessons.filter((l) => !placed.has(l.meta.id));
  if (loose.length) {
    units.push(UNPLANNED_UNIT);
    for (const lesson of loose)
      entries.push(entryOf(undefined, lesson.meta, lesson.meta.id, UNPLANNED_UNIT.id));
  }
  return { libraries, units, entries };
}

export type PlanningAction =
  | { type: 'addLesson'; unitId: string; lesson: PlannedLesson; after?: string }
  | { type: 'removeLesson'; id: string }
  | { type: 'moveLesson'; id: string; delta: -1 | 1 }
  | { type: 'setLessonUnit'; id: string; unitId: string }
  | { type: 'updateLesson'; id: string; patch: Partial<Omit<PlannedLesson, 'id'>> }
  | { type: 'addUnit'; id: string; title: string }
  | { type: 'renameUnit'; id: string; title: string }
  | { type: 'moveUnit'; id: string; delta: -1 | 1 }
  | { type: 'removeUnit'; id: string; targetId: string | null };

const swap = <T>(list: readonly T[], i: number, j: number): T[] => {
  const next = [...list];
  const a = next[i];
  const b = next[j];
  if (a === undefined || b === undefined) return next;
  next[i] = b;
  next[j] = a;
  return next;
};

function findLesson(planning: Planning, id: string) {
  for (const unit of planning.units) {
    const lesson = unit.lessons.find((item) => item.id === id);
    if (lesson) return { unit, lesson };
  }
  return null;
}

const withoutLesson = (planning: Planning, id: string): Planning => ({
  units: planning.units.map((unit) => ({
    ...unit,
    lessons: unit.lessons.filter((item) => item.id !== id),
  })),
});

/**
 * Cambios de la planificación. Las clases que no figuran (las de «Sin unidad») se
 * incorporan al moverlas a una unidad.
 */
export function planningReducer(planning: Planning, action: PlanningAction): Planning {
  const title = planning.title === undefined ? {} : { title: planning.title };
  return { ...title, units: unitsReducer(planning, action).units };
}

function unitsReducer(planning: Planning, action: PlanningAction): Planning {
  switch (action.type) {
    case 'addLesson': {
      const base = withoutLesson(planning, action.lesson.id);
      return {
        units: base.units.map((unit) => {
          if (unit.id !== action.unitId) return unit;
          const lessons = [...unit.lessons];
          const after = action.after
            ? lessons.findIndex((item) => item.id === action.after)
            : -1;
          lessons.splice(after < 0 ? lessons.length : after + 1, 0, action.lesson);
          return { ...unit, lessons };
        }),
      };
    }
    case 'removeLesson':
      return withoutLesson(planning, action.id);
    case 'moveLesson':
      return {
        units: planning.units.map((unit) => {
          const i = unit.lessons.findIndex((item) => item.id === action.id);
          const j = i + action.delta;
          if (i < 0 || j < 0 || j >= unit.lessons.length) return unit;
          return { ...unit, lessons: swap(unit.lessons, i, j) };
        }),
      };
    case 'setLessonUnit': {
      const found = findLesson(planning, action.id);
      if (found?.unit.id === action.unitId) return planning;
      const lesson: PlannedLesson = found?.lesson ?? { id: action.id };
      return planningReducer(withoutLesson(planning, action.id), {
        type: 'addLesson',
        unitId: action.unitId,
        lesson,
      });
    }
    case 'updateLesson':
      return {
        units: planning.units.map((unit) => ({
          ...unit,
          lessons: unit.lessons.map((item) => {
            if (item.id !== action.id) return item;
            const next: PlannedLesson = { ...item, ...action.patch };
            for (const key of ['title', 'objective', 'mark', 'date'] as const)
              if (next[key] === undefined || next[key] === '') delete next[key];
            return next;
          }),
        })),
      };
    case 'addUnit':
      return {
        units: [
          ...planning.units,
          { id: action.id, title: action.title.trim() || 'Nueva unidad', lessons: [] },
        ],
      };
    case 'renameUnit':
      return {
        units: planning.units.map((unit) =>
          unit.id === action.id ? { ...unit, title: action.title } : unit,
        ),
      };
    case 'moveUnit': {
      const i = planning.units.findIndex((unit) => unit.id === action.id);
      const j = i + action.delta;
      if (i < 0 || j < 0 || j >= planning.units.length) return planning;
      return { units: swap(planning.units, i, j) };
    }
    case 'removeUnit': {
      const unit = planning.units.find((item) => item.id === action.id);
      if (!unit) return planning;
      const rest = planning.units.filter((item) => item.id !== action.id);
      if (!action.targetId) return { units: rest };
      return {
        units: rest.map((item) =>
          item.id === action.targetId
            ? { ...item, lessons: [...item.lessons, ...unit.lessons] }
            : item,
        ),
      };
    }
  }
}

/** Por qué una clase es la actual: se hace hoy, es la próxima del calendario o es la última abierta. */
export type CurrentReason = 'hoy' | 'proxima' | 'ultima';

/**
 * La clase actual según la planificación: la de hoy; si no hay, la próxima con fecha; si no
 * quedan fechas por delante, la última que se abrió. `today` es AAAA-MM-DD en hora local.
 */
export function currentLesson(
  entries: readonly LibraryEntry[],
  today: string,
  lastOpened: string,
): { id: string; reason: CurrentReason; date: string | null } | null {
  const dated = entries
    .filter((entry): entry is LibraryEntry & { date: string } => entry.date !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
  const now = dated.find((entry) => entry.date === today);
  if (now) return { id: now.id, reason: 'hoy', date: now.date };
  const next = dated.find((entry) => entry.date > today);
  if (next) return { id: next.id, reason: 'proxima', date: next.date };
  const last = entries.find((entry) => entry.id === lastOpened) ?? entries[0];
  return last ? { id: last.id, reason: 'ultima', date: last.date } : null;
}

/** «sábado 17 de octubre» a partir de AAAA-MM-DD, sin depender de la zona horaria. */
export function formatPlanDate(date: string, style: 'long' | 'short' = 'long'): string {
  const [y = 0, m = 1, d = 1] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('es-CL', {
    timeZone: 'UTC',
    ...(style === 'long'
      ? { weekday: 'long', day: 'numeric', month: 'long' }
      : { weekday: 'short', day: 'numeric', month: 'short' }),
  });
}
