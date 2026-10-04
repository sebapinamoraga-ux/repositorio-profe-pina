import { useCallback, useEffect, useState } from 'react';
import { z } from 'zod';

/** Avance del repaso: por dispositivo, sin cuenta y sin sincronizar. */
const KEY = 'profe-pina-repaso-v1';

export const themeSchema = z.enum(['claro', 'oscuro', 'contraste']);
export type StudentTheme = z.infer<typeof themeSchema>;

const progressSchema = z.object({
  index: z.number().int().nonnegative().default(0),
  seen: z.record(z.boolean()).default({}),
  answers: z.record(z.string()).default({}),
});
export type Progress = z.infer<typeof progressSchema>;

const repasoSchema = z.object({
  version: z.literal(1),
  theme: themeSchema.default('claro'),
  lessons: z.record(progressSchema).default({}),
});
type Repaso = z.infer<typeof repasoSchema>;

const EMPTY: Progress = { index: 0, seen: {}, answers: {} };

function load(): Repaso {
  try {
    const parsed = repasoSchema.safeParse(JSON.parse(localStorage.getItem(KEY) ?? 'null'));
    if (parsed.success) return parsed.data;
  } catch {
    /* Sin avance guardado. */
  }
  return { version: 1, theme: 'claro', lessons: {} };
}

export function useRepaso(lessonId: string) {
  const [state, setState] = useState(load);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* El repaso sigue en memoria. */
    }
  }, [state]);
  const progress = state.lessons[lessonId] ?? EMPTY;
  const setProgress = useCallback(
    (update: (current: Progress) => Progress) =>
      setState((current) => ({
        ...current,
        lessons: {
          ...current.lessons,
          [lessonId]: update(current.lessons[lessonId] ?? EMPTY),
        },
      })),
    [lessonId],
  );
  const go = useCallback(
    (index: number, slideId: string) =>
      setProgress((p) => ({ ...p, index, seen: { ...p.seen, [slideId]: true } })),
    [setProgress],
  );
  const answer = useCallback(
    (activity: string, option: string | null) =>
      setProgress((p) => {
        const answers = { ...p.answers };
        if (option === null) delete answers[activity];
        else answers[activity] = option;
        return { ...p, answers };
      }),
    [setProgress],
  );
  const reset = useCallback(() => {
    const before = progress;
    setProgress(() => EMPTY);
    return () => setProgress(() => before);
  }, [progress, setProgress]);
  const setTheme = useCallback(
    (theme: StudentTheme) => setState((current) => ({ ...current, theme })),
    [],
  );
  return { theme: state.theme, progress, go, answer, reset, setTheme };
}
