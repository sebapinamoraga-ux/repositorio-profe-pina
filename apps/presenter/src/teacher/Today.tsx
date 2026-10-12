import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useRoute, useViewportWidth } from '../app/route';
import { useContent } from '../content/ContentProvider';
import { useAula } from '../store/AulaProvider';
import { deckFor, pad2 } from '../store/deck';
import type { View } from '../store/schema';
import { nowParts, pendingNotes } from '../store/teacher';
import { Button } from '../ui/Button';
import { Card, Page, PageHeader } from '../ui/Layout';

const MARK_LABEL = {
  lista: 'lista',
  'en-preparacion': 'en preparación',
  'por-preparar': 'por preparar',
} as const;

export function Today({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data, dispatch } = useAula();
  const { replace } = useRoute();
  const width = useViewportWidth();
  const content = useContent();
  const deck = deckFor(content, data.lessonId);
  const { meta, slides } = deck;
  const entry = content.library.entries.find((item) => item.id === data.lessonId);
  const [courseId, setCourseId] = useState(data.courses[0]?.id ?? '');
  const session = data.activeSession;
  const notes = pendingNotes(data, data.lessonId);
  const indexOf = (id: string) => slides.findIndex((slide) => slide.id === id);
  const maxMinutes = Math.max(1, ...meta.tramos.map((t) => t.minutes));
  const hasTramos = meta.tramos.length > 0 && slides.length > 0;

  const present = (slideId?: string) => {
    replace({ clase: meta.id, slide: slideId ?? null });
    onNavigate('presentar');
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
    <Page width="medium" grid>
        <PageHeader
          kicker={`Clase de hoy · ${MARK_LABEL[entry?.status ?? 'por-preparar']}`}
          kickerAction={
            <Button variant="quiet" size="sm" onClick={() => onNavigate('biblioteca')}>
              Cambiar clase
            </Button>
          }
          title={meta.title}
          meta={
            <>
              <span>{meta.duration} minutos</span>
              <span>PAES {meta.subject.toUpperCase()}</span>
              <span>{meta.axis}</span>
              <span>{slides.length} láminas</span>
            </>
          }
        />
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
                  Aún no tiene tramos con minutos. Completa sus láminas en el
                  editor antes de proyectarla.
                </p>
                <Button variant="primary" onClick={() => onNavigate('editor')}>
                  Abrir en editor
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
              <Button block disabled={!slides.length} onClick={() => onNavigate('pdf')}>
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
                <Button size="sm" onClick={() => onNavigate('editor')}>
                  {notes.length > 3
                    ? `Ver los ${notes.length} en el editor`
                    : 'Revisar en el editor'}
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
    </Page>
  );
}
