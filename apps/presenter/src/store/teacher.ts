import type { Lesson } from '@aula/content-model';
import {
  ORIGINAL_LESSON_ID,
  PLANNING,
  seedTeacherData,
  type Planning,
} from './seed';
import type {
  ActiveSession,
  Course,
  EditedSlide,
  LibraryEntry,
  Note,
  Session,
  TeacherData,
  VoteSummary,
} from './schema';

/** Acciones sobre los datos docentes. Los identificadores y las horas llegan ya calculados: el reductor es puro. */
export type TeacherAction =
  | { type: 'replace'; data: TeacherData }
  | { type: 'restore'; patch: Partial<TeacherData> }
  | { type: 'openLesson'; id: string }
  | { type: 'setEdits'; lessonId: string; slides: EditedSlide[] }
  | { type: 'restoreOriginal'; lessonId: string }
  | { type: 'syncFromRepo'; repo: readonly Lesson[] }
  | {
      type: 'prepareLesson';
      id: string;
      slides: EditedSlide[];
    }
  | {
      type: 'duplicateLesson';
      id: string;
      newId: string;
      slides: EditedSlide[];
    }
  | {
      type: 'updateLesson';
      id: string;
      patch: Partial<Omit<LibraryEntry, 'id'>>;
    }
  | {
      type: 'addLesson';
      unitId: string;
      id: string;
      title: string;
      objective: string;
    }
  | { type: 'removeLesson'; id: string }
  | { type: 'moveLesson'; id: string; delta: -1 | 1 }
  | { type: 'setLessonUnit'; id: string; unitId: string }
  | { type: 'addUnit'; id: string; title: string }
  | { type: 'renameUnit'; id: string; title: string }
  | { type: 'moveUnit'; id: string; delta: -1 | 1 }
  | { type: 'removeUnit'; id: string; targetId: string | null }
  | { type: 'addNote'; note: Note }
  | { type: 'updateNote'; id: string; patch: Partial<Omit<Note, 'id'>> }
  | { type: 'removeNote'; id: string }
  | { type: 'addCourse'; course: Course }
  | { type: 'updateCourse'; id: string; patch: Partial<Omit<Course, 'id'>> }
  | { type: 'removeCourse'; id: string }
  | { type: 'startSession'; session: ActiveSession }
  | { type: 'endSession'; id: string; end: string; obs: string }
  | { type: 'updateSession'; id: string; patch: Partial<Pick<Session, 'obs'>> }
  | { type: 'saveVoteSummary'; summary: VoteSummary };

const swap = <T>(list: readonly T[], i: number, j: number): T[] => {
  const next = [...list];
  const a = next[i];
  const b = next[j];
  if (a === undefined || b === undefined) return next;
  next[i] = b;
  next[j] = a;
  return next;
};

/** Inserta después de la última clase de la unidad para mantener las unidades contiguas. */
function insertInUnit(
  library: readonly LibraryEntry[],
  entry: LibraryEntry,
): LibraryEntry[] {
  const next = [...library];
  const last = next.map((item) => item.unitId).lastIndexOf(entry.unitId);
  next.splice(last < 0 ? next.length : last + 1, 0, entry);
  return next;
}

function withoutLesson(data: TeacherData, ids: ReadonlySet<string>) {
  const edits = { ...data.edits };
  for (const id of ids) delete edits[id];
  return {
    library: data.library.filter((entry) => !ids.has(entry.id)),
    edits,
    lessonId: ids.has(data.lessonId) ? ORIGINAL_LESSON_ID : data.lessonId,
  };
}

/**
 * Rehace unidades y biblioteca desde la planificación y las clases del repositorio. Conserva
 * notas, cursos, sesiones y las clases creadas o editadas en este navegador; las que salieron
 * de la planificación sin láminas propias desaparecen.
 */
export function syncFromRepo(
  data: TeacherData,
  repo: readonly Lesson[],
  planning: Planning = PLANNING,
): TeacherData {
  const fresh = seedTeacherData(repo, planning);
  const known = new Set(fresh.library.map((entry) => entry.id));
  let units = fresh.units;
  let library = fresh.library.map(
    (entry): LibraryEntry =>
      entry.status === 'por-preparar' && data.edits[entry.id]
        ? { ...entry, status: 'en-preparacion' }
        : entry,
  );
  for (const entry of data.library) {
    if (known.has(entry.id) || !(entry.local || data.edits[entry.id])) continue;
    if (!units.some((unit) => unit.id === entry.unitId))
      units = [
        ...units,
        data.units.find((unit) => unit.id === entry.unitId) ?? {
          id: entry.unitId,
          title: 'Creadas en este navegador',
        },
      ];
    library = insertInUnit(library, entry);
  }
  return {
    ...data,
    units,
    library,
    seenRepo: fresh.seenRepo,
    lessonId: library.some((entry) => entry.id === data.lessonId)
      ? data.lessonId
      : fresh.lessonId,
  };
}

