import type {
  ActiveSession,
  Course,
  Note,
  Session,
  TeacherData,
  VoteSummary,
} from './schema';

/**
 * Acciones sobre los datos docentes privados. El contenido (clases, láminas, planificación)
 * se edita en el repositorio desde `ContentProvider`. El reductor es puro: identificadores
 * y horas llegan ya calculados.
 */
export type TeacherAction =
  | { type: 'replace'; data: TeacherData }
  | { type: 'restore'; patch: Partial<TeacherData> }
  | { type: 'openLesson'; id: string }
  | { type: 'clearLegacy' }
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
    case 'clearLegacy': {
      const next = { ...data };
      delete next.legacy;
      return next;
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
