import { useState, type FormEvent } from 'react';
import { useViewportWidth } from '../app/route';
import { useAula } from '../store/AulaProvider';
import { deckFor } from '../store/deck';
import type { View } from '../store/schema';
import { nowParts, uid } from '../store/teacher';
import { useUi } from '../ui/UiProvider';
import { makeNote } from './notes';

export function Courses({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data, dispatch, snap } = useAula();
  const ui = useUi();
  const width = useViewportWidth();
  const [editing, setEditing] = useState<string | null>(null);
  const [obs, setObs] = useState('');
  const [improve, setImprove] = useState('');
  const [nombre, setNombre] = useState('');
  const [nivel, setNivel] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const active = data.activeSession;
  const courseName = (id: string) =>
    data.courses.find((c) => c.id === id)?.nombre ?? 'Curso eliminado';

  const start = (courseId: string) => {
    const deck = deckFor(data, data.lessonId);
    const t = nowParts();
    dispatch({
      type: 'startSession',
      session: {
        courseId,
        lessonId: deck.meta.id,
        lessonTitle: deck.meta.title,
        date: t.date,
        start: t.time,
        votes: [],
      },
    });
    onNavigate('presentar');
  };
  const end = () => {
    if (!active) return;
    const text = improve.trim();
    if (text)
      dispatch({
        type: 'addNote',
        note: makeNote(data, {
          text,
          lessonId: active.lessonId,
          slideId: null,
          slideTitle: '',
          source: 'cierre',
        }),
      });
    dispatch({ type: 'endSession', id: uid('s'), end: nowParts().time, obs: obs.trim() });
    setObs('');
    setImprove('');
    ui.toast(
      text
        ? 'Sesión registrada. Tu comentario quedó pendiente en el editor.'
        : 'Sesión registrada en el historial.',
    );
  };
  const add = (event: FormEvent) => {
    event.preventDefault();
    if (!nombre.trim()) return;
    dispatch({
      type: 'addCourse',
      course: {
        id: uid('c'),
        nombre: nombre.trim(),
        nivel: nivel.trim() || 'Sin nivel',
        observaciones: observaciones.trim(),
      },
    });
    setNombre('');
    setNivel('');
    setObservaciones('');
  };

  return (
    <main className="page page-grid-bg">
      <div className="page-inner page-courses">
        <header className="page-head">
          <p className="kicker">Cursos e historial docente</p>
          <h1 className="page-title">Tus cursos</h1>
          <p className="page-lead">
            Elige un curso al iniciar una clase. Cada sesión registra curso, clase, fecha,
            inicio, término y tu observación. Nada de esto aparece en el contenido público ni
            en el PDF.
          </p>
        </header>
        {active && (
          <section aria-label="Clase en curso" className={`tab-card tone-ok active-session ${width < 800 ? '' : 'is-wide'}`}>
            <div className="stack-tight">
              <p className="tab-label">Clase en curso · desde {active.start}</p>
              <p className="active-title">
                {courseName(active.courseId)} · {active.lessonTitle}
              </p>
              <label className="field">
                Observación posterior
                <textarea
                  rows={2}
                  value={obs}
                  placeholder="Hasta qué lámina llegamos, qué retomar con este curso…"
                  onChange={(event) => setObs(event.target.value)}
                />
              </label>
              <label className="field">
                <span>
                  ¿Qué mejorarías?{' '}
                  <span className="field-note">
                    Queda como comentario pendiente en el editor, para todos los cursos.
                  </span>
                </span>
                <textarea
                  rows={2}
                  value={improve}
                  placeholder="Qué cambiarías la próxima vez que la hagas…"
                  onChange={(event) => setImprove(event.target.value)}
                />
              </label>
            </div>
            <div className="row">
              <button type="button" className="btn" onClick={() => onNavigate('presentar')}>
                Volver a proyectar
              </button>
              <button type="button" className="btn btn-ok" onClick={end}>
                Terminar y registrar
              </button>
            </div>
          </section>
        )}
        <section aria-label="Cursos" className="course-grid">
          {data.courses.map((course) => {
            const count = data.sessions.filter((s) => s.courseId === course.id).length;
            return (
              <article key={course.id} className="course-card">
                {editing === course.id ? (
                  <>
                    <label className="field">
                      Nombre
                      <input
                        value={course.nombre}
                        onChange={(event) =>
                          dispatch({ type: 'updateCourse', id: course.id, patch: { nombre: event.target.value } })
                        }
                      />
                    </label>
                    <label className="field">
                      Nivel
                      <input
                        value={course.nivel}
                        onChange={(event) =>
                          dispatch({ type: 'updateCourse', id: course.id, patch: { nivel: event.target.value } })
                        }
                      />
                    </label>
                    <label className="field">
                      Observaciones
                      <textarea
                        rows={3}
                        value={course.observaciones}
                        onChange={(event) =>
                          dispatch({
                            type: 'updateCourse',
                            id: course.id,
                            patch: { observaciones: event.target.value },
                          })
                        }
                      />
                    </label>
                    <div className="row">
                      <button type="button" className="btn btn-ink" onClick={() => setEditing(null)}>
                        Listo
                      </button>
                      <button
                        type="button"
                        className="btn btn-danger-soft"
                        onClick={() => {
                          const undo = snap(['courses']);
                          dispatch({ type: 'removeCourse', id: course.id });
                          setEditing(null);
                          ui.toast(`Curso ${course.nombre} eliminado. El historial se conserva.`, undo);
                        }}
                      >
                        Eliminar curso
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="course-copy">
                      <span className="level-pill">{course.nivel}</span>
                      <h2>{course.nombre}</h2>
                      <p>{course.observaciones || 'Sin observaciones.'}</p>
                      <p className="small">
                        {count === 1 ? '1 sesión registrada' : `${count} sesiones registradas`}
                      </p>
                    </div>
                    <div className="row course-actions">
                      <button
                        type="button"
                        className="btn btn-accent"
                        disabled={Boolean(active)}
                        onClick={() => start(course.id)}
                      >
                        Iniciar clase
                      </button>
                      <button type="button" className="btn" onClick={() => setEditing(course.id)}>
                        Editar
                      </button>
                    </div>
                  </>
                )}
              </article>
            );
          })}
          <form className="course-new" onSubmit={add}>
            <p className="kicker">Nuevo curso</p>
            <input
              className="input"
              aria-label="Nombre"
              placeholder="Nombre, p. ej. 3° Medio C"
              value={nombre}
              onChange={(event) => setNombre(event.target.value)}
            />
            <input
              className="input"
              aria-label="Nivel"
              placeholder="Nivel"
              value={nivel}
              onChange={(event) => setNivel(event.target.value)}
            />
            <textarea
              className="input"
              rows={2}
              aria-label="Observaciones"
              placeholder="Observaciones"
              value={observaciones}
              onChange={(event) => setObservaciones(event.target.value)}
            />
            <button type="submit" className="btn btn-ink" disabled={!nombre.trim()}>
              Agregar curso
            </button>
          </form>
        </section>
        <section aria-label="Historial de sesiones" className="history">
          <h2>Historial de sesiones</h2>
          {data.sessions.length === 0 && <p className="muted">Aún no hay sesiones registradas.</p>}
          {data.sessions.map((session) => (
            <article key={session.id} className="history-row">
              <div>
                <span className="muted small">Fecha</span>
                <b>{session.date.split('-').reverse().join('-')}</b>
                <span className="muted small">
                  {session.start} – {session.end}
                </span>
              </div>
              <div>
                <span className="muted small">Curso · clase</span>
                <b>{courseName(session.courseId)}</b>
                <span className="muted small">{session.lessonTitle}</span>
                {session.votes.map((vote) => (
                  <span key={vote.activity} className="vote-summary">
                    <b>Votación</b>
                    {vote.total
                      ? `${vote.total} respuestas · ${Math.round(((vote.correct ? (vote.counts[vote.correct] ?? 0) : 0) / vote.total) * 100)}% eligió la correcta (${vote.correct ?? '—'})`
                      : 'Cerrada sin respuestas'}
                  </span>
                ))}
              </div>
              <label className="field-plain">
                Observación
                <textarea
                  rows={2}
                  value={session.obs}
                  onChange={(event) =>
                    dispatch({ type: 'updateSession', id: session.id, patch: { obs: event.target.value } })
                  }
                />
              </label>
            </article>
          ))}
        </section>
      </div>
    </main>
  );
}