export function teacherReducer(
  data: TeacherData,
  action: TeacherAction,
): TeacherData {
  switch (action.type) {
    case 'replace':
      return action.data;
    case 'restore':
      return { ...data, ...action.patch };
    case 'openLesson':
      return { ...data, lessonId: action.id };
    case 'setEdits':
      return {
        ...data,
        edits: { ...data.edits, [action.lessonId]: action.slides },
      };
    case 'restoreOriginal': {
      const edits = { ...data.edits };
      delete edits[action.lessonId];
      return { ...data, edits };
    }
    case 'syncFromRepo':
      return syncFromRepo(data, action.repo);
    case 'prepareLesson':
      return {
        ...data,
        lessonId: action.id,
        edits: { ...data.edits, [action.id]: action.slides },
        library: data.library.map((entry) =>
          entry.id === action.id
            ? { ...entry, status: 'en-preparacion' }
            : entry,
        ),
      };
    case 'duplicateLesson': {
      const source = data.library.find((entry) => entry.id === action.id);
      if (!source) return data;
      const library = [...data.library];
      library.splice(library.indexOf(source) + 1, 0, {
        ...source,
        id: action.newId,
        title: `${source.title} (copia)`,
        status: 'en-preparacion',
        local: true,
      });
      return {
        ...data,
        library,
        edits: { ...data.edits, [action.newId]: action.slides },
      };
    }
    case 'updateLesson':
      return {
        ...data,
        library: data.library.map((entry) =>
          entry.id === action.id ? { ...entry, ...action.patch } : entry,
        ),
      };
    case 'addLesson':
      return {
        ...data,
        library: insertInUnit(data.library, {
          id: action.id,
          unitId: action.unitId,
          title: action.title.trim() || 'Nueva clase',
          objective: action.objective.trim(),
          duration: 80,
          status: 'por-preparar',
          local: true,
        }),
      };
    case 'removeLesson':
      if (action.id === ORIGINAL_LESSON_ID) return data;
      return { ...data, ...withoutLesson(data, new Set([action.id])) };
    case 'moveLesson': {
      const entry = data.library.find((item) => item.id === action.id);
      if (!entry) return data;
      const siblings = data.library.filter(
        (item) => item.unitId === entry.unitId,
      );
      const other = siblings[siblings.indexOf(entry) + action.delta];
      if (!other) return data;
      return {
        ...data,
        library: swap(
          data.library,
          data.library.indexOf(entry),
          data.library.indexOf(other),
        ),
      };
    }
    case 'setLessonUnit': {
      const entry = data.library.find((item) => item.id === action.id);
      if (!entry || entry.unitId === action.unitId) return data;
      return {
        ...data,
        library: insertInUnit(
          data.library.filter((item) => item.id !== action.id),
          { ...entry, unitId: action.unitId },
        ),
      };
    }
    case 'addUnit':
      return {
        ...data,
        units: [
          ...data.units,
          { id: action.id, title: action.title.trim() || 'Nueva unidad' },
        ],
      };
    case 'renameUnit':
      return {
        ...data,
        units: data.units.map((unit) =>
          unit.id === action.id ? { ...unit, title: action.title } : unit,
        ),
      };
    case 'moveUnit': {
      const i = data.units.findIndex((unit) => unit.id === action.id);
      const j = i + action.delta;
      if (i < 0 || j < 0 || j >= data.units.length) return data;
      return { ...data, units: swap(data.units, i, j) };
    }
    case 'removeUnit': {
      const inUnit = data.library.filter((entry) => entry.unitId === action.id);
      const units = data.units.filter((unit) => unit.id !== action.id);
      if (action.targetId) {
        const targetId = action.targetId;
        return {
          ...data,
          units,
          library: [
            ...data.library.filter((entry) => entry.unitId !== action.id),
            ...inUnit.map((entry) => ({ ...entry, unitId: targetId })),
          ],
        };
      }
      if (inUnit.some((entry) => entry.id === ORIGINAL_LESSON_ID)) return data;
      return {
        ...data,
        units,
        ...withoutLesson(data, new Set(inUnit.map((entry) => entry.id))),
      };
    }
    case 'addNote':
      return { ...data, notes: [action.note, ...data.notes] };
    case 'updateNote':
      return {
        ...data,
        notes: data.notes.map((note) =>
          note.id === action.id ? { ...note, ...action.patch } : note,
        ),
      };
    case 'removeNote':
      return {
        ...data,
        notes: data.notes.filter((note) => note.id !== action.id),
      };
    case 'addCourse':
      return { ...data, courses: [...data.courses, action.course] };
    case 'updateCourse':
      return {
        ...data,
        courses: data.courses.map((course) =>
          course.id === action.id ? { ...course, ...action.patch } : course,
        ),
      };
    case 'removeCourse':
      return {
        ...data,
        courses: data.courses.filter((course) => course.id !== action.id),
      };
    case 'startSession':
      return { ...data, activeSession: action.session };
    case 'endSession': {
      const active = data.activeSession;
      if (!active) return data;
      return {
        ...data,
        activeSession: null,
        sessions: [
          { ...active, id: action.id, end: action.end, obs: action.obs },
          ...data.sessions,
        ],
      };
    }
    case 'updateSession':
      return {
        ...data,
        sessions: data.sessions.map((session) =>
          session.id === action.id ? { ...session, ...action.patch } : session,
        ),
      };
    case 'saveVoteSummary': {
      const active = data.activeSession;
      if (!active) return data;
      return {
        ...data,
        activeSession: {
          ...active,
          votes: [
            ...active.votes.filter(
              (vote) => vote.activity !== action.summary.activity,
            ),
            action.summary,
          ],
        },
      };
    }
  }
}

export function pendingNotes(data: TeacherData, lessonId: string) {
  return data.notes.filter(
    (note) => note.lessonId === lessonId && note.status === 'pendiente',
  );
}

/** Identificador estable a partir del título, único dentro de `taken`. */
export function slugify(title: string, taken: ReadonlySet<string>) {
  const base =
    title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40)
      .replace(/-$/, '') || 'clase';
  let id = base;
  for (let k = 2; taken.has(id); k++) id = `${base}-${k}`;
  return id;
}

export function uid(prefix: string) {
  return prefix + Math.random().toString(36).slice(2, 8);
}

export function nowParts(date = new Date()) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}
