import type { RefObject } from 'react';
import { Ellipsis } from 'lucide-react';
import { Menu } from '../../../ui/Menu';
import {
  AlignCenter,
  ArrowDown,
  ArrowUp,
  Copy,
  GripVertical,
  MessageSquarePlus,
  Pencil,
  Sigma,
  Trash2,
} from 'lucide-react';
import type { Block } from '../editor/blocks';
import type { FormatApi } from './InlineEditor';

const TONES: [number, string][] = [
  [1, 'agua'],
  [2, 'durazno'],
  [3, 'lila'],
  [4, 'rosa grisáceo'],
];

/**
 * Barra flotante del bloque elegido: paso en que aparece, escribir, comentar, mover, duplicar y
 * eliminar. Mientras se escribe se transforma en la barra de formatos.
 */
export function BlockToolbar({
  block,
  steps,
  editing,
  editable,
  compact = false,
  canMove,
  format,
  onStep,
  onEdit,
  onComment,
  onMove,
  onDuplicate,
  onRemove,
  onDragStart,
  onDone,
}: {
  block: Block;
  steps: number;
  editing: boolean;
  editable: boolean;
  /** Con el dedo: botones de 44 px con nombre y Duplicar y Eliminar bajo «Más». */
  compact?: boolean;
  canMove: { up: boolean; down: boolean };
  format: RefObject<FormatApi | null>;
  onStep: (step: number) => void;
  onEdit: () => void;
  onComment: () => void;
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onDragStart: () => void;
  onDone: () => void;
}) {
  // Los botones de formato no deben quitar la selección del campo de texto.
  const keep = (event: { preventDefault: () => void }) =>
    event.preventDefault();
  const mascot = block.component === 'Composicion';
  const locked = !editable || mascot;
  if (editing)
    return (
      <div
        className="block-toolbar is-editing"
        role="toolbar"
        aria-label="Formato del texto"
      >
        <button
          type="button"
          aria-label="Negrita"
          title="Destacar (Ctrl + B)"
          onMouseDown={keep}
          onClick={() => format.current?.wrap('**', '**')}
        >
          <b>B</b>
        </button>
        <button
          type="button"
          aria-label="Fórmula en línea"
          title="Fórmula en línea (Ctrl + M)"
          onMouseDown={keep}
          onClick={() => format.current?.wrap('$', '$')}
        >
          <Sigma size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Fórmula centrada"
          title="Fórmula centrada"
          onMouseDown={keep}
          onClick={() => format.current?.center()}
        >
          <AlignCenter size={16} aria-hidden="true" />
        </button>
        <span className="toolbar-sep" aria-hidden="true" />
        {TONES.map(([tone, name]) => (
          <button
            key={tone}
            type="button"
            className={`tone-swatch tone-${tone}`}
            aria-label={`Asociación ${tone} · ${name}`}
            title={`Asociación ${tone} · ${name}`}
            onMouseDown={keep}
            onClick={() =>
              format.current?.wrap(
                `<Asociacion tono={${tone}}>`,
                '</Asociacion>',
              )
            }
          />
        ))}
        <span className="toolbar-sep" aria-hidden="true" />
        <button type="button" className="toolbar-done" onClick={onDone}>
          Listo
        </button>
      </div>
    );
  return (
    <div
      className="block-toolbar"
      role="toolbar"
      aria-label={`Bloque «${block.label}»`}
    >
      <span className="toolbar-type">{block.label}</span>
      <span className="toolbar-sep" aria-hidden="true" />
      <label className="toolbar-step">
        <span className="sr-only">Paso en que aparece</span>
        <select
          aria-label="Paso en que aparece"
          value={block.step}
          disabled={locked || block.inherited}
          title={
            block.inherited
              ? 'Aparece en el paso de su contenedor'
              : 'Paso en que aparece'
          }
          onChange={(event) => onStep(Number(event.target.value))}
        >
          {Array.from({ length: steps + 1 }, (_, n) => (
            <option key={n} value={n}>
              {n === 0 ? 'Inicial' : `Paso ${n}`}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        aria-label="Escribir"
        title="Escribir (doble clic o Enter)"
        disabled={!editable}
        onClick={onEdit}
      >
        <Pencil size={16} aria-hidden="true" />
        Escribir
      </button>
      <button
        type="button"
        aria-label="Comentar"
        title="Comentar"
        onClick={onComment}
      >
        <MessageSquarePlus size={16} aria-hidden="true" />
        Comentar
      </button>
      <span className="toolbar-sep" aria-hidden="true" />
      {!compact && (
        <button
          type="button"
          aria-label="Arrastrar a un paso"
          title="Arrastra a una columna de la línea de pasos"
          className="toolbar-grip"
          draggable={!locked && !block.inherited}
          disabled={locked || block.inherited}
          onDragStart={(event) => {
            event.dataTransfer.setData('text/plain', String(block.index));
            event.dataTransfer.effectAllowed = 'move';
            onDragStart();
          }}
        >
          <GripVertical size={16} aria-hidden="true" />
        </button>
      )}
      <button
        type="button"
        aria-label="Subir"
        title="Subir"
        disabled={locked || !canMove.up}
        onClick={() => onMove(-1)}
      >
        <ArrowUp size={16} aria-hidden="true" />
        {compact && 'Subir'}
      </button>
      <button
        type="button"
        aria-label="Bajar"
        title="Bajar"
        disabled={locked || !canMove.down}
        onClick={() => onMove(1)}
      >
        <ArrowDown size={16} aria-hidden="true" />
        {compact && 'Bajar'}
      </button>
      {compact ? (
        <Menu
          label="Más sobre el bloque"
          className="toolbar-more"
          entries={[
            {
              key: 'duplicar',
              label: 'Duplicar',
              icon: <Copy size={16} />,
              disabled: locked || block.component === 'MascotaProfePina',
              onSelect: onDuplicate,
            },
            {
              key: 'eliminar',
              label: 'Eliminar',
              icon: <Trash2 size={16} />,
              danger: true,
              disabled: locked,
              onSelect: onRemove,
            },
          ]}
        >
          <Ellipsis size={16} aria-hidden="true" />
          Más
        </Menu>
      ) : (
        <>
          <button
            type="button"
            aria-label="Duplicar"
            title="Duplicar"
            disabled={locked || block.component === 'MascotaProfePina'}
            onClick={onDuplicate}
          >
            <Copy size={16} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="is-danger"
            aria-label="Eliminar"
            title="Eliminar bloque (Supr)"
            disabled={locked}
            onClick={onRemove}
          >
            <Trash2 size={16} aria-hidden="true" />
          </button>
        </>
      )}
    </div>
  );
}
