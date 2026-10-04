import { useEffect, useRef, useState } from 'react';
import { activities } from '../app/catalog';
import { mascotGallery } from '../app/gallery';
import { lessonMeta, repoLessons, toMdx } from '../store/deck';
import type { EditedSlide, TeacherData } from '../store/schema';

/** Revisión de una clase con las reglas de content:check, más los avisos del reparto de tiempo. */
export interface LessonIssues {
  count: number;
  /** Mensaje de error por lámina (null si está bien), en el orden de la clase. */
  perSlide: (string | null)[];
  bad: number[];
  errors: number;
  /** Avisos de la clase: tramos que no calzan con las láminas (lesson.yaml se ajusta al publicar). */
  warnings: string[];
}

interface Plan {
  duration: number;
  tramos: { label: string; from: string; to: string; minutes: number }[];
}

/** Cada texto de lámina se compila una vez; editar una lámina no vuelve a revisar las demás. */
const slideCache = new Map<string, Promise<string | null>>();

function checkText(text: string) {
  let promise = slideCache.get(text);
  if (!promise) {
    promise = import('@aula/content-model/check-source').then(
      async ({ checkSlideSource }) =>
        (
          await checkSlideSource(text, {
            templateIds: new Set(mascotGallery.templates.map((t) => t.id)),
            activityIds: new Set(Object.keys(activities)),
          })
        ).error,
    );
    slideCache.set(text, promise);
  }
  return promise;
}

export async function checkSlides(
  slides: readonly EditedSlide[],
  plan: Plan,
): Promise<LessonIssues> {
  const { verifyLessonPlan } = await import('@aula/content-model/verify-plan');
  const seen = new Set<string>();
  const perSlide = await Promise.all(
    slides.map(async (slide) => {
      const error = await checkText(toMdx(slide));
      if (error) return error;
      if (seen.has(slide.id)) return `ID duplicado ${slide.id}`;
      seen.add(slide.id);
      return null;
    }),
  );
  const bad = perSlide.flatMap((error, i) => (error ? [i] : []));
  const warnings = plan.tramos.length
    ? verifyLessonPlan({
        id: 'clase',
        title: 'Clase',
        subject: 'm1',
        axis: '',
        duration: plan.duration,
        prerequisites: ['-'],
        objectives: ['-'],
        skills: ['-'],
        curriculum: ['clase'],
        status: 'draft',
        slides: slides.map((slide) => `${slide.id}.mdx`),
        tramos: plan.tramos,
      })
    : [];
  return { count: slides.length, perSlide, bad, errors: bad.length, warnings };
}

const clean = (count: number): LessonIssues => ({
  count,
  perSlide: Array.from({ length: count }, () => null),
  bad: [],
  errors: 0,
  warnings: [],
});

/** null mientras se revisa. Las clases del repositorio sin cambios ya pasaron content:check. */
export function useLessonIssues(
  data: TeacherData,
  lessonId: string,
  slidesOverride?: readonly EditedSlide[],
): LessonIssues | null {
  const edits = slidesOverride ?? data.edits[lessonId];
  const meta = lessonMeta(
    lessonId,
    data.library.find((item) => item.id === lessonId),
  );
  const key = edits ? JSON.stringify([edits, meta.duration, meta.tramos]) : null;
  const [result, setResult] = useState<{
    lessonId: string;
    issues: LessonIssues;
  } | null>(null);
  // `key` resume láminas y plan; el efecto toma los valores vigentes desde la ref.
  const input = useRef({ edits, meta, lessonId });
  useEffect(() => {
    input.current = { edits, meta, lessonId };
  });
  useEffect(() => {
    const { edits: slides, meta: plan, lessonId: id } = input.current;
    if (!key || !slides) return;
    let active = true;
    // Breve espera para no revisar en cada tecla.
    const timer = setTimeout(() => {
      void checkSlides(slides, plan).then((issues) => {
        if (active) setResult({ lessonId: id, issues });
      });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [key]);
  if (!edits) {
    const repo = repoLessons.get(lessonId);
    return repo ? clean(repo.slides.length) : null;
  }
  // Mientras se revisa un cambio, se conserva el último resultado de esta clase.
  return result?.lessonId === lessonId && result.issues.count === edits.length
    ? result.issues
    : null;
}
