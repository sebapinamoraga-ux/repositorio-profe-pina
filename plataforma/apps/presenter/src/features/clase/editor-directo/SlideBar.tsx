import {
  Code,
  Copy,
  CopyPlus,
  Ellipsis,
  Keyboard,
  Trash2,
  X,
} from 'lucide-react';
import {
  MOMENT_NAMES,
  PHASE_OF_MOMENT,
  phaseSchema,
  videoMomentSchema,
} from '@aula/content-model';
import { PHASE_NAMES } from '../../../store/deck';
import type { EditedSlide } from '../../../store/schema';
import { Menu, SplitButton } from '../../../ui/Menu';
import { LAYOUTS } from './shared';

/**
 * Barra de la lámina: número, título, momento y diseño, duplicar y el menú ⋯ (vista avanzada,
 * atajos y eliminar).
 */
export function SlideBar({
  slide,
  number,
  video,
  editable,
  canRemove,
  advanced,
  onUpdate,
  onDuplicate,
  onVariant,
  onRemove,
  onAdvanced,
  onShortcuts,
}: {
  slide: EditedSlide;
  number: string;
  video: boolean;
  editable: boolean;
  canRemove: boolean;
  advanced: boolean;
  onUpdate: (patch: Partial<EditedSlide>) => void;
  onDuplicate: () => void;
  /** Abre «Con otros números…»; null si la lámina no se puede leer por bloques. */
  onVariant: (() => void) | null;
  onRemove: () => void;
  onAdvanced: (open: boolean) => void;
  onShortcuts: () => void;
}) {
  return (
    <div className="slide-bar">
      <span className="slide-bar-n" aria-label={`Lámina ${number}`}>
        Lámina {number}
      </span>
      <input
        className={`slide-bar-title ${slide.title.trim() ? '' : 'is-empty'}`}
        aria-label="Título de la lámina"
        value={slide.title}
        disabled={!editable}
        onChange={(event) => onUpdate({ title: event.target.value })}
      />
      <select
        className="slide-bar-select"
        aria-label="Momento"
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
      <select
        className="slide-bar-select"
        aria-label="Diseño"
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
      {video && (
        <select
          className="slide-bar-select"
          aria-label="Momento del video"
          value={slide.momento ?? ''}
          disabled={!editable}
          onChange={(event) => {
            const momento = videoMomentSchema.safeParse(event.target.value);
            // El momento decide la fase, como exige content:check.
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
      )}
      <span className="slide-bar-sep" aria-hidden="true" />
      <SplitButton
        main={{
          disabled: !editable,
          onClick: onDuplicate,
          label: (
            <>
              <Copy size={16} aria-hidden="true" />
              Duplicar
            </>
          ),
        }}
        arrowLabel="Otras formas de duplicar"
        entries={[
          {
            key: 'igual',
            label: 'Copia igual',
            hint: 'Queda a continuación',
            icon: <Copy size={16} />,
            aside: 'Ctrl D',
            disabled: !editable,
            onSelect: onDuplicate,
          },
          {
            key: 'otros',
            label: 'Con otros números…',
            hint: 'Cambia los datos, conserva el desarrollo',
            icon: <CopyPlus size={16} />,
            disabled: !editable || !onVariant,
            onSelect: () => onVariant?.(),
          },
        ]}
      />
      {advanced && (
        <button
          type="button"
          className="slide-bar-advanced"
          onClick={() => onAdvanced(false)}
        >
          Avanzado
          <X size={14} aria-hidden="true" />
        </button>
      )}
      <Menu
        label="Más acciones de la lámina"
        className="slide-bar-more menu-trigger"
        entries={[
          {
            key: 'avanzada',
            label: 'Vista avanzada',
            hint: 'Código e identificador de la lámina',
            icon: <Code size={16} />,
            ...(advanced ? { aside: 'Activa' } : {}),
            onSelect: () => onAdvanced(!advanced),
          },
          {
            key: 'atajos',
            label: 'Atajos de teclado',
            icon: <Keyboard size={16} />,
            aside: '?',
            onSelect: onShortcuts,
          },
          'separator',
          {
            key: 'eliminar',
            label: 'Eliminar lámina',
            icon: <Trash2 size={16} />,
            danger: true,
            disabled: !editable || !canRemove,
            onSelect: onRemove,
          },
        ]}
      >
        <Ellipsis size={18} aria-hidden="true" />
      </Menu>
    </div>
  );
}
