import { useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronRight,
  Code,
  Columns2,
  Copy,
  Ellipsis,
  ListChecks,
  MessageSquare,
  MessageSquarePlus,
  Play,
  Plus,
  ScanSearch,
  Sigma,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import {
  MOMENT_NAMES,
  PHASE_OF_MOMENT,
  phaseSchema,
  videoMomentSchema,
} from '@aula/content-model';
import type { Tramo } from '../../../content/ops';
import { PHASE_NAMES } from '../../../store/deck';
import type { EditedSlide } from '../../../store/schema';
import { Button } from '../../../ui/Button';
import { Menu } from '../../../ui/Menu';
import { Sheet } from '../../../ui/Sheet';
import type { Block } from '../editor/blocks';
import { FAMILIES, type Family } from './block-templates';
import type { InsertKind } from './InsertBar';
import { LAYOUTS } from './shared';

/** Celular: barra de la lámina abierta (volver a la lista, número, título y «Datos y acciones»). */
export function PhoneHeader({
  number,
  title,
  onBack,
  onActions,
}: {
  number: string;
  title: string;
  onBack: () => void;
  onActions: () => void;
}) {
  return (
    <div className="phone-head">
      <button type="button" className="phone-back" onClick={onBack}>
        <ArrowLeft size={18} aria-hidden="true" />
        Láminas
      </button>
      <span className="slide-bar-n" aria-label={`Lámina ${number}`}>
        {number}
      </span>
      <b className="phone-title">{title}</b>
      <button
        type="button"
        className="phone-more"
        aria-label="Datos y acciones de la lámina"
        onClick={onActions}
      >
        <Ellipsis size={22} aria-hidden="true" />
      </button>
    </div>
  );
}

/** Celular: el paso que se ve, en lugar de la línea de tiempo. */
export function PhoneSteps({
  steps,
  view,
  editable,
  onView,
  onAdd,
  onRemove,
}: {
  steps: number;
  view: number;
  editable: boolean;
  onView: (step: number) => void;
  onAdd: () => void;
  onRemove: (step: number) => void;
}) {
  return (
    <div className="phone-steps" role="group" aria-label="Pasos de revelado">
      <div className="phone-steps-pills">
        {Array.from({ length: steps + 1 }, (_, n) => (
          <button
            key={n}
            type="button"
            className="pill"
            aria-pressed={n === view}
            onClick={() => onView(n)}
          >
            {n === 0 ? 'Inicial' : `Paso ${n}`}
          </button>
        ))}
        <button
          type="button"
          className="pill"
          disabled={!editable || steps >= 12}
          onClick={onAdd}
        >
          + Paso
        </button>
      </div>
      {view > 0 && editable && (
        <Menu
          label={`Opciones del paso ${view}`}
          className="phone-more"
          entries={[
            {
              key: 'quitar',
              label: `Quitar paso ${view}`,
              hint: 'Sus bloques pasan al paso anterior',
              danger: true,
              onSelect: () => onRemove(view),
            },
          ]}
        >
          <Ellipsis size={20} aria-hidden="true" />
        </Menu>
      )}
    </div>
  );
}

/** Celular: los bloques de la lámina en lista; tocar uno lo abre para escribir. */
export function PhoneBlocks({
  blocks,
  steps,
  editable,
  marks,
  onOpen,
  onMove,
  onStep,
  onDuplicate,
  onRemove,
  onComment,
  onInsert,
}: {
  blocks: readonly Block[];
  steps: number;
  editable: boolean;
  marks: ReadonlyMap<number, { count: number; first: string }>;
  onOpen: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onStep: (index: number, step: number) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onComment: (index: number) => void;
  onInsert: () => void;
}) {
  return (
    <section className="phone-blocks" aria-label="Bloques de la lámina">
      <div className="phone-blocks-head">
        <p className="kicker">Bloques</p>
        <Button size="sm" disabled={!editable} onClick={onInsert}>
          <Plus size={16} aria-hidden="true" />
          Insertar
        </Button>
      </div>
      {blocks.length === 0 && (
        <p className="muted small">Lámina vacía. Inserta un bloque.</p>
      )}
      <ul>
        {blocks.map((block, k) => {
          const mark = marks.get(block.index);
          const locked = !editable || block.component === 'Composicion';
          return (
            <li key={block.index} className="phone-block">
              <button
                type="button"
                className="phone-block-main"
                onClick={() => onOpen(block.index)}
              >
                <span className="phone-block-copy">
                  <b>{block.label}</b>
                  <span>{block.summary}</span>
                </span>
                <span className="phone-block-tags">
                  {block.step > 0 && <small>Paso {block.step}</small>}
                  {mark && <small className="is-note">{mark.count} com.</small>}
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </button>
              <Menu
                label={`Más sobre «${block.summary}»`}
                className="phone-more"
                entries={[
                  {
                    key: 'comentar',
                    label: 'Comentar',
                    icon: <MessageSquarePlus size={16} />,
                    onSelect: () => onComment(block.index),
                  },
                  {
                    key: 'subir',
                    label: 'Subir',
                    icon: <ArrowUp size={16} />,
                    disabled: locked || k === 0,
                    onSelect: () => onMove(block.index, -1),
                  },
                  {
                    key: 'bajar',
                    label: 'Bajar',
                    icon: <ArrowDown size={16} />,
                    disabled: locked || k === blocks.length - 1,
                    onSelect: () => onMove(block.index, 1),
                  },
                  ...Array.from({ length: steps + 1 }, (_, to) => to)
                    .filter((to) => to !== block.step)
                    .map((to) => ({
                      key: `a-${to}`,
                      label: `Mover a ${to === 0 ? 'Inicial' : `Paso ${to}`}`,
                      disabled: locked || block.inherited,
                      onSelect: () => onStep(block.index, to),
                    })),
                  'separator' as const,
                  {
                    key: 'duplicar',
                    label: 'Duplicar',
                    icon: <Copy size={16} />,
                    disabled: locked || block.component === 'MascotaProfePina',
                    onSelect: () => onDuplicate(block.index),
                  },
                  {
                    key: 'eliminar',
                    label: 'Eliminar',
                    icon: <Trash2 size={16} />,
                    danger: true,
                    disabled: locked,
                    onSelect: () => onRemove(block.index),
                  },
                ]}
              >
                <Ellipsis size={20} aria-hidden="true" />
              </Menu>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Celular: hoja «Insertar bloque». */
export function InsertSheet({
  canAskQuestion,
  where,
  onInsert,
  onFamily,
  onClose,
}: {
  canAskQuestion: boolean;
  where: string;
  onInsert: (kind: InsertKind) => void;
  onFamily: (family: Family) => void;
  onClose: () => void;
}) {
  const items: [InsertKind, string, typeof Type][] = [
    ['texto', 'Texto', Type],
    ['formula', 'Fórmula', Sigma],
    ['tarjeta', 'Tarjeta', Square],
    ['paneles', 'Paneles', Columns2],
    ['pregunta', 'Pregunta', ListChecks],
  ];
  return (
    <Sheet label="Insertar bloque" size="tall" onClose={onClose}>
      <p className="muted small">Se inserta {where}</p>
      <div className="insert-grid">
        {items.map(([kind, label, Icon]) => (
          <button
            key={kind}
            type="button"
            className="insert-tile"
            disabled={kind === 'pregunta' && !canAskQuestion}
            onClick={() => {
              onClose();
              onInsert(kind);
            }}
          >
            <Icon size={20} aria-hidden="true" />
            {label}
          </button>
        ))}
      </div>
      <p className="kicker">Por función</p>
      <div className="insert-grid">
        {FAMILIES.map((family) => (
          <button
            key={family.key}
            type="button"
            className="insert-tile"
            onClick={() => {
              onClose();
              onFamily(family);
            }}
          >
            <i
              className={`family-swatch tone-${family.tone}`}
              aria-hidden="true"
            />
            {family.label}
          </button>
        ))}
      </div>
    </Sheet>
  );
}

/** Celular: «Datos y acciones» de la lámina. */
export function ActionsSheet({
  slide,
  number,
  video,
  editable,
  canRemove,
  tramos,
  currentTramo,
  onUpdate,
  onDuplicate,
  onVariant,
  onMoveToTramo,
  onReview,
  onAdvanced,
  onPresent,
  onRemove,
  onClose,
}: {
  slide: EditedSlide;
  number: string;
  video: boolean;
  editable: boolean;
  canRemove: boolean;
  tramos: readonly Tramo[] | null;
  currentTramo: number;
  onUpdate: (patch: Partial<EditedSlide>) => void;
  onDuplicate: () => void;
  onVariant: (() => void) | null;
  onMoveToTramo: (tramo: number) => void;
  onReview: () => void;
  onAdvanced: () => void;
  onPresent: () => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const [moving, setMoving] = useState(false);
  const act = (run: () => void) => () => {
    onClose();
    run();
  };
  return (
    <Sheet
      label="Datos y acciones"
      title={`Lámina ${number}`}
      size="tall"
      onClose={onClose}
    >
      <label className="field">
        Título
        <input
          value={slide.title}
          disabled={!editable}
          onChange={(event) => onUpdate({ title: event.target.value })}
        />
      </label>
      <div className="two-cols">
        <label className="field">
          Momento
          <select
            value={slide.phase}
            disabled={!editable}
            onChange={(event) => {
              const phase = phaseSchema.safeParse(event.target.value);
              if (phase.success) onUpdate({ phase: phase.data });
            }}
          >
            {Object.entries(PHASE_NAMES).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Diseño
          <select
            value={slide.layout}
            disabled={!editable}
            onChange={(event) => {
              const found = LAYOUTS.find(([key]) => key === event.target.value);
              if (found) onUpdate({ layout: found[0] });
            }}
          >
            {LAYOUTS.map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {video && (
        <label className="field">
          Momento del video
          <select
            value={slide.momento ?? ''}
            disabled={!editable}
            onChange={(event) => {
              const momento = videoMomentSchema.safeParse(event.target.value);
              if (momento.success)
                onUpdate({
                  momento: momento.data,
                  phase: PHASE_OF_MOMENT[momento.data],
                });
            }}
          >
            {!slide.momento && <option value="">Sin momento</option>}
            {videoMomentSchema.options.map((key) => (
              <option key={key} value={key}>
                {MOMENT_NAMES[key]}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="sheet-actions">
        <Button disabled={!editable} onClick={act(onDuplicate)}>
          <Copy size={18} aria-hidden="true" />
          Duplicar lámina
        </Button>
        <Button
          disabled={!editable || !onVariant}
          onClick={act(() => onVariant?.())}
        >
          <ScanSearch size={18} aria-hidden="true" />
          Duplicar con otros números…
        </Button>
        {tramos && (
          <>
            <Button
              aria-expanded={moving}
              disabled={!editable}
              onClick={() => setMoving((now) => !now)}
            >
              <ChevronRight size={18} aria-hidden="true" />
              Mover a otro tramo…
            </Button>
            {moving && (
              <select
                aria-label="Mover la lámina al final de un tramo"
                value=""
                onChange={(event) => {
                  if (event.target.value === '') return;
                  const to = Number(event.target.value);
                  onClose();
                  onMoveToTramo(to);
                }}
              >
                <option value="">Elige un tramo…</option>
                {tramos.map((tramo, k) => (
                  <option key={k} value={k} disabled={k === currentTramo}>
                    {k + 1}. {tramo.label}
                  </option>
                ))}
              </select>
            )}
          </>
        )}
        <Button onClick={act(onReview)}>
          <MessageSquare size={18} aria-hidden="true" />
          Comentarios y revisión
        </Button>
        <Button onClick={act(onAdvanced)}>
          <Code size={18} aria-hidden="true" />
          Avanzado · MDX
        </Button>
        <Button onClick={act(onPresent)}>
          <Play size={18} aria-hidden="true" />
          Presentar desde aquí
        </Button>
        <Button
          variant="danger"
          disabled={!editable || !canRemove}
          onClick={act(onRemove)}
        >
          <Trash2 size={18} aria-hidden="true" />
          Eliminar lámina
        </Button>
      </div>
    </Sheet>
  );
}
