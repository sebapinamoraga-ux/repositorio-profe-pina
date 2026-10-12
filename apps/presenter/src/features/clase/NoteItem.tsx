import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { useAula } from '../../store/AulaProvider';
import type { Note } from '../../store/schema';
import { Button, IconButton } from '../../ui/Button';
import { useUi } from '../../ui/UiProvider';

const SOURCE_LABEL: Record<Note['source'], string> = {
  presentador: 'durante la clase',
  cierre: 'al cerrar la clase',
  editor: 'en el editor',
};

/** Marcar como aplicado, reabrir y eliminar con deshacer. */
export function useNoteActions() {
  const { dispatch, snap } = useAula();
  const ui = useUi();
  return (note: Note) => ({
    onToggle: () =>
      dispatch({
        type: 'updateNote',
        id: note.id,
        patch: { status: note.status === 'pendiente' ? 'aplicado' : 'pendiente' },
      }),
    onRemove: () => {
      const undo = snap(['notes']);
      dispatch({ type: 'removeNote', id: note.id });
      ui.toast('Comentario eliminado', undo);
    },
  });
}

export function NoteItem({
  note,
  extra,
  heading,
  onToggle,
  onRemove,
}: {
  note: Note;
  extra?: string;
  /** Dónde está el comentario (p. ej., un enlace a su lámina). */
  heading?: ReactNode;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const done = note.status === 'aplicado';
  const meta = [
    extra,
    note.date.split('-').reverse().slice(0, 2).join('-'),
    note.course,
    SOURCE_LABEL[note.source],
  ]
    .filter(Boolean)
    .join(' · ');
  return (
    <li className={`note-item ${done ? 'is-done' : ''}`}>
      {heading && <div className="note-heading">{heading}</div>}
      <p>{note.text}</p>
      <div className="note-item-foot">
        <span>{meta}</span>
        <Button size="sm" onClick={onToggle}>
          {done ? 'Reabrir' : 'Marcar como aplicado'}
        </Button>
        <IconButton danger label="Eliminar comentario" onClick={onRemove}>
          <Trash2 size={18} aria-hidden="true" />
        </IconButton>
      </div>
    </li>
  );
}
