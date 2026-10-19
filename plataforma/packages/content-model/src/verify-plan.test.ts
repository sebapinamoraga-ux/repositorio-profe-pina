import { expect, it } from 'vitest';
import { lessonSchema, type Lesson } from './index';
import { verifyLessonPlan } from './verify-plan';

function lesson(overrides: Record<string, unknown> = {}): Lesson {
  return lessonSchema.parse({
    id: 'clase',
    title: 'Clase',
    subject: 'm1',
    axis: 'Álgebra y funciones',
    duration: 30,
    prerequisites: ['Algo'],
    objectives: ['Algo'],
    skills: ['Modelar'],
    curriculum: ['ref'],
    status: 'draft',
    slides: ['uno.mdx', 'dos.mdx', 'tres.mdx', 'cuatro.mdx'],
    tramos: [
      { label: 'Inicio', from: 'uno', to: 'dos', minutes: 10 },
      { label: 'Desarrollo', from: 'tres', to: 'tres', minutes: 15 },
      { label: 'Cierre', from: 'cuatro', to: 'cuatro', minutes: 5 },
    ],
    ...overrides,
  });
}

it('acepta tramos contiguos que suman la duración', () => {
  expect(verifyLessonPlan(lesson())).toEqual([]);
});
it('no exige tramos', () => {
  expect(verifyLessonPlan(lesson({ tramos: undefined }))).toEqual([]);
});
it('detecta minutos que no suman la duración', () => {
  expect(verifyLessonPlan(lesson({ duration: 40 })).join(' ')).toMatch(
    /suman 30 minutos y la clase declara 40/,
  );
});
it('detecta diapositivas sin tramo', () => {
  const tramos = [{ label: 'Inicio', from: 'uno', to: 'dos', minutes: 30 }];
  expect(verifyLessonPlan(lesson({ tramos })).join(' ')).toMatch(
    /Ningún tramo cubre desde «tres»/,
  );
});
it('detecta huecos y solapamientos', () => {
  const hueco = [
    { label: 'A', from: 'uno', to: 'uno', minutes: 10 },
    { label: 'B', from: 'tres', to: 'cuatro', minutes: 20 },
  ];
  expect(verifyLessonPlan(lesson({ tramos: hueco })).join(' ')).toMatch(
    /«B» debe empezar en «dos», no en «tres»/,
  );
  const solape = [
    { label: 'A', from: 'uno', to: 'dos', minutes: 10 },
    { label: 'B', from: 'dos', to: 'cuatro', minutes: 20 },
  ];
  expect(verifyLessonPlan(lesson({ tramos: solape })).join(' ')).toMatch(
    /«B» debe empezar en «tres», no en «dos»/,
  );
});
it('detecta diapositivas inexistentes y tramos invertidos', () => {
  const tramos = [
    { label: 'A', from: 'uno', to: 'zzz', minutes: 30 },
    { label: 'B', from: 'cuatro', to: 'tres', minutes: 0 },
  ];
  const text = verifyLessonPlan(lesson({ tramos })).join(' ');
  expect(text).toMatch(/usa una diapositiva inexistente/);
  expect(text).toMatch(/«B» termina \(tres\) antes de empezar \(cuatro\)/);
});
