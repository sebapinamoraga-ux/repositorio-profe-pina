import type { Course, TeacherData } from './schema';

/** La clase base del proyecto: no se elimina de la biblioteca. */
export const ORIGINAL_LESSON_ID = 'sistemas-2x2';

const SEED_COURSES: Course[] = [
  {
    id: 'c1',
    nombre: '3° Medio A',
    nivel: '3° medio',
    observaciones: 'Preparación PAES M1. Martes y jueves, bloque de 80 minutos.',
  },
  {
    id: 'c2',
    nombre: '3° Medio B',
    nivel: '3° medio',
    observaciones: 'Necesitan más práctica con signos.',
  },
];

/** Datos privados iniciales: las clases y la planificación vienen del repositorio. */
export function seedTeacherData(): TeacherData {
  return {
    version: 2,
    notes: [],
    courses: SEED_COURSES,
    sessions: [],
    activeSession: null,
    lessonId: ORIGINAL_LESSON_ID,
  };
}
