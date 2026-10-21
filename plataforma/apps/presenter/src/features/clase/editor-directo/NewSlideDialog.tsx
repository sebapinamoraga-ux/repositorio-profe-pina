import { useMemo, useState } from 'react';
import { CopyPlus, X } from 'lucide-react';
import { mascotGallery } from '../../../app/gallery';
import { blankSlide, type BlankLayout } from '../../../store/deck';
import { IconButton } from '../../../ui/Button';
import { Modal } from '../../../ui/Modal';
import { TemplateSlide } from '../../recursos/MascotGallery';
import { extractBlocks } from '../editor/blocks';
import { PRESENCE } from './shared';

const BLANKS: [BlankLayout, string, string][] = [
  ['portada', 'Portada', 'Abre la clase con su objetivo.'],
  ['concepto', 'Concepto', 'Una idea central con su definición.'],
  ['dos-columnas', 'Dos columnas', 'Dos ideas lado a lado.'],
  [
    'resolucion',
    'Resolución',
    'Enunciado, desarrollo y resultado que se revelan por pasos.',
  ],
  ['ejercicio', 'Ejercicio', 'Una consigna individual y su respuesta.'],
];

/** Bloques y pasos que trae cada diseño en blanco: «Tarjeta · P1». */
function chipsOf(layout: BlankLayout) {
  const model = extractBlocks(blankSlide(layout, 'muestra').body);
  return model.ok ? model.blocks.map((b) => `${b.label} · P${b.step}`) : [];
}

type Filter = 'todas' | keyof typeof PRESENCE;

/**
 * «Nueva lámina»: un diseño en blanco, la copia de la lámina actual o una plantilla con mascota.
 */
export function NewSlideDialog({
  number,
  where,
  duplicateOf,
  repaso,
  onBlank,
  onDuplicate,
  onTemplate,
  onClose,
}: {
  /** Número de la lámina nueva: 06, R3… */
  number: string;
  /** «3 · Ceros por factorización», si la clase tiene tramos. */
  where: string | null;
  /** Número de la lámina que se puede duplicar. */
  duplicateOf: string | null;
  repaso: boolean;
  onBlank: (layout: BlankLayout) => void;
  onDuplicate: () => void;
  onTemplate: (templateId: string) => void;
  onClose: () => void;
}) {
  const [filter, setFilter] = useState<Filter>('todas');
  const chips = useMemo(
    () =>
      Object.fromEntries(BLANKS.map(([layout]) => [layout, chipsOf(layout)])),
    [],
  );
  const templates = mascotGallery.templates;
  const count = (level: Filter) =>
    level === 'todas'
      ? templates.length
      : templates.filter((t) => t.mascot.nivel === level).length;
  const shown = templates.filter(
    (t) => filter === 'todas' || t.mascot.nivel === filter,
  );
  return (
    <Modal
      label={repaso ? 'Nueva lámina de repaso' : 'Nueva lámina'}
      onClose={onClose}
      className="picker new-slide-dialog"
    >
      <div className="modal-head">
        <div>
          <p className="kicker">
            {repaso ? 'Nueva lámina de repaso' : 'Nueva lámina'} {number}
          </p>
          <h2>¿Cómo quieres empezar?</h2>
          {where && (
            <p className="muted small">
              Se agrega en el tramo {where}. Después puedes arrastrarla a otro
              lugar.
            </p>
          )}
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <h3 className="picker-sub">En blanco, según el diseño</h3>
      <div className="blank-grid">
        {BLANKS.map(([layout, title, text]) => (
          <button
            key={layout}
            type="button"
            className="blank-card"
            onClick={() => onBlank(layout)}
          >
            <b>{title}</b>
            <span>{text}</span>
            <span className="blank-chips">
              {chips[layout]?.map((chip, k) => (
                <small key={`${chip}-${k}`}>{chip}</small>
              ))}
            </span>
          </button>
        ))}
        {duplicateOf && (
          <button
            type="button"
            className="blank-card is-duplicate"
            onClick={onDuplicate}
          >
            <b>
              <CopyPlus size={16} aria-hidden="true" /> Duplicar la lámina{' '}
              {duplicateOf}
            </b>
            <span>Parte de una copia y cámbiala.</span>
          </button>
        )}
      </div>
      <h3 className="picker-sub">Plantillas con mascota</h3>
      <div
        role="radiogroup"
        aria-label="Presencia de la mascota"
        className="pill-group"
      >
        {(['todas', 'sutil', 'pedagogica', 'marca'] as const).map((level) => (
          <button
            key={level}
            type="button"
            role="radio"
            aria-checked={filter === level}
            className="pill pill-small"
            onClick={() => setFilter(level)}
          >
            {level === 'todas' ? 'Todas' : PRESENCE[level]} {count(level)}
          </button>
        ))}
      </div>
      <div className="picker-grid">
        {shown.map((template) => (
          <button
            key={template.id}
            type="button"
            className="picker-card"
            onClick={() => onTemplate(template.id)}
          >
            <TemplateSlide template={template} compact />
            <span>
              <b>{template.title}</b>
              <span>
                {template.slideType} · {PRESENCE[template.mascot.nivel]}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Modal>
  );
}
