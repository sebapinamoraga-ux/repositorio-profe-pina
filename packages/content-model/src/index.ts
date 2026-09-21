import { z } from 'zod';
const id = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const phaseSchema = z.enum([
  'inicio',
  'activacion',
  'desarrollo',
  'practica',
  'cierre',
]);
export const mascotPresenceSchema = z.enum(['sutil', 'pedagogica', 'marca']);
export const mascotPlacementSchema = z.enum([
  'superior-derecha',
  'inferior-derecha',
  'lateral-derecha',
  'junto-bloque',
  'grafico',
]);
const mascotPosesByPresence = {
  sutil: new Set([43, 46, 47, 48, 79, 81]),
  pedagogica: new Set([
    ...Array.from({ length: 20 }, (_, index) => index + 1),
    68,
    76,
  ]),
  marca: new Set([45]),
} satisfies Record<z.infer<typeof mascotPresenceSchema>, Set<number>>;
export const mascotPropsSchema = z
  .object({
    pose: z.number().int().min(1).max(112),
    nivel: mascotPresenceSchema,
    ubicacion: mascotPlacementSchema,
    alt: z.string().min(1),
  })
  .superRefine((value, ctx) => {
    if (!mascotPosesByPresence[value.nivel].has(value.pose))
      ctx.addIssue({
        code: 'custom',
        path: ['pose'],
        message: `La pose ${value.pose} no está autorizada para el nivel ${value.nivel}.`,
      });
  });
export const mascotTemplateSchema = z.object({
  id,
  title: z.string().min(1),
  phase: phaseSchema,
  slideType: z.string().min(1),
  layout: z.enum([
    'portada',
    'bloque',
    'dos-columnas',
    'grafico',
    'pasos',
    'alternativas',
    'ecuacion',
    'sintesis',
  ]),
  purpose: z.string().min(1),
  eyebrow: z.string().min(1),
  heading: z.string().min(1),
  body: z.string().min(1),
  calloutTitle: z.string().min(1),
  calloutBody: z.string().min(1),
  uso: z.enum([
    'definicion',
    'objetivo',
    'procedimiento',
    'practica',
    'comprobacion',
    'error',
    'cierre',
    'ticket',
    'registro',
  ]),
  mdx: z.string().min(1),
  preview: z.array(z.object({ title: z.string(), text: z.string() })),
  mascot: mascotPropsSchema,
});
export const mascotGallerySchema = z
  .object({
    version: z.number().int().positive(),
    templates: z.array(mascotTemplateSchema).min(1),
  })
  .superRefine((gallery, ctx) => {
    const ids = new Set<string>();
    gallery.templates.forEach((template, index) => {
      if (ids.has(template.id))
        ctx.addIssue({
          code: 'custom',
          path: ['templates', index, 'id'],
          message: `Plantilla duplicada: ${template.id}`,
        });
      ids.add(template.id);
    });
  });
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
  /** Distribución docente del tiempo (no se proyecta): tramos contiguos que cubren toda la clase. */
  tramos: z
    .array(
      z.object({
        label: z.string().min(1),
        from: id,
        to: id,
        minutes: z.number().nonnegative(),
      }),
    )
    .optional(),
});
/** Coeficientes [a, b, c] de la ecuación ax + by = c, en las unidades del enunciado. */
const equationSchema = z.tuple([z.number(), z.number(), z.number()]);
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
    /** Sistema 2×2 del enunciado; content:check comprueba las alternativas contra él. */
    model: z
      .object({ equations: z.tuple([equationSchema, equationSchema]) })
      .optional(),
    options: z
      .array(
        z.object({
          id: z.string(),
          text: z.string().min(1),
          correct: z.boolean(),
          explanation: z.string().min(1),
          /** Par (x, y) que representa la alternativa; obligatorio si hay `model`. */
          pair: z.tuple([z.number(), z.number()]).optional(),
        }),
      )
      .optional(),
  })
  .superRefine((value, ctx) => {
    if (value.model && value.options?.some((o) => !o.pair))
      ctx.addIssue({
        code: 'custom',
        message: 'Con `model`, cada alternativa debe declarar su `pair`.',
      });
    if (!value.model && value.options?.some((o) => o.pair))
      ctx.addIssue({
        code: 'custom',
        message: 'Un `pair` requiere declarar el `model` del enunciado.',
      });
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
export type MascotPresence = z.infer<typeof mascotPresenceSchema>;
export type MascotPlacement = z.infer<typeof mascotPlacementSchema>;
export type MascotProps = z.infer<typeof mascotPropsSchema>;
export type MascotTemplate = z.infer<typeof mascotTemplateSchema>;

export function mascotTemplateMdx(template: MascotTemplate): string {
  const layout = template.layout === 'portada' ? 'portada' : 'concepto';
  return `---\nid: ${template.id}\ntitle: ${JSON.stringify(template.heading)}\nphase: ${template.phase}\nlayout: ${layout}\nsteps: 0\nactivities: []\n---\n\n<Composicion plantilla="${template.id}">\n${template.mdx}\n</Composicion>\n`;
}
