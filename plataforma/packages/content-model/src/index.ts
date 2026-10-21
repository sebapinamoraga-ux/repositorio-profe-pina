import { z } from 'zod';
export { katexOptions, katexStrict, katexTrust } from './katex-trust.ts';
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
/**
 * Momento del guion de una lámina de video (docs/plan-diapositivas-video.md §1). Los nombres
 * coinciden con los momentos del motor de video: prediccion, pausa y recuerda.
 */
export const videoMomentSchema = z.enum([
  'gancho',
  'caso',
  'simplificada',
  'desarrollo',
  'recuerda',
  'climax',
  'prediccion',
  'pausa',
  'error',
  'utilidad',
  'cierre',
]);
export const slideSchema = z.object({
  id,
  title: z.string().min(1),
  phase: phaseSchema,
  /** Solo en clases de video. */
  momento: videoMomentSchema.optional(),
  layout: z.enum([
    'portada',
    'concepto',
    'dos-columnas',
    'resolucion',
    'ejercicio',
    /** Lámina de video: el título no ocupa el lienzo y queda libre la franja de subtítulos. */
    'escena',
  ]),
  steps: z.number().int().min(0).max(12),
  activities: z.array(id).default([]),
  /** Notas del orador: solo para el docente; no se proyectan ni van al PDF ni al estudiante. */
  notas: z.string().optional(),
});
/** Una clase de aula se proyecta; una de video es el guion gráfico de un video del canal. */
export const lessonFormatSchema = z.enum(['aula', 'video']);
/** Prerrequisito de un video: otra clase que se recuerda en pantalla, o una base supuesta. */
export const lessonPrerequisiteSchema = z.union([
  z.object({ clase: id, idea: z.string().min(1) }).strict(),
  z.object({ base: z.string().min(1) }).strict(),
]);
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
  /** Sin el campo, la clase es de aula. */
  formato: lessonFormatSchema.optional(),
  /** Video: la pregunta central en una frase. */
  gancho: z.string().min(1).optional(),
  /** Video: lo que se recuerda de otras clases y la base que se supone. */
  previos: z.array(lessonPrerequisiteSchema).optional(),
  slides: z.array(z.string().regex(/^[a-z0-9-]+\.mdx$/)).min(1),
  /**
   * Láminas solo para el repaso del estudiante: siguen a las de la clase en el celular, pero
   * no se proyectan, no salen en el PDF ni cuentan en los tramos.
   */
  repaso: z.array(z.string().regex(/^[a-z0-9-]+\.mdx$/)).optional(),
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
/** Referencia curricular (contenido/comun/curriculo): el editor ofrece sus ejes y habilidades. */
export const curriculumSchema = z
  .object({
    id,
    subject: z.string().optional(),
    axis: z.string().optional(),
    source: z.string().optional(),
    knowledge: z.array(z.string()).optional(),
    skills: z.array(z.string()).optional(),
  })
  .passthrough();
/** Marca docente de una clase en la biblioteca; «por preparar» se deduce de que no exista clase.yaml. */
export const lessonMarkSchema = z.enum(['lista', 'en-preparacion', 'por-preparar']);
/** Fecha de calendario AAAA-MM-DD que existe (no 2026-02-30). */
export const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Usa la forma AAAA-MM-DD, por ejemplo 2026-10-17.')
  .refine((value) => {
    const [y = 0, m = 0, d = 0] = value.split('-').map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
  }, 'La fecha no existe en el calendario.');
export const plannedLessonSchema = z.object({
  id,
  /** Título y objetivo de una clase aún sin clase.yaml; si existe, manda clase.yaml. */
  title: z.string().optional(),
  objective: z.string().optional(),
  mark: lessonMarkSchema.optional(),
  /** Día en que se hace la clase según el calendario; decide la «Clase de hoy». */
  date: isoDateSchema.optional(),
});
/**
 * Para qué son las fechas de una biblioteca: `clases` (por omisión) son días de clase y deciden
 * la «Clase de hoy»; `publicacion` son fechas de publicación (el canal de YouTube) y solo
 * cuentan dentro de su propia biblioteca.
 */
export const planningCalendarSchema = z.enum(['clases', 'publicacion']);
/**
 * Planificación de unidades (`curso.yaml` en la carpeta de cada curso): una biblioteca docente
 * (un curso, una lista del canal de YouTube…) con sus unidades, su orden y sus fechas. El título
 * es público: debe ser genérico, sin datos privados de cursos. `id` conserva el identificador
 * cuando la carpeta tiene otro nombre.
 */
