import { createContext, useContext, type ReactNode } from 'react';
import { AlertTriangle, Check, Lightbulb } from 'lucide-react';
import { activities } from '../app/catalog';
import { mdxComponents } from '../slides/components';

/** Lectura en el celular: sin lienzo 16:9, con soluciones plegadas en Práctica y Cierre. */
export interface ReadRuntime {
  fold: boolean;
  firstStep: number;
  open: boolean;
  setOpen: (open: boolean) => void;
  answers: Record<string, string>;
  answer: (activity: string, option: string | null) => void;
}
export const ReadContext = createContext<ReadRuntime>({
  fold: false,
  firstStep: 1,
  open: false,
  setOpen: () => {},
  answers: {},
  answer: () => {},
});

function ReadPaso({ n, children }: { n: number; children: ReactNode }) {
  const ctx = useContext(ReadContext);
  if (!ctx.fold) return <div className="read-step-plain">{children}</div>;
  return (
    <>
      {n === ctx.firstStep && (
        <button
          type="button"
          className="fold-toggle"
          aria-expanded={ctx.open}
          onClick={() => ctx.setOpen(!ctx.open)}
        >
          <Lightbulb size={20} aria-hidden="true" />
          <span>{ctx.open ? 'Ocultar solución' : 'Ver solución'}</span>
        </button>
      )}
      {ctx.open && (
        <div className="read-step">
          <p className="read-step-n">Paso {n}</p>
          {children}
        </div>
      )}
    </>
  );
}

function ReadPregunta({ id }: { id: string; paso?: number }) {
  const ctx = useContext(ReadContext);
  const activity = activities[id];
  if (!activity) return <p className="read-error">Actividad desconocida: {id}</p>;
  const chosen = activity.options?.find((o) => o.id === ctx.answers[id]);
  return (
    <section className="question read-question">
      <div className="block-label">
        {activity.source.kind === 'oficial'
          ? 'PAES · fuente oficial'
          : 'Tipo PAES · elaboración propia'}
      </div>
      <p>{activity.prompt}</p>
      <div className="read-options" role="group" aria-label="Alternativas">
        {activity.options?.map((option) => {
          const state =
            chosen?.id === option.id ? (option.correct ? 'correct' : 'wrong') : '';
          return (
            <button
              key={option.id}
              type="button"
              className={`read-option ${state}`}
              aria-pressed={chosen?.id === option.id}
              disabled={Boolean(chosen)}
              onClick={() => ctx.answer(id, option.id)}
            >
              <b>{option.id}</b>
              <span>{option.text}</span>
              {state && (
                <i className="mark">{state === 'correct' ? '✓ Correcta' : '✕ Tu elección'}</i>
              )}
            </button>
          );
        })}
      </div>
      <div role="status" aria-live="polite">
        {chosen &&
          (chosen.correct ? (
            <div className="feedback is-ok">
              <p className="feedback-title">
                <Check size={20} aria-hidden="true" />
                ¡Correcto! Elegiste {chosen.id}.
              </p>
              <p>{chosen.explanation}</p>
            </div>
          ) : (
            <div className="feedback is-no">
              <p className="feedback-title">
                <AlertTriangle size={20} aria-hidden="true" />
                Aún no. Elegiste {chosen.id}.
              </p>
              <p>{chosen.explanation}</p>
              <button type="button" className="retry" onClick={() => ctx.answer(id, null)}>
                Intentar otra vez
              </button>
            </div>
          ))}
      </div>
      <details className="read-fold">
        <summary>
          <Check size={20} aria-hidden="true" />
          <span>Ver solución completa</span>
        </summary>
        <div className="answer">
          <strong>{activity.answer}</strong>
          <p>{activity.solution}</p>
        </div>
      </details>
    </section>
  );
}

function ReadComposicion({ nota, children }: { plantilla: string; nota?: string; children: ReactNode }) {
  return (
    <div className="read-composition">
      {children}
      {nota && (
        <aside className="companion">
          <p>
            <b>Profe Piña:</b> {nota}
          </p>
        </aside>
      )}
    </div>
  );
}

export const readComponents = {
  ...mdxComponents,
  Paso: ReadPaso,
  PreguntaPAES: ReadPregunta,
  Composicion: ReadComposicion,
  MascotaProfePina: () => null,
};
