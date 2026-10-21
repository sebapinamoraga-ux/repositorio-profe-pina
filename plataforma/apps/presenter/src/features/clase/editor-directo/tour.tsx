import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '../../../ui/Button';

const INTERVAL_MS = 1600;

/**
 * Recorrido «como alumno»: la lámina pasa sola por sus estados, como se ve en clase, sin salir
 * del editor. Esc lo termina; con movimiento reducido no avanza solo (← → recorren a mano).
 */
export function useTour({
  steps,
  enabled,
  mode,
  onView,
  onMode,
}: {
  steps: number;
  enabled: boolean;
  mode: 'todo' | 'proyectar';
  onView: (step: number) => void;
  onMode: (mode: 'todo' | 'proyectar') => void;
}) {
  const [state, setState] = useState<{
    n: number;
    before: 'todo' | 'proyectar';
  } | null>(null);
  const latest = useRef({ state, steps, enabled, mode, onView, onMode });
  useEffect(() => {
    latest.current = { state, steps, enabled, mode, onView, onMode };
  });

  const stop = useCallback(() => {
    const now = latest.current;
    if (!now.state) return;
    now.onMode(now.state.before);
    now.onView(now.steps);
    setState(null);
  }, []);
  const start = useCallback(() => {
    const now = latest.current;
    if (!now.enabled || now.state) return;
    setState({ n: 0, before: now.mode });
    now.onMode('proyectar');
    now.onView(0);
  }, []);
  const go = useCallback(
    (n: number) => {
      const now = latest.current;
      if (!now.state) return;
      if (n > now.steps) {
        stop();
        return;
      }
      const next = Math.max(0, n);
      setState({ ...now.state, n: next });
      now.onView(next);
    },
    [stop],
  );

  const active = state !== null;
  const at = state?.n ?? 0;
  useEffect(() => {
    if (
      !active ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    )
      return;
    const timer = window.setTimeout(() => go(at + 1), INTERVAL_MS);
    return () => window.clearTimeout(timer);
  }, [active, at, go]);
  useEffect(() => {
    const request = () => start();
    window.addEventListener('aula:recorrer', request);
    return () => window.removeEventListener('aula:recorrer', request);
  }, [start]);
  useEffect(() => {
    if (!active) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        stop();
      } else if (event.key === 'ArrowRight') go(at + 1);
      else if (event.key === 'ArrowLeft') go(at - 1);
    };
    window.addEventListener('keydown', key, true);
    return () => window.removeEventListener('keydown', key, true);
  }, [active, at, go, stop]);

  return { active, start, stop };
}

export function TourPill({
  view,
  steps,
  onStop,
}: {
  view: number;
  steps: number;
  onStop: () => void;
}) {
  return (
    <div className="tour-pill" role="status">
      <span>
        Como lo ve el curso ·{' '}
        {view === 0 ? 'al abrir' : `clic ${view} de ${steps}`}
      </span>
      <Button size="sm" onClick={onStop}>
        Terminar
      </Button>
    </div>
  );
}
