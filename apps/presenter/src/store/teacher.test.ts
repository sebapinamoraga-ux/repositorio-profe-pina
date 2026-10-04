import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parse } from 'yaml';
import { lessonSchema } from '@aula/content-model';
import { ORIGINAL_LESSON_ID, reconcileRepo, seedTeacherData } from './seed';
import { slugify, teacherReducer } from './teacher';
import { parseTeacherData } from './persist';
import { teacherDataSchema } from './schema';

const root = resolve('content/lessons/m1/algebra');
const repo = readdirSync(root)
  .filter((dir) => readdirSync(join(root, dir)).includes('lesson.yaml'))
  .map((dir) =>
    lessonSchema.parse(parse(readFileSync(join(root, dir, 'lesson.yaml'), 'utf8'))),
  );
const seed = seedTeacherData(repo);

describe('siembra de la biblioteca', () => {
  it('incluye las clases del repositorio y las planificadas por preparar', () => {
    expect(teacherDataSchema.safeParse(seed).success).toBe(true);
    const sistemas = seed.library.find((e) => e.id === ORIGINAL_LESSON_ID);
    expect(sistemas?.status).toBe('lista');
    expect(seed.library.find((e) => e.id === 'que-es-funcion')?.status).toBe(
      'por-preparar',
    );
    expect(seed.library.some((e) => e.id === 'prueba-autoria')).toBe(false);
    expect(seed.units.map((u) => u.id)).toEqual(['u1', 'u2', 'u3', 'u4']);
  });
  it('no vuelve a agregar una clase del repositorio que la docente quitó', () => {
    const removed = teacherReducer(seed, {
      type: 'removeLesson',
      id: 'funcion-lineal-afin-1',
    });
    expect(reconcileRepo(removed, repo)).toBe(removed);
  });
  it('datos dañados se respaldan y se parte de la siembra', () => {
    expect(parseTeacherData('{"version":9}', repo).library.length).toBe(
      seed.library.length,
    );
  });
});

describe('unidades y clases', () => {
  it('la clase original no se elimina, ni con su unidad', () => {
    expect(teacherReducer(seed, { type: 'removeLesson', id: ORIGINAL_LESSON_ID })).toBe(seed);
    expect(teacherReducer(seed, { type: 'removeUnit', id: 'u3', targetId: null })).toBe(seed);
  });
  it('eliminar una unidad puede mover sus clases a otra', () => {
    const next = teacherReducer(seed, { type: 'removeUnit', id: 'u4', targetId: 'u1' });
    expect(next.units.some((u) => u.id === 'u4')).toBe(false);
    expect(next.library.filter((e) => e.unitId === 'u1').length).toBe(4);
  });
  it('eliminar una unidad con sus clases borra también sus ediciones', () => {
    const edited = teacherReducer(seed, {
      type: 'prepareLesson',
      id: 'cuadratica-grafico',
      slides: [],
    });
    const next = teacherReducer(edited, { type: 'removeUnit', id: 'u4', targetId: null });
    expect(next.library.some((e) => e.unitId === 'u4')).toBe(false);
    expect(next.edits['cuadratica-grafico']).toBeUndefined();
    expect(next.lessonId).toBe(ORIGINAL_LESSON_ID);
  });
  it('agregar una clase la deja al final de su unidad', () => {
    const next = teacherReducer(seed, {
      type: 'addLesson',
      unitId: 'u1',
      id: 'dominio',
      title: 'Dominio y recorrido',
      objective: '',
    });
    expect(next.library.findIndex((e) => e.id === 'dominio')).toBe(1);
    expect(next.library.find((e) => e.id === 'dominio')?.status).toBe('por-preparar');
  });
  it('subir y bajar solo dentro de la unidad', () => {
    const up = teacherReducer(seed, { type: 'moveLesson', id: 'pendiente-posicion', delta: -1 });
    expect(up.library.filter((e) => e.unitId === 'u2').map((e) => e.id)[0]).toBe(
      'pendiente-posicion',
    );
    expect(teacherReducer(seed, { type: 'moveLesson', id: 'que-es-funcion', delta: -1 })).toBe(seed);
  });
  it('mover a otra unidad conserva las unidades contiguas', () => {
    const next = teacherReducer(seed, {
      type: 'setLessonUnit',
      id: 'que-es-funcion',
      unitId: 'u4',
    });
    expect(next.library.at(-1)?.id).toBe('que-es-funcion');
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

describe('actualizar desde el repositorio', () => {
  it('rehace títulos, orden y unidades, y recupera clases quitadas', () => {
    let local = teacherReducer(seed, {
      type: 'renameUnit',
      id: 'u1',
      title: 'Otra',
    });
    local = teacherReducer(local, {
      type: 'updateLesson',
      id: 'que-es-funcion',
      patch: { title: 'Título local' },
    });
    local = teacherReducer(local, {
      type: 'removeLesson',
      id: 'funcion-lineal-afin-1',
    });
    local = teacherReducer(local, {
      type: 'moveLesson',
      id: 'pendiente-posicion',
      delta: -1,
    });
    const next = teacherReducer(local, { type: 'syncFromRepo', repo });
    expect(next.units).toEqual(seed.units);
    expect(next.library).toEqual(seed.library);
  });
  it('conserva notas, cursos, láminas editadas y clases creadas en el navegador', () => {
    let local = teacherReducer(seed, {
      type: 'prepareLesson',
      id: 'cuadratica-grafico',
      slides: [],
    });
    local = teacherReducer(local, {
      type: 'addUnit',
      id: 'u-local',
      title: 'Repaso',
    });
    local = teacherReducer(local, {
      type: 'addLesson',
      unitId: 'u-local',
      id: 'repaso-final',
      title: 'Repaso final',
      objective: '',
    });
    local = teacherReducer(local, { type: 'removeCourse', id: 'c1' });
    const next = teacherReducer(local, { type: 'syncFromRepo', repo });
    expect(next.edits['cuadratica-grafico']).toEqual([]);
    expect(
      next.library.find((e) => e.id === 'cuadratica-grafico')?.status,
    ).toBe('en-preparacion');
    expect(next.units.at(-1)).toEqual({ id: 'u-local', title: 'Repaso' });
    expect(next.library.at(-1)?.id).toBe('repaso-final');
    expect(next.courses).toEqual(local.courses);
    expect(next.lessonId).toBe('cuadratica-grafico');
  });
});
