import { z } from 'zod';
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const phaseSchema = z.enum([
  'inicio',
  'activacion',
  'desarrollo',
  'practica',
  'cierre',
]);
export const slideSchema = z.object({
  id,
  title: z.string().min(1),
  phase: phaseSchema,
  layout: z.enum([
    'portada',
    'concepto',
    'dos-columnas',
    'resolucion',
    'ejercicio',
  ]),
  steps: z.number().int().min(0).max(12),
  activities: z.array(id).default([]),
});
export const lessonSchema = z.object({
  id,
  title: z.string().min(1),
  subject: z.enum(['m1', 'm2', 'fisica']),
  axis: z.string(),
  duration: z.number().positive(),
  prerequisites: z.array(z.string()).min(1),
  objectives: z.array(z.string()).min(1),
  skills: z.array(z.string()).min(1),
  curriculum: z.array(id).min(1),
  status: z.enum(['draft', 'published']),
  slides: z.array(z.string().regex(/^[a-z0-9-]+\.mdx$/)).min(1),
});
export const activitySchema = z
  .object({
    id,
    prompt: z.string().min(1),
    type: z.enum(['abierta', 'paes']),
    answer: z.string().min(1),
    solution: z.string().min(1),
    skills: z.array(z.string()).min(1),
    source: z.object({
      kind: z.enum(['original', 'oficial']),
      reference: z.string().min(1),
    }),
    options: z
      .array(
        z.object({
          id: z.string(),
          text: z.string().min(1),
          correct: z.boolean(),
          explanation: z.string().min(1),
        }),
      )
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (
      value.type === 'paes' &&
      (!value.options ||
        value.options.length < 4 ||
        value.options.length > 5 ||
        value.options.filter((o) => o.correct).length !== 1)
    )
      ctx.addIssue({
        code: 'custom',
        message:
          'Una pregunta PAES debe tener cuatro o cinco alternativas y una correcta.',
      });
    if (
      value.options &&
      new Set(value.options.map((o) => o.id)).size !== value.options.length
    )
      ctx.addIssue({ code: 'custom', message: 'Alternativas duplicadas.' });
  });
export type Lesson = z.infer<typeof lessonSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Activity = z.infer<typeof activitySchema>;
