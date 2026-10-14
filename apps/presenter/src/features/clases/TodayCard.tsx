import { Play } from 'lucide-react';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import { formatPlanDate } from '../../content/library';
import { useAula } from '../../store/AulaProvider';
import { deckFor } from '../../store/deck';
import { pendingNotes } from '../../store/teacher';
import { Button } from '../../ui/Button';
import { CURRENT_LABEL, useCurrentLesson } from './current';

const MARK_LABEL = {
  lista: 'lista',
  'en-preparacion': 'en preparación',
  'por-preparar': 'por preparar',
} as const;

/** La clase actual (la de hoy, la próxima o la última abierta) a un toque, al tope de Clases. */
export function TodayCard({ onNavigate }: { onNavigate: Navigate }) {
  const { data } = useAula();
  const content = useContent();
  const current = useCurrentLesson();
  const entry = content.library.entries.find((item) => item.id === current?.id);
  if (!entry || !current) return null;
  const { meta, slides } = deckFor(content, entry.id);
  const notes = pendingNotes(data, entry.id).length;
  // Con varias bibliotecas, la clase de hoy puede venir de cualquiera: se dice de cuál.
  const libraries = content.library.libraries;
  const from =
    libraries.length > 1 ? libraries.find((item) => item.id === entry.libraryId)?.title : undefined;
  const details = [
    current.reason !== 'hoy' && entry.date ? formatPlanDate(entry.date) : '',
    `${meta.duration} minutos`,
    `${slides.length} ${slides.length === 1 ? 'lámina' : 'láminas'}`,
    notes ? `${notes} ${notes === 1 ? 'comentario pendiente' : 'comentarios pendientes'}` : '',
  ].filter(Boolean);
  return (
    <section aria-label={CURRENT_LABEL[current.reason]} className="today-card">
      <div className="today-card-copy">
        <p className="kicker">
          {CURRENT_LABEL[current.reason]} · {from ? `${from} · ` : ''}
          {MARK_LABEL[entry.status]}
        </p>
        <h2>{meta.title}</h2>
        {meta.objectives[0] && <p className="today-card-objective">{meta.objectives[0]}</p>}
        <p className="muted small">
          {details.join(' · ')}.{' '}
          {current.reason === 'ultima'
            ? 'Agrega fechas a la planificación para que aparezca la clase del día.'
            : 'Sale de la fecha de la planificación.'}
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
