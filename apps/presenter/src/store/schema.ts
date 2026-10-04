import { z } from 'zod';
import { lessonMarkSchema, slideSchema } from '@aula/content-model';

/**
 * Datos docentes privados guardados en este navegador (notas, cursos, sesiones). El contenido
 * de las clases vive en el repositorio. Cambiar la forma exige subir `version` y migrar.
 */
export const STORAGE_KEY = 'profe-pina-aula-v1';
export const ROLE_KEY = 'profe-pina-aula-rol';
export const UNLOCK_KEY = 'profe-pina-aula-acceso';

export { lessonMarkSchema, type LessonMark } from '@aula/content-model';

export const unitSchema = z.object({ id: z.string().min(1), title: z.string() });
export type Unit = z.infer<typeof unitSchema>;

export const libraryEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  unitId: z.string().min(1),
  title: z.string(),
  objective: z.string(),
  duration: z.number().positive(),
  status: lessonMarkSchema,
  local: z.boolean().optional(),
});
/** Biblioteca de la etapa A (v1): solo se lee para migrarla al repositorio. */
export type LegacyLibraryEntry = z.infer<typeof libraryEntrySchema>;

/** Lámina en edición: frontmatter + cuerpo MDX. */
export const editedSlideSchema = slideSchema.extend({
  body: z.string(),
  origin: z.unknown().optional(),
});
export type EditedSlide = z.infer<typeof slideSchema> & { body: string };

export const noteSourceSchema = z.enum(['presentador', 'cierre', 'editor']);
export const noteSchema = z.object({
  id: z.string(),
  lessonId: z.string(),
  slideId: z.string().nullable(),
  slideTitle: z.string(),
  text: z.string(),
  date: z.string(),
  time: z.string(),
  source: noteSourceSchema,
  course: z.string(),
  status: z.enum(['pendiente', 'aplicado']),
});
export type Note = z.infer<typeof noteSchema>;

export const courseSchema = z.object({
  id: z.string(),
  nombre: z.string(),
  nivel: z.string(),
  observaciones: z.string(),
});
export type Course = z.infer<typeof courseSchema>;

export const voteSummarySchema = z.object({
  activity: z.string(),
  total: z.number().int().nonnegative(),
  counts: z.record(z.number().int().nonnegative()),
  correct: z.string().nullable(),
  at: z.string(),
});
export type VoteSummary = z.infer<typeof voteSummarySchema>;

export const activeSessionSchema = z.object({
  courseId: z.string(),
  lessonId: z.string(),
  lessonTitle: z.string(),
  date: z.string(),
  start: z.string(),
  votes: z.array(voteSummarySchema).default([]),
});
export type ActiveSession = z.infer<typeof activeSessionSchema>;

export const sessionSchema = activeSessionSchema.extend({
  id: z.string(),
  end: z.string(),
  obs: z.string(),
});
export type Session = z.infer<typeof sessionSchema>;

const privateData = {
  notes: z.array(noteSchema),
  courses: z.array(courseSchema),
  sessions: z.array(sessionSchema),
  activeSession: activeSessionSchema.nullable(),
  lessonId: z.string(),
};

/** Etapa A: biblioteca y ediciones también vivían en el navegador. */
export const teacherDataV1Schema = z.object({
  version: z.literal(1),
  units: z.array(unitSchema),
  library: z.array(libraryEntrySchema),
  seenRepo: z.array(z.string()),
  edits: z.record(z.array(editedSlideSchema)),
  ...privateData,
});

/** Lo que la versión 1 tenía en el navegador y aún no se lleva al repositorio. */
export const legacyContentSchema = z.object({
  units: z.array(unitSchema),
  library: z.array(libraryEntrySchema),
  edits: z.record(z.array(editedSlideSchema)),
});
export type LegacyContent = z.infer<typeof legacyContentSchema>;

export const teacherDataSchema = z.object({
  version: z.literal(2),
  ...privateData,
  legacy: legacyContentSchema.optional(),
});
export type TeacherData = z.infer<typeof teacherDataSchema>;

export const roleSchema = z.enum(['estudiante', 'docente', 'remoto']);
export type Role = z.infer<typeof roleSchema>;
export const viewSchema = z.enum([
  'hoy',
  'biblioteca',
  'presentar',
  'editor',
  'galeria',
  'cursos',
  'pdf',
  'actividades',
  'conexion',
]);
export type View = z.infer<typeof viewSchema>;
export const roleStateSchema = z.object({
  role: roleSchema.nullable(),
  view: viewSchema.catch('hoy'),
});
export type RoleState = z.infer<typeof roleStateSchema>;
