import { useState } from 'react';
import { Ellipsis, GripVertical, X } from 'lucide-react';
import { Menu } from '../../../ui/Menu';
import type { Block } from '../editor/blocks';

/**
 * Línea de pasos bajo el lienzo: una columna por estado (Inicial, Paso 1…), con los bloques que
 * aparecen en cada uno. Arrastrar un bloque a otra columna cambia su paso.
 */
export function StepTimeline({
  blocks,
  steps,
  view,
  mode,
  selected,
  editable,
  compact = false,
  onMode,
  onView,
  onAdd,
  onAddHere,
  onRemove,
  onAssign,
  onSelect,
}: {
  blocks: readonly Block[];
  steps: number;
  view: number;
  mode: 'todo' | 'proyectar';
  selected: number | null;
  editable: boolean;
  /** Con el dedo: tocar una ficha ofrece «Mover a» y cada columna tiene «⋯» con «Quitar paso». */
  compact?: boolean;
  onMode: (mode: 'todo' | 'proyectar') => void;
  onView: (step: number) => void;
  onAdd: () => void;
  /** Deja el paso como destino de lo que se agregue (sin parte elegida). */
  onAddHere: (step: number) => void;
  onRemove: (step: number) => void;
  onAssign: (blockIndex: number, step: number) => void;
  onSelect: (index: number) => void;
}) {
  const [over, setOver] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const own = blocks.filter((b) => b.component !== 'Composicion');
  const summary =
    steps === 0
      ? 'Todo visible al abrir la lámina'
      : `${steps + 1} estados al proyectar · ${steps} ${steps === 1 ? 'clic' : 'clics'} para revelar todo`;
  const drop = (event: React.DragEvent, step: number) => {
    event.preventDefault();
    setOver(null);
    setDragging(false);
    const index = Number(event.dataTransfer.getData('text/plain'));
    if (Number.isInteger(index) && editable) onAssign(index, step);
  };
  return (
    <section className="timeline" aria-label="Pasos de revelado">
      <div className="timeline-head">
        <p className="kicker">Pasos de revelado</p>
        <span className="muted small">{summary}</span>
        <div
          role="radiogroup"
          aria-label="Cómo se ve la lámina"
          className="segmented"
        >
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'todo'}
            onClick={() => onMode('todo')}
          >
            Ver todo
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={mode === 'proyectar'}
            onClick={() => onMode('proyectar')}
          >
            Como se proyecta
          </button>
        </div>
      </div>
      <div className="timeline-cols">
        {Array.from({ length: steps + 1 }, (_, n) => {
          const here = own.filter((b) => b.step === n);
          const inner = own.filter(
            (b) => b.step !== n && b.innerSteps.includes(n),
          );
          const empty = here.length + inner.length === 0;
          return (
            <div
              key={n}
              className={[
                'timeline-col',
                n === view ? 'is-active' : '',
                over === n ? 'is-over' : '',
                n > 0 && empty ? 'is-empty-step' : '',
              ].join(' ')}
              onDragOver={(event) => {
                if (!editable) return;
                event.preventDefault();
                setOver(n);
              }}
              onDragLeave={() => setOver((now) => (now === n ? null : now))}
              onDrop={(event) => drop(event, n)}
            >
              <button
                type="button"
                className="timeline-col-head"
                aria-pressed={n === view}
                onClick={() => onView(n)}
              >
                <b>{n === 0 ? 'Inicial' : `Paso ${n}`}</b>
                <span>
                  {here.length + inner.length}{' '}
                  {here.length + inner.length === 1 ? 'bloque' : 'bloques'}
                </span>
              </button>
              {n > 0 && editable && !compact && (
                <button
                  type="button"
                  className="timeline-remove"
                  aria-label={`Quitar paso ${n}`}
                  title={`Quitar paso ${n}: sus bloques pasan al paso anterior`}
                  onClick={() => onRemove(n)}
                >
                  <X size={14} aria-hidden="true" />
                </button>
              )}
              {n > 0 && editable && compact && (
                <span className="timeline-remove">
                  <Menu
                    label={`Opciones del paso ${n}`}
                    className="timeline-more"
                    entries={[
                      {
                        key: 'quitar',
                        label: `Quitar paso ${n}`,
                        hint: 'Sus bloques pasan al paso anterior',
                        danger: true,
                        onSelect: () => onRemove(n),
                      },
                    ]}
                  >
                    <Ellipsis size={16} aria-hidden="true" />
                  </Menu>
                </span>
              )}
              <ul>
                {here.map((block) => (
                  <li key={block.index}>
                    {compact ? (
                      <Menu
                        label={`Mover «${block.summary}»`}
                        className={`timeline-chip ${block.index === selected ? 'is-selected' : ''}`}
                        entries={[
                          {
                            key: 'elegir',
                            label: 'Elegir en la lámina',
                            onSelect: () => onSelect(block.index),
                          },
                          ...Array.from({ length: steps + 1 }, (_, to) => to)
                            .filter((to) => to !== block.step)
                            .map((to) => ({
                              key: `a-${to}`,
                              label: `Mover a ${to === 0 ? 'Inicial' : `Paso ${to}`}`,
                              disabled: !editable || block.inherited,
                              onSelect: () => onAssign(block.index, to),
                            })),
                        ]}
                      >
                        <span>
                          <b>{block.label}</b> · {block.summary}
                        </span>
                      </Menu>
                    ) : (
                      <button
                        type="button"
                        className={`timeline-chip ${block.index === selected ? 'is-selected' : ''}`}
                        draggable={editable && !block.inherited}
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            'text/plain',
                            String(block.index),
                          );
                          event.dataTransfer.effectAllowed = 'move';
                          setDragging(true);
                        }}
                        onDragEnd={() => {
                          setDragging(false);
                          setOver(null);
                        }}
                        onClick={() => onSelect(block.index)}
                      >
                        <GripVertical size={14} aria-hidden="true" />
                        <span>
                          <b>{block.label}</b> · {block.summary}
                        </span>
                      </button>
                    )}
                  </li>
                ))}
                {inner.map((block) => (
                  <li key={`inner-${block.index}`}>
                    <span className="timeline-inner">
                      {block.label} · parte de él
                    </span>
                  </li>
                ))}
              </ul>
              {editable && (
                <button
                  type="button"
                  className="timeline-here"
                  onClick={() => onAddHere(n)}
                >
                  + Agregar aquí
                </button>
              )}
              {empty && (
                <p className="timeline-hint">
                  {n === 0
                    ? 'Nada visible al abrir'
                    : dragging
                      ? 'Suelta aquí el bloque'
                      : 'Arrastra aquí un bloque de la lámina'}
                </p>
              )}
            </div>
          );
        })}
        <button
          type="button"
          className="timeline-add"
          disabled={!editable || steps >= 12}
          onClick={onAdd}
        >
          + Paso
        </button>
      </div>
    </section>
  );
}
