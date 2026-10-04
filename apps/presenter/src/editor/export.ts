import { stringify } from 'yaml';
import { lessonSchema, type Lesson } from '@aula/content-model';
import { verifyLessonPlan } from '@aula/content-model/verify-plan';
import { repoLessons } from '../store/deck';
import { toMdx } from '../store/mdx';
import type { EditedSlide, LibraryEntry } from '../store/schema';

export interface LessonExport {
  folder: string;
  files: { path: string; text: string }[];
  /** Lo que content:check rechazaría en lesson.yaml; se corrige en el repositorio antes de publicar. */
  problems: string[];
}

const FIELD_NAMES: Record<string, string> = {
  prerequisites: 'conocimientos previos',
  objectives: 'objetivos',
  skills: 'habilidades',
  curriculum: 'referencias curriculares',
  title: 'título',
};

/**
 * Exporta la clase como lesson.yaml + slides/*.mdx, con la estructura de content/lessons.
 * No cambia `status`: publicar sigue siendo una decisión manual en el repositorio.
 */
export function buildExport(
  entry: LibraryEntry | undefined,
  lessonId: string,
  slides: readonly EditedSlide[],
): LessonExport {
  const repo = repoLessons.get(lessonId)?.meta;
  const objectives = repo ? [...repo.objectives] : [];
  if (entry?.objective) {
    if (objectives.length) objectives[0] = entry.objective;
    else objectives.push(entry.objective);
  }
  const lesson: Lesson = {
    id: lessonId,
    title: entry?.title || repo?.title || lessonId,
    subject: repo?.subject ?? 'm1',
    axis: repo?.axis ?? 'Álgebra y funciones',
    duration: entry?.duration ?? repo?.duration ?? 80,
    prerequisites: repo?.prerequisites ?? [],
    objectives,
    skills: repo?.skills ?? [],
    curriculum: repo?.curriculum ?? [],
    status: repo?.status ?? 'draft',
    ...(repo?.tramos ? { tramos: repo.tramos } : {}),
    slides: slides.map((slide) => `${slide.id}.mdx`),
  };
  const problems: string[] = [];
  const parsed = lessonSchema.safeParse(lesson);
  if (!parsed.success)
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0] ?? '');
      problems.push(
        `lesson.yaml: completa ${FIELD_NAMES[key] ?? key} (${issue.message.toLowerCase()}).`,
      );
    }
  problems.push(...verifyLessonPlan(lesson).map((p) => `lesson.yaml: ${p}`));
  const ids = new Set<string>();
  for (const slide of slides) {
    if (ids.has(slide.id)) problems.push(`Identificador de lámina repetido: ${slide.id}.`);
    ids.add(slide.id);
  }
  const folder = lessonId;
  return {
    folder,
    problems,
    files: [
      { path: `${folder}/lesson.yaml`, text: stringify(lesson, { lineWidth: 0 }) },
      ...slides.map((slide) => ({
        path: `${folder}/slides/${slide.id}.mdx`,
        text: toMdx(slide),
      })),
    ],
  };
}
