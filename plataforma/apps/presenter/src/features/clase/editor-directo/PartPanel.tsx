import { PHASE_NAMES } from '../../../store/deck';
import type { EditedSlide } from '../../../store/schema';
import type { Block } from '../editor/blocks';
import { LAYOUTS } from './shared';

const stepLabel = (n: number) => (n === 0 ? 'Inicial' : `Paso ${n}`);

/**
 * Pestaña «Parte» del panel derecho: lo que se está editando, en tres niveles separados. La
 * lámina (su título vive en la barra de arriba), la parte elegida en el lienzo y cuándo aparece.
 */
export function PartPanel({
  slide,
  number,
  block,
  editable,
  onStep,
  onNotes,
}: {
  slide: EditedSlide;
  number: string;
  block: Block | null;
  editable: boolean;
  onStep: (step: number) => void;
  onNotes: (text: string) => void;
}) {
  const layout = LAYOUTS.find(([key]) => key === slide.layout)?.[1];
  const locked = !editable || !block;
  const fixedStep = block?.inherited ?? false;
  return (
    <div className="side-body part-panel" role="tabpanel" aria-label="Parte">
      <section className="part-section" aria-label="Lámina">
        <p className="part-kicker is-slide">Lámina {number}</p>
        <p className="part-title">{slide.title || 'Sin título'}</p>
        <p className="muted small">
          {PHASE_NAMES[slide.phase]} · {layout ?? slide.layout} ·{' '}
          {slide.steps === 0
            ? 'sin pasos'
            : `${slide.steps} ${slide.steps === 1 ? 'paso' : 'pasos'}`}
        </p>
        <p className="muted small">El título se cambia en la barra de la lámina.</p>
      </section>
      <section className="part-section" aria-label="Notas del orador">
        <label className="part-kicker" htmlFor="notas-del-orador">
          Notas del orador
        </label>
        <textarea
          id="notas-del-orador"
          rows={4}
          value={slide.notas ?? ''}
          disabled={!editable}
          placeholder="Qué decir, preguntas para el curso, errores a vigilar…"
          onChange={(event) => onNotes(event.target.value)}
        />
        <p className="muted small">
          Solo para ti: no se proyectan ni salen en el PDF. Se guardan con la
          lámina en el repositorio.
        </p>
      </section>
      {block ? (
        <>
          <section className="part-section" aria-label="Parte seleccionada">
            <p className="part-kicker">Parte seleccionada</p>
            <p className="part-title">
              <span className="part-type">{block.label}</span>
              {block.summary !== block.label && <span> {block.summary}</span>}
            </p>
            <p className="muted small">
              Doble clic en la parte, o Enter, para escribir en ella; las acciones
              están en la barra sobre la parte.
            </p>
          </section>
          <section className="part-section" aria-label="Aparición">
            <p className="part-kicker">Aparición</p>
            <div
              role="radiogroup"
              aria-label="Cuándo aparece"
              className="pill-group"
            >
              {Array.from({ length: slide.steps + 1 }, (_, n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={block.step === n}
                  disabled={locked || fixedStep}
                  className="pill pill-small"
                  onClick={() => onStep(n)}
                >
                  {stepLabel(n)}
                </button>
              ))}
            </div>
            <p className="muted small">
              {fixedStep
                ? 'Aparece junto con la parte que la contiene.'
                : block.step === 0
                  ? 'Se ve desde que se abre la lámina.'
                  : `Aparece al hacer clic ${block.step}.`}
            </p>
          </section>
        </>
      ) : (
        <p className="muted small part-empty">
          Elige una parte en la lámina para ver sus datos y cuándo aparece. Con
          el dedo o el cursor sobre ella basta un toque.
        </p>
      )}
    </div>
  );
}
