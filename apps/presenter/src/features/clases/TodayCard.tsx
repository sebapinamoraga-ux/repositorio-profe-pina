import { Play } from 'lucide-react';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import { useAula } from '../../store/AulaProvider';
import { deckFor } from '../../store/deck';
import { pendingNotes } from '../../store/teacher';
import { Button } from '../../ui/Button';

const MARK_LABEL = {
  lista: 'lista',
  'en-preparacion': 'en preparación',
  'por-preparar': 'por preparar',
} as const;

/** La clase de hoy (la última abierta) a un toque, al tope de Clases. */
export function TodayCard({ onNavigate }: { onNavigate: Navigate }) {
  const { data } = useAula();
  const content = useContent();
  const entry = content.library.entries.find((item) => item.id === data.lessonId);
  if (!entry) return null;
  const { meta, slides } = deckFor(content, entry.id);
  const notes = pendingNotes(data, entry.id).length;
  const details = [
    `${meta.duration} minutos`,
    `${slides.length} ${slides.length === 1 ? 'lámina' : 'láminas'}`,
    notes ? `${notes} ${notes === 1 ? 'comentario pendiente' : 'comentarios pendientes'}` : '',
  ].filter(Boolean);
  return (
    <section aria-label="Clase de hoy" className="today-card">
      <div className="today-card-copy">
        <p className="kicker">Clase de hoy · {MARK_LABEL[entry.status]}</p>
        <h2>{meta.title}</h2>
        {meta.objectives[0] && <p className="today-card-objective">{meta.objectives[0]}</p>}
        <p className="muted small">
          {details.join(' · ')}. Para cambiarla, abre otra clase de la lista.
        </p>
      </div>
      <div className="today-card-actions">
        <Button variant="primary" onClick={() => onNavigate('clase', { lesson: entry.id })}>
          Abrir la clase
        </Button>
        <Button
          variant="present"
          disabled={!slides.length}
          onClick={() => onNavigate('presentar', { lesson: entry.id })}
        >
          <Play size={16} aria-hidden="true" />
          Presentar
        </Button>
      </div>
    </section>
  );
}
