import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import type { LessonMeta, DeckSlide } from '../store/deck';

/** Ritmo de la clase: minutos reales por tramo, solo mientras se proyecta. */
const PACE_KEY = 'profe-pina-ritmo-v1';

const paceSchema = z.object({
  key: z.string(),
  acc: z.record(z.number()),
  cur: z.string().nullable(),
  since: z.number(),
  total: z.number(),
  runStart: z.number(),
  running: z.boolean(),
});
type PaceData = z.infer<typeof paceSchema>;

function load(): PaceData | null {
  try {
    const parsed = paceSchema.safeParse(
      JSON.parse(localStorage.getItem(PACE_KEY) ?? 'null'),
    );
    // Una pestaña cerrada sin pausar: se cuenta hasta el último guardado.
    if (parsed.success) return { ...parsed.data, running: false };
  } catch {
    /* Sin registro previo. */
  }
  return null;
}
function save(data: PaceData | null) {
  try {
    if (data) localStorage.setItem(PACE_KEY, JSON.stringify(data));
    else localStorage.removeItem(PACE_KEY);
  } catch {
    /* Sin almacenamiento: el cronómetro sigue en memoria. */
  }
}

export function tramoAt(
  meta: LessonMeta,
  slides: readonly DeckSlide[],
  index: number,
) {
  const ids = slides.map((slide) => slide.id);
  return (
    meta.tramos.find((tramo) => {
      const from = ids.indexOf(tramo.from);
      const to = ids.indexOf(tramo.to);
      return from >= 0 && index >= from && index <= (to < 0 ? from : to);
    }) ?? null
  );
}

export function usePace(key: string, tramo: string | null, active: boolean) {
  const data = useRef<PaceData | null>(null);
  const [, setTick] = useState(0);

  const pause = useCallback(() => {
    const p = data.current;
    if (!p || !p.running) return;
    const now = Date.now();
    if (p.cur) p.acc[p.cur] = (p.acc[p.cur] ?? 0) + (now - p.since);
    p.total += now - p.runStart;
    p.running = false;
    save(p);
  }, []);
  const resume = useCallback(
    (label: string | null) => {
      if (!data.current || data.current.key !== key) {
        const saved = load();
        data.current =
          saved && saved.key === key
            ? saved
            : { key, acc: {}, cur: null, since: 0, total: 0, runStart: 0, running: false };
      }
      const p = data.current;
      if (p.running) return;
      const now = Date.now();
      Object.assign(p, { running: true, cur: label, since: now, runStart: now });
      save(p);
    },
    [key],
  );

  useEffect(() => {
    if (!active) return;
    const visibility = () => {
      if (document.hidden) pause();
      else resume(tramo);
    };
    if (!document.hidden) resume(tramo);
    document.addEventListener('visibilitychange', visibility);
    const timer = setInterval(() => {
      setTick((n) => n + 1);
      if (data.current?.running) save(data.current);
    }, 15000);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      clearInterval(timer);
      pause();
    };
  }, [active, key, pause, resume, tramo]);

  const restart = useCallback(() => {
    data.current = null;
    save(null);
    resume(tramo);
    setTick((n) => n + 1);
  }, [resume, tramo]);

  const read = (label: string | null) => {
    const p = data.current;
    if (!p) return { tramoMin: 0, totalMin: 0 };
    const now = Date.now();
    const spent = label
      ? (p.acc[label] ?? 0) + (p.running && p.cur === label ? now - p.since : 0)
      : 0;
    return {
      tramoMin: spent / 60000,
      totalMin: (p.total + (p.running ? now - p.runStart : 0)) / 60000,
    };
  };
  return { read, restart };
}
