import type { Lesson } from '@aula/content-model';
import { reconcileRepo, seedTeacherData } from './seed';
import {
  ROLE_KEY,
  STORAGE_KEY,
  UNLOCK_KEY,
  roleStateSchema,
  teacherDataSchema,
  type RoleState,
  type TeacherData,
} from './schema';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* Navegación privada o almacenamiento lleno: la app sigue funcionando en memoria. */
  }
}

/** Datos inválidos o de otra versión no se pierden: se respaldan y se parte de la siembra. */
export function parseTeacherData(
  raw: string | null,
  repo: readonly Lesson[],
): TeacherData {
  if (raw) {
    try {
      const parsed = teacherDataSchema.safeParse(JSON.parse(raw));
      if (parsed.success) return reconcileRepo(parsed.data, repo);
    } catch {
      /* JSON dañado: se respalda abajo. */
    }
    write(`${STORAGE_KEY}-respaldo`, raw);
  }
  return seedTeacherData(repo);
}

export const loadTeacherData = (repo: readonly Lesson[]) =>
  parseTeacherData(read(STORAGE_KEY), repo);
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
