import type { Lesson } from './index';

/** Problemas del reparto de tiempo de una clase; lista vacía si es coherente o no lo declara. */
export function verifyLessonPlan(lesson: Lesson): string[] {
  if (!lesson.tramos) return [];
  const problems: string[] = [];
  const slides = lesson.slides.map((file) => file.replace(/\.mdx$/, ''));
  let next = 0;
  for (const tramo of lesson.tramos) {
    const from = slides.indexOf(tramo.from);
    const to = slides.indexOf(tramo.to);
    if (from < 0 || to < 0) {
      problems.push(
        `El tramo «${tramo.label}» usa una diapositiva inexistente (${tramo.from} → ${tramo.to}).`,
      );
      continue;
    }
    if (to < from)
      problems.push(
        `El tramo «${tramo.label}» termina (${tramo.to}) antes de empezar (${tramo.from}).`,
      );
    else if (from !== next)
      problems.push(
        `El tramo «${tramo.label}» debe empezar en «${slides[next] ?? 'el final'}», no en «${tramo.from}».`,
      );
    next = to + 1;
  }
  if (next < slides.length)
    problems.push(`Ningún tramo cubre desde «${slides[next]}» hasta el final.`);
  const total = lesson.tramos.reduce((sum, tramo) => sum + tramo.minutes, 0);
  if (total !== lesson.duration)
    problems.push(
      `Los tramos suman ${total} minutos y la clase declara ${lesson.duration}.`,
    );
  return problems;
}
