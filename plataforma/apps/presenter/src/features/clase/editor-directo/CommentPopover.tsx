import { useEffect, useRef, useState } from 'react';
import { Button } from '../../../ui/Button';

/** Comentario sobre un bloque: queda pendiente para después, junto a ese bloque. */
export function CommentPopover({
  label,
  onAdd,
  onCancel,
}: {
  label: string;
  onAdd: (text: string) => void;
  onCancel: () => void;
}) {
  const [text, setText] = useState('');
  const field = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    field.current?.focus();
  }, []);
  const add = () => {
    if (text.trim()) onAdd(text);
  };
  return (
    <div
      className="comment-popover"
      role="dialog"
      aria-label={`Comentario sobre «${label}»`}
    >
      <p className="kicker">Comentario sobre «{label}»</p>
      <textarea
        ref={field}
        rows={3}
        aria-label="Comentario"
        placeholder="¿Qué cambiarías? Queda pendiente para después."
        value={text}
        onChange={(event) => setText(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            add();
          }
        }}
      />
      <p className="muted small">Ctrl + Enter para agregar</p>
      <div className="row">
        <Button size="sm" onClick={onCancel}>
          Cancelar
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={!text.trim()}
          onClick={add}
        >
          Agregar comentario
        </Button>
      </div>
    </div>
  );
}
