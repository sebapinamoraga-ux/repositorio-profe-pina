import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';
import type { Lesson, Slide } from '@aula/content-model';
import { catalog, type LoadedLesson } from '../app/catalog';
import { splitSource } from './mdx';
import type { EditedSlide, LibraryEntry, TeacherData } from './schema';

export { skeleton, slideFromTemplate, splitSource, toMdx } from './mdx';

export type CompiledContent = ComponentType<{ components: MDXComponents }>;
export type SlideBody =
  | { kind: 'compiled'; Content: CompiledContent }
  | { kind: 'source'; body: string };
export type DeckSlide = Slide & { body: SlideBody };

export interface LessonMeta {
  id: string;
  title: string;
  subject: Lesson['subject'];
  axis: string;
  duration: number;
  objectives: string[];
  prerequisites: string[];
  tramos: NonNullable<Lesson['tramos']>;
  /** Estado en el repositorio; null si la clase solo existe en este navegador. */
  repoStatus: Lesson['status'] | null;
}

export interface Deck {
  meta: LessonMeta;
  slides: DeckSlide[];
  /** repo: láminas compiladas sin cambios · edited: hay una versión local · empty: por preparar. */
  origin: 'repo' | 'edited' | 'empty';
}

export const repoLessons = new Map<string, LoadedLesson>(
  catalog.map((lesson) => [lesson.meta.id, lesson]),
);
export const repoMetas: readonly Lesson[] = catalog.map((lesson) => lesson.meta);

function compiledSlide(lessonId: string, slideId: string) {
  return repoLessons
    .get(lessonId)
    ?.slides.find((slide) => slide.id === slideId)?.Content;
}

export function lessonMeta(
  id: string,
  entry: LibraryEntry | undefined,
): LessonMeta {
  const repo = repoLessons.get(id)?.meta;
  const objectives = repo ? [...repo.objectives] : [];
  if (entry?.objective) {
    if (objectives.length) objectives[0] = entry.objective;
    else objectives.push(entry.objective);
  }
  return {
    id,
    title: entry?.title || repo?.title || 'Clase',
    subject: repo?.subject ?? 'm1',
    axis: repo?.axis ?? 'Álgebra y funciones',
    duration: entry?.duration ?? repo?.duration ?? 80,
    objectives,
    prerequisites: repo?.prerequisites ?? [],
    tramos: repo?.tramos ?? [],
    repoStatus: repo?.status ?? null,
  };
}

export function editedToDeck(slides: readonly EditedSlide[]): DeckSlide[] {
  return slides.map(({ body, origin, ...slide }) => {
    const Content = origin && compiledSlide(origin.lessonId, origin.slideId);
    return {
      ...slide,
      body: Content ? { kind: 'compiled', Content } : { kind: 'source', body },
    };
  });
}

export function deckFor(data: TeacherData, id: string): Deck {
  const meta = lessonMeta(
    id,
    data.library.find((entry) => entry.id === id),
  );
  const edits = data.edits[id];
  if (edits) return { meta, slides: editedToDeck(edits), origin: 'edited' };
  const repo = repoLessons.get(id);
  if (repo)
    return {
      meta,
      slides: repo.slides.map(({ Content, ...slide }) => ({
        ...slide,
        body: { kind: 'compiled', Content },
      })),
      origin: 'repo',
    };
  return { meta, slides: [], origin: 'empty' };
}

/** Deck público: solo el catálogo del repositorio, sin ediciones locales. */
export function repoDeck(id: string): Deck | null {
  const repo = repoLessons.get(id);
  if (!repo) return null;
  return {
    meta: lessonMeta(id, undefined),
    slides: repo.slides.map(({ Content, ...slide }) => ({
      ...slide,
      body: { kind: 'compiled', Content },
    })),
    origin: 'repo',
  };
}

export function hasSlides(data: TeacherData, id: string) {
  return Boolean(data.edits[id]?.length) || repoLessons.has(id);
}

/** Copia editable de las láminas de una clase del repositorio, a partir de su MDX fuente. */
export async function repoSourceSlides(lessonId: string): Promise<EditedSlide[]> {
  const { lessonSources } = await import('virtual:aula-sources');
  const files = lessonSources[lessonId] ?? [];
  return files.map(({ text }) => {
    const { slide, body } = splitSource(text);
    return { ...slide, body, origin: { lessonId, slideId: slide.id } };
  });
}

/** Láminas de partida: las ediciones locales si existen; si no, el MDX del repositorio. */
export async function editableSlides(
  data: TeacherData,
  lessonId: string,
): Promise<EditedSlide[]> {
  const local = data.edits[lessonId];
  if (local) return local.map((slide) => ({ ...slide }));
  return repoSourceSlides(lessonId);
}

export const PHASE_NAMES: Record<Slide['phase'], string> = {
  inicio: 'Inicio',
  activacion: 'Activación',
  desarrollo: 'Desarrollo',
  practica: 'Práctica',
  cierre: 'Cierre',
};

export const pad2 = (n: number) => String(n).padStart(2, '0');
