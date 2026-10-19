import { expect, it } from 'vitest';
import {
  activitySchema,
  mascotPropsSchema,
  planningCalendar,
  planningSchema,
  slideSchema,
} from './index';
it('rechaza diapositivas sin fases válidas', () => {
  expect(
    slideSchema.safeParse({
      id: 'x',
      title: 'X',
      phase: 'inventada',
      layout: 'concepto',
      steps: 1,
    }).success,
  ).toBe(false);
});
it('rechaza una pregunta sin alternativa correcta', () => {
  expect(
    activitySchema.safeParse({
      id: 'a',
      prompt: 'P',
      type: 'paes',
      answer: 'A',
      solution: 'S',
      skills: ['Modelar'],
      source: { kind: 'original', reference: 'Propia' },
      options: ['A', 'B', 'C', 'D'].map((id) => ({
        id,
        text: id,
        correct: false,
        explanation: 'Error',
      })),
    }).success,
  ).toBe(false);
});
it('limita las poses según el nivel de presencia', () => {
  expect(
    mascotPropsSchema.safeParse({
      pose: 45,
      nivel: 'marca',
      ubicacion: 'lateral-derecha',
      alt: 'Profe Piña sostiene un lápiz.',
    }).success,
  ).toBe(true);
  expect(
    mascotPropsSchema.safeParse({
      pose: 45,
      nivel: 'sutil',
      ubicacion: 'superior-derecha',
      alt: 'Profe Piña sostiene un lápiz.',
    }).success,
  ).toBe(false);
});

it('la planificación acepta fechas reales y una sola clase por día', () => {
  const plan = (lessons: { id: string; date?: string }[]) =>
    planningSchema.safeParse({ units: [{ id: 'u1', title: 'U', lessons }] });
  expect(plan([{ id: 'a', date: '2026-10-17' }, { id: 'b' }]).success).toBe(true);
  expect(plan([{ id: 'a', date: '2026-02-30' }]).success).toBe(false);
  expect(plan([{ id: 'a', date: '17-10-2026' }]).success).toBe(false);
  const twice = plan([
    { id: 'a', date: '2026-10-17' },
    { id: 'b', date: '2026-10-17' },
  ]);
  expect(twice.success).toBe(false);
  expect(twice.error?.issues[0]?.message).toContain('Dos clases planificadas el 2026-10-17');
});

it('la biblioteca declara si sus fechas son de clase o de publicación', () => {
  const units = [{ id: 'u1', title: 'U', lessons: [{ id: 'a', date: '2026-11-10' }] }];
  const canal = planningSchema.parse({ calendario: 'publicacion', units });
  expect(planningCalendar(canal)).toBe('publicacion');
  expect(planningCalendar(planningSchema.parse({ units }))).toBe('clases');
  expect(planningSchema.safeParse({ calendario: 'canal', units }).success).toBe(false);
});
