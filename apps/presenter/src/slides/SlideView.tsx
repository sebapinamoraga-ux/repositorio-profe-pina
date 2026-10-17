import type { ReactNode } from 'react';
import * as blocks from '@aula/pedagogical-ui';
import { useActivities } from '../app/catalog';
import { mascotGallery } from '../app/gallery';
import { mascotUrl } from '../app/mascot-assets';
import {
  PHASE_NAMES,
  pad2,
  type DeckSlide,
  type LessonMeta,
} from '../store/deck';
import { mdxComponents } from './components';
import { SourceContent } from './SourceContent';

export function Frame({
  meta,
  slide,
  index,
  total,
  step,
  children,
}: {
  meta: LessonMeta;
  slide: DeckSlide;
  index: number;
  total: number;
  /** Paso impreso, solo en el PDF con pasos. */
  step?: number;
  children: ReactNode;
}) {
  return (
    <article
      className={`slide layout-${slide.layout}`}
      data-slide={slide.id}
      data-paso={step}
    >
      <header>
        <span className="brand">
          p<span className="brand-dot">.</span> <span>PROFE PIÑA</span>
        </span>
        <span className="deck-title" title={meta.title}>
          {meta.title}
        </span>
      </header>
      <div className="slide-body">
        <h1>{slide.title}</h1>
        <div className="slide-content">{children}</div>
      </div>
      <footer>
        <div className="eyebrow">
          <span>{PHASE_NAMES[slide.phase]}</span>
          <span className="rule" />
          <span>{pad2(index + 1)}</span>
        </div>
        <span>
          {pad2(index + 1)} / {total}
        </span>
      </footer>
    </article>
  );
}

export function SlideBodyContent({ slide }: { slide: DeckSlide }) {
  return slide.body.kind === 'compiled' ? (
    <slide.body.Content components={mdxComponents} />
  ) : (
    <SourceContent body={slide.body.body} components={mdxComponents} />
  );
}

/**
 * Una lámina con su contexto de pasos y valores. `print` usa parámetros estáticos; con el
 * último paso (o más) revela todo, incluso lo marcado con un paso mayor que `steps`.
 */
export function SlideView({
  meta,
  slides,
  index,
  step,
  print = false,
  stepped = false,
  values = {},
  setValue = () => {},
  contentKey,
}: {
  meta: LessonMeta;
  slides: readonly DeckSlide[];
  index: number;
  step: number;
  print?: boolean;
  /** PDF con pasos: marca la página con su paso. */
  stepped?: boolean;
  values?: Record<string, string>;
  setValue?: (key: string, value: string) => void;
  contentKey?: string;
}) {
  const activities = useActivities();
  const slide = slides[index];
  if (!slide) return null;
  return (
    <blocks.SlideContext.Provider
      value={{
        step: print && step >= slide.steps ? Number.POSITIVE_INFINITY : step,
        print,
        values: print ? {} : values,
        setValue,
        activities,
        mascotUrl,
        templates: mascotGallery.templates,
      }}
    >
      <Frame
        meta={meta}
        slide={slide}
        index={index}
        total={slides.length}
        step={stepped ? step : undefined}
      >
        <SlideBodyContent key={contentKey} slide={slide} />
      </Frame>
    </blocks.SlideContext.Provider>
  );
}
