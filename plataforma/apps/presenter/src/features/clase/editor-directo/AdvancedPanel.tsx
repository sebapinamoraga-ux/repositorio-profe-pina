import { useState } from 'react';
import { X } from 'lucide-react';
import { toMdx } from '../../../store/deck';
import type { EditedSlide } from '../../../store/schema';
import { Button, buttonClass, IconButton } from '../../../ui/Button';
import { SLIDE_ID } from './shared';

/** Identificador de lámina: se edita libre y se aplica al salir del campo si es válido y único. */
function SlideIdField({
  value,
  taken,
  disabled,
  onCommit,
}: {
  value: string;
  taken: readonly string[];
  disabled: boolean;
  onCommit: (id: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? value;
  const problem =
    draft === null || draft === value
      ? null
      : !SLIDE_ID.test(draft)
        ? 'Usa minúsculas, números y guiones.'
        : taken.includes(draft)
          ? 'Ya hay una lámina con ese identificador.'
          : null;
  const commit = () => {
    if (draft !== null && draft !== value && !problem) onCommit(draft);
    setDraft(null);
  };
  return (
    <label className="field">
      Identificador
      <input
        className="mono"
        value={text}
        disabled={disabled}
        aria-invalid={problem ? true : undefined}
        onChange={(event) =>
          setDraft(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))
        }
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit();
          if (event.key === 'Escape') setDraft(null);
        }}
      />
      {problem && <span className="field-note text-error">{problem}</span>}
    </label>
  );
}

/**
 * Vista avanzada de una lámina (panel lateral): identificador, MDX editable (también es la vía
 * para láminas que el editor no interpreta), descarga y descartar cambios.
 */
export function AdvancedPanel({
  slide,
  number,
  taken,
  editable,
  slideChanged,
  lessonChanged,
  onRename,
  onBody,
  onDiscardSlide,
  onDiscardLesson,
  onClose,
}: {
  slide: EditedSlide;
  number: string;
  taken: readonly string[];
  editable: boolean;
  slideChanged: boolean;
  lessonChanged: boolean;
  onRename: (id: string) => void;
  onBody: (body: string) => void;
  onDiscardSlide: () => void;
  onDiscardLesson: () => void;
  onClose: () => void;
}) {
  return (
    <section
      aria-label="Vista avanzada de la lámina"
      className="advanced-panel"
    >
      <div className="advanced-head">
        <div>
          <p className="kicker">Avanzado</p>
          <h2>Lámina {number}</h2>
        </div>
        <IconButton label="Cerrar la vista avanzada" onClick={onClose}>
          <X size={20} aria-hidden="true" />
        </IconButton>
      </div>
      <SlideIdField
        key={slide.id}
        value={slide.id}
        taken={taken}
        disabled={!editable}
        onCommit={onRename}
      />
      <label className="field">
        MDX de la lámina
        <textarea
          className="mono"
          rows={16}
          value={slide.body}
          disabled={!editable}
          onChange={(event) => onBody(event.target.value)}
        />
      </label>
      <div className="advanced-actions">
        <a
          className={buttonClass({ variant: 'primary' })}
          download={`${slide.id}.mdx`}
          href={`data:text/plain;charset=utf-8,${encodeURIComponent(toMdx(slide))}`}
        >
          Descargar .mdx
        </a>
        {slideChanged && (
          <Button onClick={onDiscardSlide}>
            Descartar cambios de esta lámina
          </Button>
        )}
        {lessonChanged && (
          <Button onClick={onDiscardLesson}>
            Descartar cambios de esta clase
          </Button>
        )}
      </div>
      <p className="muted small">
        Los cambios quedan pendientes en este navegador hasta que los publiques.
      </p>
    </section>
  );
}
