import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import type { Navigate } from '../../app/routes';
import { useAula } from '../../store/AulaProvider';
import { nowParts, uid } from '../../store/teacher';
import { Button, IconButton } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { useUi } from '../../ui/UiProvider';
import { makeNote } from '../notes';

/** Minutos desde el inicio (HH:MM de hoy); se actualiza cada medio minuto. */
function useElapsed(start: string) {
  const minutes = () => {
    const [h = 0, m = 0] = start.split(':').map(Number);
    const now = new Date();
    return Math.max(0, now.getHours() * 60 + now.getMinutes() - (h * 60 + m));
  };
  const [value, setValue] = useState(minutes);
  useEffect(() => {
    const timer = setInterval(() => setValue(minutes()), 30_000);
    return () => clearInterval(timer);
  });
  return value;
}

/** Cierre de la sesión en curso: observación para el curso y mejora para la clase. */
export function EndSessionForm({ onDone }: { onDone?: () => void }) {
  const { data, dispatch } = useAula();
  const ui = useUi();
  const [obs, setObs] = useState('');
  const [improve, setImprove] = useState('');
  const active = data.activeSession;
  if (!active) return null;
  const end = () => {
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
    ui.toast(
      text
        ? 'Sesión registrada. Tu comentario quedó pendiente en Revisión.'
        : 'Sesión registrada en el historial.',
    );
    onDone?.();
  };
  return (
    <div className="end-session">
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
            Queda como comentario pendiente en la clase, para todos los cursos.
          </span>
        </span>
        <textarea
          rows={2}
          value={improve}
          placeholder="Qué cambiarías la próxima vez que la hagas…"
          onChange={(event) => setImprove(event.target.value)}
        />
      </label>
      <div className="row row-end">
        <Button variant="primary" onClick={end}>
          Terminar y registrar
        </Button>
      </div>
    </div>
  );
}

/** Barra de la sesión en curso, visible en todas las pantallas docentes salvo al proyectar. */
export function SessionBar({ onNavigate }: { onNavigate: Navigate }) {
  const { data } = useAula();
  const [closing, setClosing] = useState(false);
  const session = data.activeSession;
  const elapsed = useElapsed(session?.start ?? '00:00');
  if (!session) return null;
  const course = data.courses.find((c) => c.id === session.courseId);
  return (
    <section aria-label="Clase en curso" className="session-bar">
      <p>
        <span aria-hidden="true" className="session-dot" />
        <b>En clase</b> · {course?.nombre ?? 'Curso eliminado'} · {session.lessonTitle} ·{' '}
        <span className="session-time">
          desde {session.start} ({elapsed} min)
        </span>
      </p>
      <div className="row">
        <Button
          variant="present"
          size="sm"
          onClick={() => onNavigate('presentar', { lesson: session.lessonId })}
        >
          Volver a proyectar
        </Button>
        <Button size="sm" onClick={() => setClosing(true)}>
          Cerrar sesión
        </Button>
      </div>
      {closing && (
        <Modal label="Cerrar la sesión" onClose={() => setClosing(false)}>
          <div className="modal-head">
            <div>
              <p className="kicker">
                {course?.nombre ?? 'Curso'} · desde {session.start}
              </p>
              <h2>Cerrar la sesión</h2>
            </div>
            <IconButton label="Cerrar" onClick={() => setClosing(false)}>
              <X size={22} aria-hidden="true" />
            </IconButton>
          </div>
          <EndSessionForm onDone={() => setClosing(false)} />
        </Modal>
      )}
    </section>
  );
}
