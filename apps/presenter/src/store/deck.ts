import type { ComponentType } from 'react';
import type { MDXComponents } from 'mdx/types';
import type { Lesson, Slide } from '@aula/content-model';
import type {
  ContentBundle,
  LessonEntry,
} from '@aula/content-model/content-files';
import { buildBundle, compiledFor } from '../content/build';
import { libraryOf, type Library } from '../content/library';

export { skeleton, slideFromTemplate, toMdx } from './mdx';
export { editableSlides } from '../content/ops';

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
  /** Estado en el repositorio; null si la clase aún no tiene lesson.yaml. */
  repoStatus: Lesson['status'] | null;
}

export interface Deck {
  meta: LessonMeta;
  slides: DeckSlide[];
  /** repo: tal como está en el repositorio · edited: con cambios sin guardar · empty: por preparar. */
  origin: 'repo' | 'edited' | 'empty';
}

/** Lo que necesita un deck: el contenido efectivo, su biblioteca y los archivos pendientes. */
export interface ContentView {
  bundle: ContentBundle;
  library: Library;
  pending?: readonly string[];
}

/** Contenido empaquetado con el sitio (en producción, solo clases publicadas). */
export const buildView: ContentView = {
  bundle: buildBundle,
  library: libraryOf(buildBundle),
};

export function lessonEntry(view: ContentView, id: string): LessonEntry | undefined {
  return view.bundle.lessons.find((lesson) => lesson.meta.id === id);
}

export function lessonMeta(view: ContentView, id: string): LessonMeta {
  const lesson = lessonEntry(view, id)?.meta;
  const entry = view.library.entries.find((item) => item.id === id);
  return {
    id,
    title: lesson?.title || entry?.title || 'Clase',
    subject: lesson?.subject ?? 'm1',
    axis: lesson?.axis ?? 'Álgebra y funciones',
    duration: lesson?.duration ?? entry?.duration ?? 80,
    objectives: lesson
      ? [...lesson.objectives]
      : entry?.objective
        ? [entry.objective]
        : [],
    prerequisites: lesson?.prerequisites ?? [],
    tramos: lesson?.tramos ?? [],
    repoStatus: lesson?.status ?? null,
  };
}

export function deckSlides(lesson: LessonEntry): DeckSlide[] {
  return lesson.slides.map(({ slide, body, path, text }) => {
    const Content = compiledFor(path, text);
    return {
      ...slide,
      body: Content ? { kind: 'compiled', Content } : { kind: 'source', body },
    };
  });
}

/** Láminas editadas (aún sin archivo) como deck para la vista previa. */
export function editedToDeck(
  slides: readonly (Slide & { body: string })[],
): DeckSlide[] {
  return slides.map(({ body, ...slide }) => ({
    ...slide,
    body: { kind: 'source', body },
  }));
}

export function hasPending(view: ContentView, id: string) {
  const lesson = lessonEntry(view, id);
  return Boolean(
    lesson && view.pending?.some((path) => path.startsWith(`${lesson.dir}/`)),
  );
}

export function deckFor(view: ContentView, id: string): Deck {
  const meta = lessonMeta(view, id);
  const lesson = lessonEntry(view, id);
  if (!lesson) return { meta, slides: [], origin: 'empty' };
  return {
    meta,
    slides: deckSlides(lesson),
    origin: hasPending(view, id) ? 'edited' : 'repo',
  };
}

/** Deck público: solo el contenido del build, sin cambios pendientes. */
export function repoDeck(id: string): Deck | null {
  const lesson = lessonEntry(buildView, id);
  if (!lesson) return null;
  return deckFor(buildView, id);
}

export function hasSlides(view: ContentView, id: string) {
  return Boolean(lessonEntry(view, id)?.slides.length);
}

export const PHASE_NAMES: Record<Slide['phase'], string> = {
  inicio: 'Inicio',
  activacion: 'Activación',
  desarrollo: 'Desarrollo',
  practica: 'Práctica',
  cierre: 'Cierre',
};

export const pad2 = (n: number) => String(n).padStart(2, '0');
