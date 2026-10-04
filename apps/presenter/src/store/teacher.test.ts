import { describe, expect, it } from 'vitest';
import { ORIGINAL_LESSON_ID, seedTeacherData } from './seed';
import { slugify, teacherReducer } from './teacher';
import { parseTeacherData } from './persist';
import { teacherDataSchema } from './schema';

const seed = seedTeacherData();

describe('datos docentes privados', () => {
  it('la siembra es válida y no trae contenido: las clases vienen del repositorio', () => {
    expect(teacherDataSchema.safeParse(seed).success).toBe(true);
    expect(seed.lessonId).toBe(ORIGINAL_LESSON_ID);
    expect(Object.keys(seed)).not.toContain('library');
  });

  it('la versión 1 conserva notas y cursos y deja biblioteca y ediciones para migrar', () => {
    const v1 = {
      version: 1,
      units: [{ id: 'u1', title: 'Unidad' }],
      library: [
        {
          id: 'nueva',
          unitId: 'u1',
          title: 'Nueva',
          objective: '',
          duration: 80,
          status: 'en-preparacion',
          local: true,
        },
      ],
      seenRepo: [],
      edits: {
        nueva: [
          {
            id: 'portada',
            title: 'Portada',
            phase: 'inicio',
            layout: 'portada',
            steps: 0,
            activities: [],
            body: '\nHola\n',
            origin: null,
          },
        ],
      },
      notes: [],
      courses: seed.courses,
      sessions: [],
      activeSession: null,
      lessonId: 'nueva',
    };
    const data = parseTeacherData(JSON.stringify(v1));
    expect(data.version).toBe(2);
    expect(data.courses).toEqual(seed.courses);
    expect(data.lessonId).toBe('nueva');
    expect(data.legacy?.library.map((entry) => entry.id)).toEqual(['nueva']);
    expect(data.legacy?.edits.nueva?.[0]?.body).toBe('\nHola\n');
    expect(teacherReducer(data, { type: 'clearLegacy' }).legacy).toBeUndefined();
  });

  it('datos dañados se reemplazan por la siembra', () => {
    expect(parseTeacherData('{no es json')).toEqual(seed);
  });

  it('los identificadores nuevos son únicos y legibles', () => {
    expect(slugify('¿Qué es una función?', new Set(['que-es-una-funcion']))).toBe(
      'que-es-una-funcion-2',
    );
  });
});

describe('cursos e historial', () => {
  it('el resumen de una votación reemplaza al anterior de la misma actividad', () => {
    let data = teacherReducer(seed, {
      type: 'startSession',
      session: {
        courseId: 'c1',
        lessonId: ORIGINAL_LESSON_ID,
        lessonTitle: 'Sistemas',
        date: '2026-10-04',
        start: '10:15',
        votes: [],
      },
    });
    for (const total of [3, 5])
      data = teacherReducer(data, {
        type: 'saveVoteSummary',
        summary: { activity: 'entradas', total, counts: { B: total }, correct: 'B', at: '10:40' },
      });
    expect(data.activeSession?.votes).toHaveLength(1);
    data = teacherReducer(data, { type: 'endSession', id: 's1', end: '11:35', obs: 'Llegamos a la 16.' });
    expect(data.activeSession).toBeNull();
    expect(data.sessions[0]).toMatchObject({ id: 's1', end: '11:35', votes: [{ total: 5 }] });
  });
});
