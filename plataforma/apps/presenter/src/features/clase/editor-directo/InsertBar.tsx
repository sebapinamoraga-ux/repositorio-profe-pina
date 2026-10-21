import {
  ChevronDown,
  Columns2,
  ListChecks,
  Sigma,
  Square,
  Type,
} from 'lucide-react';
import { usePopover } from '../../../ui/Menu';
import { FAMILIES, type Family } from './block-templates';

export type InsertKind =
  | 'texto'
  | 'formula'
  | 'tarjeta'
  | 'paneles'
  | 'pregunta';

/**
 * Barra Insertar: bloques sueltos y, en «Por función», los de cada función pedagógica. Se
 * inserta después del bloque elegido y en su paso (o al final, en el paso que se ve).
 */
export function InsertBar({
  enabled,
  where,
  canAskQuestion,
  onInsert,
  onFamily,
  onPanel,
}: {
  enabled: boolean;
  /** «después de «Sumar elimina…», en Paso 1». */
  where: string;
  /** Hay actividades del banco para la pregunta. */
  canAskQuestion: boolean;
  onInsert: (kind: InsertKind) => void;
  onFamily: (family: Family) => void;
  /** Abre el panel lateral de comentarios en tabletas; sin uso en escritorio. */
  onPanel?: () => void;
}) {
  const { open, setOpen, close, root, trigger } = usePopover();
  const items: [InsertKind, string, typeof Type][] = [
    ['texto', 'Texto', Type],
    ['formula', 'Fórmula', Sigma],
    ['tarjeta', 'Tarjeta', Square],
    ['paneles', 'Paneles', Columns2],
    ['pregunta', 'Pregunta', ListChecks],
  ];
  return (
    <div
      className={`insert-bar ${enabled ? '' : 'is-off'}`}
      role="toolbar"
      aria-label="Insertar"
    >
      <span className="insert-label">Insertar</span>
      {items.map(([kind, label, Icon]) => (
        <button
          key={kind}
          type="button"
          className="insert-btn"
          disabled={!enabled || (kind === 'pregunta' && !canAskQuestion)}
          title={
            kind === 'pregunta' && !canAskQuestion
              ? 'El banco de actividades no tiene preguntas PAES'
              : undefined
          }
          onClick={() => onInsert(kind)}
        >
          <Icon size={16} aria-hidden="true" />
          {label}
        </button>
      ))}
      <span className="insert-sep" aria-hidden="true" />
      <div className="menu" ref={root}>
        <button
          ref={trigger}
          type="button"
          className="insert-btn"
          aria-haspopup="menu"
          aria-expanded={open}
          disabled={!enabled}
          onClick={() => setOpen(!open)}
        >
          <span className="family-strip" aria-hidden="true">
            {FAMILIES.map((family) => (
              <i key={family.key} className={`tone-${family.tone}`} />
            ))}
          </span>
          Por función
          <ChevronDown size={16} aria-hidden="true" />
        </button>
        {open && (
          <div
            role="menu"
            aria-label="Insertar por función"
            className="menu-list is-left family-menu"
          >
            {FAMILIES.map((family) => (
              <button
                key={family.key}
                type="button"
                role="menuitem"
                className="menu-item"
                onClick={() => {
                  close(true);
                  onFamily(family);
                }}
              >
                <i
                  className={`family-swatch tone-${family.tone}`}
                  aria-hidden="true"
                />
                <span className="menu-text">
                  <span>{family.label}</span>
                  <small>{family.component}</small>
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
      <span className="insert-where" title={`Se inserta ${where}`}>
        Se inserta {where}
      </span>
      {onPanel && (
        <button type="button" className="insert-btn" onClick={onPanel}>
          Comentarios y revisión
        </button>
      )}
    </div>
  );
}
