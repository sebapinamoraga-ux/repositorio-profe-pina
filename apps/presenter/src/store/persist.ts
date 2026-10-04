import { seedTeacherData } from './seed';
import {
  ROLE_KEY,
  STORAGE_KEY,
  UNLOCK_KEY,
  roleStateSchema,
  teacherDataSchema,
  teacherDataV1Schema,
  type RoleState,
  type TeacherData,
} from './schema';

export function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
export function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Navegación privada o almacenamiento lleno: la app sigue funcionando en memoria. */
  }
}

/**
 * Datos inválidos o de otra versión no se pierden: se respaldan y se parte de la siembra.
 * La versión 1 guardaba también biblioteca y ediciones: quedan en `legacy` hasta llevarlas
 * al repositorio.
 */
export function parseTeacherData(raw: string | null): TeacherData {
  if (raw) {
    try {
      const json: unknown = JSON.parse(raw);
      const parsed = teacherDataSchema.safeParse(json);
      if (parsed.success) return parsed.data;
      const v1 = teacherDataV1Schema.safeParse(json);
      if (v1.success) {
        write(`${STORAGE_KEY}-respaldo-v1`, raw);
        const { units, library, edits } = v1.data;
        return {
          version: 2,
          notes: v1.data.notes,
          courses: v1.data.courses,
          sessions: v1.data.sessions,
          activeSession: v1.data.activeSession,
          lessonId: v1.data.lessonId,
          legacy: { units, library, edits },
        };
      }
    } catch {
      /* JSON dañado: se respalda abajo. */
    }
    write(`${STORAGE_KEY}-respaldo`, raw);
  }
  return seedTeacherData();
}

export const loadTeacherData = () => parseTeacherData(read(STORAGE_KEY));
export const saveTeacherData = (data: TeacherData) =>
  write(STORAGE_KEY, JSON.stringify(data));

export function loadRoleState(): RoleState {
  try {
    const parsed = roleStateSchema.safeParse(JSON.parse(read(ROLE_KEY) ?? ''));
    if (parsed.success) return parsed.data;
  } catch {
    /* Sin rol guardado. */
  }
  return { role: null, view: 'hoy' };
}
export const saveRoleState = (state: RoleState) =>
  write(ROLE_KEY, JSON.stringify(state));

/** Bloqueo local de la parte docente hasta la etapa B. No es una medida de seguridad. */
export const isUnlocked = () => read(UNLOCK_KEY) === '1';
export const setUnlocked = (value: boolean) =>
  write(UNLOCK_KEY, value ? '1' : null);

export function deviceId() {
  try {
    const saved = sessionStorage.getItem('profe-pina-aula-dispositivo');
    if (saved) return saved;
    const id = 'd' + Math.random().toString(36).slice(2, 10);
    sessionStorage.setItem('profe-pina-aula-dispositivo', id);
    return id;
  } catch {
    return 'd' + Math.random().toString(36).slice(2, 10);
  }
}