export const planningSchema = z
  .object({
    id: id.optional(),
    title: z.string().optional(),
    calendario: planningCalendarSchema.optional(),
    units: z.array(
      z.object({
        id: z.string().min(1),
        title: z.string(),
        lessons: z.array(plannedLessonSchema).default([]),
      }),
    ),
  })
  .superRefine((planning, ctx) => {
    const units = new Set<string>();
    const lessons = new Set<string>();
    const dates = new Map<string, string>();
    for (const unit of planning.units) {
      if (units.has(unit.id))
        ctx.addIssue({ code: 'custom', message: `Unidad duplicada: ${unit.id}` });
      units.add(unit.id);
      for (const lesson of unit.lessons) {
        if (lessons.has(lesson.id))
          ctx.addIssue({
            code: 'custom',
            message: `Clase planificada dos veces: ${lesson.id}`,
          });
        lessons.add(lesson.id);
        if (!lesson.date) continue;
        const other = dates.get(lesson.date);
        if (other)
          ctx.addIssue({
            code: 'custom',
            message: `Dos clases planificadas el ${lesson.date}: ${other} y ${lesson.id}. Cada día tiene una sola clase.`,
          });
        else dates.set(lesson.date, lesson.id);
      }
    }
  });
export type Lesson = z.infer<typeof lessonSchema>;
export type Slide = z.infer<typeof slideSchema>;
export type Phase = z.infer<typeof phaseSchema>;
export type VideoMoment = z.infer<typeof videoMomentSchema>;
export type LessonFormat = z.infer<typeof lessonFormatSchema>;
export type LessonPrerequisite = z.infer<typeof lessonPrerequisiteSchema>;

/** Fase de la lámina que corresponde a cada momento del guion de video. */
export const PHASE_OF_MOMENT: Record<VideoMoment, Phase> = {
  gancho: 'inicio',
  caso: 'inicio',
  recuerda: 'activacion',
  simplificada: 'desarrollo',
  desarrollo: 'desarrollo',
  climax: 'desarrollo',
  error: 'desarrollo',
  prediccion: 'practica',
  pausa: 'practica',
  utilidad: 'practica',
  cierre: 'cierre',
};

/** Nombre de cada momento en la app. */
export const MOMENT_NAMES: Record<VideoMoment, string> = {
  gancho: 'Gancho',
  caso: 'Caso concreto',
  simplificada: 'Versión simplificada',
  desarrollo: 'Desarrollo',
  recuerda: 'Recuerda',
  climax: 'Clímax',
  prediccion: 'Predicción',
  pausa: 'Pausa',
  error: 'Error con nombre',
  utilidad: 'Utilidad PAES',
  cierre: 'Cierre',
};

/** Formato de una clase; sin el campo, es de aula. */
export function lessonFormat(lesson: Pick<Lesson, 'formato'>): LessonFormat {
  return lesson.formato ?? 'aula';
}
export type Activity = z.infer<typeof activitySchema>;
export type MascotPresence = z.infer<typeof mascotPresenceSchema>;
export type MascotPlacement = z.infer<typeof mascotPlacementSchema>;
export type MascotProps = z.infer<typeof mascotPropsSchema>;
export type MascotTemplate = z.infer<typeof mascotTemplateSchema>;
export type MascotGallery = z.infer<typeof mascotGallerySchema>;
export type Curriculum = z.infer<typeof curriculumSchema>;
export type LessonMark = z.infer<typeof lessonMarkSchema>;
export type PlannedLesson = z.infer<typeof plannedLessonSchema>;
export type Planning = z.infer<typeof planningSchema>;
export type PlanningCalendar = z.infer<typeof planningCalendarSchema>;

/** Calendario de una biblioteca; sin el campo, sus fechas son días de clase. */
export function planningCalendar(planning: Pick<Planning, 'calendario'>): PlanningCalendar {
  return planning.calendario ?? 'clases';
}

export function mascotTemplateMdx(template: MascotTemplate): string {
  const layout = template.layout === 'portada' ? 'portada' : 'concepto';
  return `---\nid: ${template.id}\ntitle: ${JSON.stringify(template.heading)}\nphase: ${template.phase}\nlayout: ${layout}\nsteps: 0\nactivities: []\n---\n\n<Composicion plantilla="${template.id}">\n${template.mdx}\n</Composicion>\n`;
}
