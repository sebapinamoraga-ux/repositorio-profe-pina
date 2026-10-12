import { useState, type FormEvent } from 'react';
import { useAula } from '../../store/AulaProvider';
import { useContent } from '../../content/ContentProvider';
import { deckFor } from '../../store/deck';
import type { Navigate } from '../../app/routes';
import { nowParts, uid } from '../../store/teacher';
import { useUi } from '../../ui/UiProvider';
import { EndSessionForm } from '../../shell/Session';
import { useCurrentLesson } from '../clases/current';
import { Button } from '../../ui/Button';
import { Card, Page, PageHeader } from '../../ui/Layout';

const CURRENT_REASON = {
  hoy: 'la clase de hoy',
  proxima: 'la próxima clase de la planificación',
  ultima: 'la última clase que abriste',
} as const;

export function Courses({ onNavigate }: { onNavigate: Navigate }) {
  const { data, dispatch, snap } = useAula();
  const content = useContent();
  const ui = useUi();
  const [editing, setEditing] = useState<string | null>(null);
  const [nombre, setNombre] = useState('');
  const [nivel, setNivel] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const active = data.activeSession;
  const courseName = (id: string) =>
    data.courses.find((c) => c.id === id)?.nombre ?? 'Curso eliminado';

  const current = useCurrentLesson();
  const start = (courseId: string) => {
    const deck = deckFor(content, current?.id ?? data.lessonId);
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
    onNavigate('presentar', { lesson: deck.meta.id });
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
    <Page width="wide" grid>
        <PageHeader
          kicker="Cursos e historial docente"
          title="Tus cursos"
          lead="Elige un curso al iniciar una clase. Cada sesión registra curso, clase, fecha, inicio, término y tu observación. Nada de esto aparece en el contenido público ni en el PDF."
        />
        {!active && (
          <p className="hint">
            «Iniciar clase» proyecta «{deckFor(content, current?.id ?? data.lessonId).meta.title}»
            {current ? `, ${CURRENT_REASON[current.reason]}` : ''}.{' '}
            <Button variant="quiet" size="sm" onClick={() => onNavigate('clases')}>
              Elegir otra clase
            </Button>
          </p>
        )}
        {active && (
          <Card aria-label="Clase en curso" tone="comprobacion" className="active-session">
            <p className="card-tab">Clase en curso · desde {active.start}</p>
            <div className="active-head">
              <p className="active-title">
                {courseName(active.courseId)} · {active.lessonTitle}
              </p>
              <Button onClick={() => onNavigate('presentar', { lesson: active.lessonId })}>
                Volver a proyectar
              </Button>
            </div>
            <EndSessionForm />
          </Card>
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
                      <Button variant="primary" onClick={() => setEditing(null)}>
                        Listo
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => {
                          const undo = snap(['courses']);
                          dispatch({ type: 'removeCourse', id: course.id });
                          setEditing(null);
                          ui.toast(`Curso ${course.nombre} eliminado. El historial se conserva.`, undo);
                        }}
                      >
                        Eliminar curso
                      </Button>
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
                      <Button
                        variant="present"
                        disabled={Boolean(active)}
                        onClick={() => start(course.id)}
                      >
                        Iniciar clase
                      </Button>
                      <Button onClick={() => setEditing(course.id)}>
                        Editar
                      </Button>
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
            <Button type="submit" variant="primary" disabled={!nombre.trim()}>
              Agregar curso
            </Button>
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
    </Page>
  );
}
