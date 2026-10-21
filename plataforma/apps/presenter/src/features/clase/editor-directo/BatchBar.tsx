import { phaseSchema } from '@aula/content-model';
import type { Tramo } from '../../../content/ops';
import { PHASE_NAMES } from '../../../store/deck';
import type { EditedSlide } from '../../../store/schema';
import { Button } from '../../../ui/Button';
import { LAYOUTS } from './shared';

/** Barra de la selección múltiple: cambia el diseño o el momento de varias láminas a la vez. */
export function BatchBar({
  count,
  tramos,
  onLayout,
  onPhase,
  onMoveTo,
  onDone,
}: {
  count: number;
  tramos: readonly Tramo[] | null;
  onLayout: (layout: EditedSlide['layout']) => void;
  onPhase: (phase: EditedSlide['phase']) => void;
  onMoveTo: (tramo: number) => void;
  onDone: () => void;
}) {
  return (
    <div className="batch-bar" role="group" aria-label="Láminas elegidas">
      <div className="batch-text">
        <b>{count} láminas elegidas</b>
        <span>Mayús o Ctrl + clic en la lista para sumar o quitar</span>
      </div>
      <select
        aria-label="Diseño de las láminas elegidas"
        value=""
        onChange={(event) => {
          const found = LAYOUTS.find(([key]) => key === event.target.value);
          if (found) onLayout(found[0]);
        }}
      >
        <option value="">Diseño…</option>
        {LAYOUTS.map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      <select
        aria-label="Momento de las láminas elegidas"
        value=""
        onChange={(event) => {
          const phase = phaseSchema.safeParse(event.target.value);
          if (phase.success) onPhase(phase.data);
        }}
      >
        <option value="">Momento…</option>
        {Object.entries(PHASE_NAMES).map(([key, label]) => (
          <option key={key} value={key}>
            {label}
          </option>
        ))}
      </select>
      {tramos && (
        <select
          aria-label="Mover las láminas elegidas al final de un tramo"
          value=""
          onChange={(event) => {
            if (event.target.value !== '') onMoveTo(Number(event.target.value));
          }}
        >
          <option value="">Mover al final de…</option>
          {tramos.map((tramo, k) => (
            <option key={k} value={k}>
              {k + 1}. {tramo.label}
            </option>
          ))}
        </select>
      )}
      <Button size="sm" onClick={onDone}>
        Listo
      </Button>
    </div>
  );
}
