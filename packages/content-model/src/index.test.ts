import { expect, it } from 'vitest';
import { activitySchema, slideSchema } from './index';
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
