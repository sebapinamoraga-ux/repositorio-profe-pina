import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useViewportWidth } from '../../app/route';
import type { Navigate } from '../../app/routes';
import { useContent } from '../../content/ContentProvider';
import { useAula } from '../../store/AulaProvider';
import { deckFor, pad2 } from '../../store/deck';
import { nowParts, pendingNotes } from '../../store/teacher';
import { Button } from '../../ui/Button';
import { Card } from '../../ui/Layout';

/** Resumen de la clase: objetivos, tramos, inicio de la clase y lo pendiente. */
export function Summary({
  lessonId,
  onNavigate,
}: {
  lessonId: string;
  onNavigate: Navigate;
}) {
  const { data, dispatch } = useAula();
  const width = useViewportWidth();
  const content = useContent();
  const deck = deckFor(content, lessonId);
  const { meta, slides } = deck;
  const [courseId, setCourseId] = useState(data.courses[0]?.id ?? '');
  const session = data.activeSession;
  const notes = pendingNotes(data, lessonId);
  const indexOf = (id: string) => slides.findIndex((slide) => slide.id === id);
  const maxMinutes = Math.max(1, ...meta.tramos.map((t) => t.minutes));
  const hasTramos = meta.tramos.length > 0 && slides.length > 0;

  const present = (slideId?: string) => {
    onNavigate('presentar', { lesson: meta.id, slide: slideId });
  };
  const start = () => {
    if (!session && courseId && data.courses.some((c) => c.id === courseId)) {
      const t = nowParts();
      dispatch({
        type: 'startSession',
        session: {
          courseId,
          lessonId: meta.id,
          lessonTitle: meta.title,
          date: t.date,
          start: t.time,
          votes: [],
        },
      });
    }
    present();
  };

  return (
    <div className="ws-page">
        <div className="chips">
          <span>{meta.duration} minutos</span>
          <span>PAES {meta.subject.toUpperCase()}</span>
          <span>{meta.axis}</span>
          <span>{slides.length} láminas</span>
        </div>
        <div className={`today-grid ${width >= 1200 ? 'is-wide' : ''}`}>
          <div className="stack">
            <Card
              tone="objetivo"
              tab={
                <>
                  <Lightbulb size={20} aria-hidden="true" />
                  Objetivos
                </>
              }
            >
              {meta.objectives.length ? (
                <ul>
                  {meta.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Aún no tiene objetivo.</p>
              )}
            </Card>
            {hasTramos ? (
              <Card title="Tramos de la clase">
                <ol className="tramos">
                  {meta.tramos.map((tramo) => {
                    const from = indexOf(tramo.from);
                    const to = indexOf(tramo.to);
                    const range =
                      from < 0
                        ? '—'
                        : from === to
                          ? pad2(from + 1)
                          : `${pad2(from + 1)}–${pad2(to + 1)}`;
                    return (
                      <li key={`${tramo.from}-${tramo.label}`}>
                        <button
                          type="button"
                          className={`tramo ${width >= 700 ? '' : 'is-compact'}`}
                          disabled={from < 0}
                          onClick={() => present(tramo.from)}
                        >
                          <span className="tramo-range">{range}</span>
                          <span className="tramo-label">{tramo.label}</span>
                          <span className="tramo-time">
                            <span
                              aria-hidden="true"
                              className="tramo-bar"
                              style={{
                                width: `${(tramo.minutes / maxMinutes) * 100}px`,
                              }}
                            />
                            <span>
                              {tramo.minutes ? `${tramo.minutes} min` : 'registro'}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ol>
              </Card>
            ) : (
              <Card variant="dashed" title="Clase en preparación">
                <p className="muted">
                  Aún no tiene tramos con minutos. Completa sus láminas antes de
                  proyectarla.
                </p>
                <Button variant="primary" onClick={() => onNavigate('clase', { section: 'laminas' })}>
                  Abrir las láminas
                </Button>
              </Card>
            )}
          </div>
          <div className="stack">
            <Card variant="emphasis" title="Iniciar la clase">
              <label className="field">
                Curso
                <select
                  value={session?.courseId ?? courseId}
                  disabled={Boolean(session)}
                  onChange={(event) => setCourseId(event.target.value)}
                >
                  {data.courses.length === 0 && (
                    <option value="">Sin cursos: créalos en Cursos</option>
                  )}
                  {data.courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.nombre} · {course.nivel}
                    </option>
                  ))}
                </select>
              </label>
              <Button variant="present" size="lg" block disabled={!slides.length} onClick={start}>
                {session ? 'Continuar la clase en curso' : 'Iniciar clase y proyectar'}
              </Button>
              <Button block disabled={!slides.length} onClick={() => onNavigate('clase', { section: 'pdf' })}>
                Descargar PDF antes de la clase
              </Button>
              <p className="hint">
                ← → Pasos · M Índice · F Pantalla completa · N Anotar. Los
                botones también funcionan en pantalla táctil.
              </p>
            </Card>
            {notes.length > 0 && (
              <Card
                aria-label="Comentarios pendientes"
                variant="note"
                title={
                  notes.length === 1
                    ? '1 comentario pendiente de clases anteriores'
                    : `${notes.length} comentarios pendientes de clases anteriores`
                }
              >
                <ul>
                  {notes.slice(0, 3).map((note) => {
                    const k = note.slideId ? indexOf(note.slideId) : -1;
                    return (
                      <li key={note.id}>
                        <span>
                          {note.text.length > 110
                            ? `${note.text.slice(0, 109)}…`
                            : note.text}
                        </span>{' '}
                        <span className="note-where">
                          {k >= 0 ? `· lámina ${pad2(k + 1)}` : '· toda la clase'}
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <Button size="sm" onClick={() => onNavigate('clase', { section: 'revision' })}>
                  {notes.length > 3 ? `Ver los ${notes.length} en Revisión` : 'Ver en Revisión'}
                </Button>
              </Card>
            )}
            {meta.prerequisites.length > 0 && (
              <Card variant="quiet" title="Conocimientos previos" titleSize="sm">
                <ul className="muted">
                  {meta.prerequisites.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        </div>
    </div>
  );
}
