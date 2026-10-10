import { useEffect, useRef, useState } from 'react';
import type { Lesson } from '@aula/content-model';
import { mascotGallery } from '../app/gallery';
import { useContent } from '../content/ContentProvider';
import { hasPending, lessonEntry, toMdx } from '../store/deck';
import type { EditedSlide } from '../store/schema';

/** Revisión de una clase con las reglas de content:check, más los avisos del reparto de tiempo. */
export interface LessonIssues {
  count: number;
  /** Mensaje de error por lámina (null si está bien), en el orden de la clase. */
  perSlide: (string | null)[];
  bad: number[];
  errors: number;
  /** Problemas de lesson.yaml (campos vacíos, tramos que no calzan…): bloquean el guardado. */
  lessonErrors: string[];
  warnings: string[];
}

/** Cada texto de lámina se compila una vez; editar una lámina no vuelve a revisar las demás. */
const slideCache = new Map<string, Promise<string | null>>();

function checkText(text: string, activityIds: readonly string[]) {
  const key = `${activityIds.join(',')}\0${text}`;
  let promise = slideCache.get(key);
  if (!promise) {
    promise = import('@aula/content-model/check-source').then(
      async ({ checkSlideSource }) =>
        (
          await checkSlideSource(text, {
            templateIds: new Set(mascotGallery.templates.map((t) => t.id)),
            activityIds: new Set(activityIds),
          })
        ).error,
    );
    slideCache.set(key, promise);
    if (slideCache.size > 500) {
      const oldest = slideCache.keys().next().value;
      if (oldest !== undefined) slideCache.delete(oldest);
    }
  }
  return promise;
}

export async function checkSlides(
  slides: readonly EditedSlide[],
  lesson: Lesson | null,
  activityIds: readonly string[],
  lessonErrors: readonly string[] = [],
): Promise<LessonIssues> {
  const { verifyLessonPlan } = await import('@aula/content-model/verify-plan');
  const seen = new Set<string>();
  const perSlide = await Promise.all(
    slides.map(async (slide) => {
      const error = await checkText(toMdx(slide), activityIds);
      if (error) return error;
      if (seen.has(slide.id)) return `ID duplicado ${slide.id}`;
      seen.add(slide.id);
      return null;
    }),
  );
  const bad = perSlide.flatMap((error, i) => (error ? [i] : []));
  const plan = lesson
    ? verifyLessonPlan({ ...lesson, slides: slides.map((s) => `${s.id}.mdx`) })
    : [];
  return {
    count: slides.length,
    perSlide,
    bad,
    errors: bad.length + lessonErrors.length,
    lessonErrors: [...lessonErrors],
    warnings: plan,
  };
}

const clean = (count: number): LessonIssues => ({
  count,
  perSlide: Array.from({ length: count }, () => null),
  bad: [],
  errors: 0,
  lessonErrors: [],
  warnings: [],
});

/**
 * null mientras se revisa. Lo que está en el repositorio sin cambios ya pasó content:check;
 * se revisa lo que tiene cambios sin guardar (o las láminas que entrega el editor).
 * Con `list: 'repaso'` revisa las láminas del repaso: sin tramos ni errores de lesson.yaml,
 * que ya se informan con las de la clase.
 */
export function useLessonIssues(
  lessonId: string,
  slidesOverride?: readonly EditedSlide[],
  list: 'slides' | 'repaso' = 'slides',
): LessonIssues | null {
  const content = useContent();
  const entry = lessonEntry(content, lessonId);
  const pending = hasPending(content, lessonId);
  const source = entry?.[list] ?? [];
  const slides =
    slidesOverride ??
    (pending && entry ? source.map(({ slide, body }) => ({ ...slide, body })) : undefined);
  const lesson = list === 'slides' ? entry : undefined;
  const lessonErrors = lesson
    ? content.bundle.problems
        .filter((problem) => problem.path === lesson.path)
        .map((problem) => problem.message)
    : [];
  const activityIds = Object.keys(content.bundle.activities).sort();
  const key = slides
    ? JSON.stringify([slides, lesson?.meta ?? null, lessonErrors, activityIds])
    : null;
  const [result, setResult] = useState<{
    key: string;
    lessonId: string;
    issues: LessonIssues;
  } | null>(null);
  // `key` resume láminas y plan; el efecto toma los valores vigentes desde la ref.
  const input = useRef({ slides, lesson, lessonId, lessonErrors, activityIds });
  useEffect(() => {
    input.current = { slides, lesson, lessonId, lessonErrors, activityIds };
  });
  useEffect(() => {
    const current = input.current;
    if (!key || !current.slides) return;
    let active = true;
    // Breve espera para no revisar en cada tecla.
    const timer = setTimeout(() => {
      void checkSlides(
        current.slides ?? [],
        current.lesson?.meta ?? null,
        current.activityIds,
        current.lessonErrors,
      ).then((issues) => {
        if (active) setResult({ key, lessonId: current.lessonId, issues });
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key]);
  if (!slides) return entry ? clean(source.length) : null;
  // Mientras se revisa un cambio, se conserva el último resultado de esta clase.
  return result?.lessonId === lessonId && result.issues.count === slides.length
    ? result.issues
    : null;
}
