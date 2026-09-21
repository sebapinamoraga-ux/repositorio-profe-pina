import { satisfies, solveSystem } from '../../interactives/src/math';
import type { Activity } from './index';

/** Formas en que el contenido puede escribir un número: 1500, 1.500 o 1,5. */
function spellings(value: number): string[] {
  const [whole = '', decimals] = String(Math.abs(value)).split('.');
  const sign = value < 0 ? '-' : '';
  const tail = decimals ? `,${decimals}` : '';
  const dotted = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return [...new Set([`${sign}${whole}${tail}`, `${sign}${dotted}${tail}`])];
}

/** Indica si el texto escribe el valor como número completo (acepta el signo menos tipográfico). */
function mentions(text: string, value: number): boolean {
  const normalized = text.replace(/−/g, '-');
  const before = value < 0 ? '(?<![\\d.,])' : '(?<![\\d.,-])';
  return spellings(value).some((spelling) =>
    new RegExp(
      `${before}${spelling.replace(/[.]/g, '\\.')}(?![\\d]|[.,]\\d)`,
    ).test(normalized),
  );
}

/** Problemas de coherencia matemática de una actividad; lista vacía si es coherente. */
export function verifyActivity(activity: Activity): string[] {
  const problems: string[] = [];
  const { options, model } = activity;
  if (activity.type === 'paes' && options) {
    const correct = options.find((option) => option.correct);
    if (correct && !activity.answer.startsWith(correct.id))
      problems.push(
        `La respuesta «${activity.answer}» no empieza con la alternativa correcta ${correct.id}.`,
      );
  }
  if (!model || !options) return problems;
  const [first, second] = model.equations;
  const solution = solveSystem(first, second);
  if (!solution) {
    problems.push('El sistema del enunciado no tiene solución única.');
    return problems;
  }
  const seen = new Map<string, string>();
  for (const option of options) {
    if (!option.pair) continue;
    const [x, y] = option.pair;
    const holds = satisfies(first, x, y) && satisfies(second, x, y);
    if (option.correct && !holds)
      problems.push(
        `La alternativa correcta ${option.id} (${x}, ${y}) no cumple el sistema; la solución es (${solution.x}, ${solution.y}).`,
      );
    if (!option.correct && holds)
      problems.push(
        `La alternativa ${option.id} (${x}, ${y}) cumple el sistema pero está marcada como incorrecta.`,
      );
    const key = `${x},${y}`;
    const previous = seen.get(key);
    if (previous)
      problems.push(
        `Las alternativas ${previous} y ${option.id} repiten el par (${x}, ${y}).`,
      );
    seen.set(key, option.id);
    for (const value of option.pair)
      if (!mentions(option.text, value))
        problems.push(
          `El texto de la alternativa ${option.id} no muestra el valor ${value} de su par.`,
        );
  }
  for (const value of [solution.x, solution.y])
    if (!mentions(activity.solution, value))
      problems.push(`La solución escrita no menciona el valor ${value}.`);
  return problems;
}
