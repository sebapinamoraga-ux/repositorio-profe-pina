import type { Lesson } from '@aula/content-model';
import type { Course, LibraryEntry, TeacherData, Unit } from './schema';

/** La clase base del proyecto: no se elimina ni se quita de la biblioteca. */
export const ORIGINAL_LESSON_ID = 'sistemas-2x2';

interface PlannedLesson {
  id: string;
  unit: string;
  title: string;
  objective: string;
}

const UNITS: Unit[] = [
  { id: 'u1', title: 'Concepto de función' },
  { id: 'u2', title: 'Funciones lineales y afines' },
  { id: 'u3', title: 'Sistemas de ecuaciones lineales' },
  { id: 'u4', title: 'Función cuadrática' },
];

/** Clases planificadas (Plan.md). Las que tienen lesson.yaml usan su identificador del repositorio. */
const PLANNED: PlannedLesson[] = [
  {
    id: 'que-es-funcion',
    unit: 'u1',
    title: '¿Qué es una función?',
    objective:
      'Reconocer una relación que asigna a cada entrada una única salida, en tablas, diagramas y contextos.',
  },
  {
    id: 'funcion-lineal-afin-1',
    unit: 'u2',
    title: 'Función lineal y función afín',
    objective: 'Distinguir f(x) = mx de f(x) = mx + n y evaluarlas.',
  },
  {
    id: 'pendiente-posicion',
    unit: 'u2',
    title: 'Pendiente y coeficiente de posición',
    objective: 'Interpretar m y n en la expresión y en el gráfico.',
  },
  {
    id: 'funcion-lineal-afin-2-cuadratica-1',
    unit: 'u2',
    title: 'Función afín desde datos y primera mirada a la cuadrática',
    objective:
      'Encontrar la expresión de una función afín y reconocer la función cuadrática.',
  },
  {
    id: 'graficos-lineales',
    unit: 'u2',
    title: 'Gráficos de funciones lineales y afines',
    objective: 'Pasar de la expresión al gráfico y del gráfico a la expresión.',
  },
  {
    id: 'contextos-lineales',
    unit: 'u2',
    title: 'Contextos con funciones lineales y afines',
    objective: 'Modelar situaciones e interpretar los parámetros.',
  },
  {
    id: ORIGINAL_LESSON_ID,
    unit: 'u3',
    title: 'Sistemas de ecuaciones lineales',
    objective: '',
  },
  {
    id: 'cuadratica-grafico',
    unit: 'u4',
    title: 'Función cuadrática y su gráfico',
    objective: 'Reconocer la expresión, la parábola y su concavidad.',
  },
  {
    id: 'funcion-cuadratica-2',
    unit: 'u4',
    title: 'Vértice, ceros y máximo de la parábola',
    objective:
      'Vértice, ceros, discriminante y problemas de máximo o mínimo.',
  },
  {
    id: 'contextos-cuadraticos',
    unit: 'u4',
    title: 'Contextos con funciones cuadráticas',
    objective: 'Modelar situaciones de máximo o mínimo.',
  },
];

/** Las clases de prueba del repositorio no entran en la biblioteca. */
const NOT_SEEDED = new Set(['prueba-autoria']);

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

export function entryFromRepo(lesson: Lesson, unitId: string): LibraryEntry {
  return {
    id: lesson.id,
    unitId,
    title: lesson.title,
    objective: lesson.objectives[0] ?? '',
    duration: lesson.duration,
    status: lesson.status === 'published' ? 'lista' : 'en-preparacion',
  };
}

export function seedTeacherData(repo: readonly Lesson[]): TeacherData {
  const byId = new Map(repo.map((lesson) => [lesson.id, lesson]));
  const library = PLANNED.map((item): LibraryEntry => {
    const lesson = byId.get(item.id);
    return lesson
      ? entryFromRepo(lesson, item.unit)
      : {
          id: item.id,
          unitId: item.unit,
          title: item.title,
          objective: item.objective,
          duration: 80,
          status: 'por-preparar',
        };
  });
  const data: TeacherData = {
    version: 1,
    units: UNITS,
    library,
    seenRepo: [],
    edits: {},
    notes: [],
    courses: SEED_COURSES,
    sessions: [],
    activeSession: null,
    lessonId: byId.has(ORIGINAL_LESSON_ID)
      ? ORIGINAL_LESSON_ID
      : (repo[0]?.id ?? ORIGINAL_LESSON_ID),
  };
  return reconcileRepo(data, repo);
}

/** Incorpora una sola vez las clases del repositorio que aún no estaban en la biblioteca. */
export function reconcileRepo(
  data: TeacherData,
  repo: readonly Lesson[],
): TeacherData {
  const seen = new Set(data.seenRepo);
  const fresh = repo.filter(
    (lesson) => !seen.has(lesson.id) && !NOT_SEEDED.has(lesson.id),
  );
  if (!fresh.length) return data;
  let units = data.units;
  let library = data.library;
  for (const lesson of fresh) {
    if (library.some((entry) => entry.id === lesson.id)) {
      // Una clase planificada recibió su lesson.yaml: deja de estar «Por preparar».
      library = library.map((entry) =>
        entry.id === lesson.id && entry.status === 'por-preparar'
          ? { ...entryFromRepo(lesson, entry.unitId), title: entry.title }
          : entry,
      );
      continue;
    }
    let unit = units.find((u) => u.title === 'Nuevas del repositorio');
    if (!unit) {
      unit = { id: 'u-repo', title: 'Nuevas del repositorio' };
      units = [...units, unit];
    }
    library = [...library, entryFromRepo(lesson, unit.id)];
  }
  return {
    ...data,
    units,
    library,
    seenRepo: [...data.seenRepo, ...fresh.map((lesson) => lesson.id)],
  };
}
