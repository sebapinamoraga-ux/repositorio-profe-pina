import { useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { useRoute, useViewportWidth } from '../app/route';
import { useAula } from '../store/AulaProvider';
import { deckFor, pad2 } from '../store/deck';
import type { View } from '../store/schema';
import { nowParts, pendingNotes } from '../store/teacher';

const MARK_LABEL = {
  lista: 'lista',
  'en-preparacion': 'en preparación',
  'por-preparar': 'por preparar',
} as const;

export function Today({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data, dispatch } = useAula();
  const { replace } = useRoute();
  const width = useViewportWidth();
  const deck = deckFor(data, data.lessonId);
  const { meta, slides } = deck;
  const entry = data.library.find((item) => item.id === data.lessonId);
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
    <main className="page page-grid-bg">
      <div className="page-inner page-today">
        <header>
          <div className="today-kicker">
            <p className="kicker">
              Clase de hoy · {MARK_LABEL[entry?.status ?? 'por-preparar']}
            </p>
            <button
              type="button"
              className="btn btn-small btn-link"
              onClick={() => onNavigate('biblioteca')}
            >
              Cambiar clase
            </button>
          </div>
          <h1 className="page-title">{meta.title}</h1>
          <div className="chips">
            <span>{meta.duration} minutos</span>
            <span>PAES {meta.subject.toUpperCase()}</span>
            <span>{meta.axis}</span>
            <span>{slides.length} láminas</span>
          </div>
        </header>
        <div className={`today-grid ${width >= 1200 ? 'is-wide' : ''}`}>
          <div className="stack">
            <section className="tab-card tone-objective">
              <p className="tab-label">
                <Lightbulb size={20} aria-hidden="true" />
                Objetivos
              </p>
              {meta.objectives.length ? (
                <ul>
                  {meta.objectives.map((objective) => (
                    <li key={objective}>{objective}</li>
                  ))}
                </ul>
              ) : (
                <p className="muted">Aún no tiene objetivo.</p>
              )}
            </section>
            {hasTramos ? (
              <section className="card">
                <h2 className="card-title">Tramos de la clase</h2>
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
              </section>
            ) : (
              <section className="card card-dashed">
                <h2 className="card-title">Clase en preparación</h2>
                <p className="muted">
                  Aún no tiene tramos con minutos. Completa sus láminas en el
                  editor antes de proyectarla.
                </p>
                <button
                  type="button"
                  className="btn btn-ink"
                  onClick={() => onNavigate('editor')}
                >
                  Abrir en editor
                </button>
              </section>
            )}
          </div>
          <div className="stack">
            <section className="card card-raised start-card">
              <h2 className="card-title">Iniciar la clase</h2>
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
              <button
                type="button"
                className="btn btn-accent btn-large"
                disabled={!slides.length}
                onClick={start}
              >
                {session ? 'Continuar la clase en curso' : 'Iniciar clase y proyectar'}
              </button>
              <button
                type="button"
                className="btn"
                disabled={!slides.length}
                onClick={() => onNavigate('pdf')}
              >
                Descargar PDF antes de la clase
              </button>
              <p className="hint">
                ← → Pasos · M Índice · F Pantalla completa · N Anotar. Los
                botones también funcionan en pantalla táctil.
              </p>
            </section>
            {notes.length > 0 && (
              <section aria-label="Comentarios pendientes" className="card card-note">
                <h2 className="card-title">
                  {notes.length === 1
                    ? '1 comentario pendiente de clases anteriores'
                    : `${notes.length} comentarios pendientes de clases anteriores`}
                </h2>
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
                <button
                  type="button"
                  className="btn btn-note"
                  onClick={() => onNavigate('editor')}
                >
                  {notes.length > 3
                    ? `Ver los ${notes.length} en el editor`
                    : 'Revisar en el editor'}
                </button>
              </section>
            )}
            {meta.prerequisites.length > 0 && (
              <section className="card card-paper">
                <h2 className="card-title small">Conocimientos previos</h2>
                <ul className="muted">
                  {meta.prerequisites.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </section>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
