import { useState, type ReactNode } from 'react';
import { CircleAlert, CircleCheck, LoaderCircle, Upload } from 'lucide-react';
import type { Navigate } from '../../../app/routes';
import { describePath } from '../../../content/validate';
import {
  ConflictDialog,
  PendingFiles,
  runSummary,
} from '../../../shell/PublishParts';
import { usePublish } from '../../../shell/usePublish';
import { Button } from '../../../ui/Button';
import { usePopover } from '../../../ui/Menu';

type Tone = 'ok' | 'pending' | 'bad' | 'done' | 'warn';

/**
 * Estado de publicación de la clase: reemplaza a la franja `SaveBar` dentro de Clase. Un botón
 * de píldora con el estado y un panel con los archivos, la descripción y Publicar o Descartar.
 */
export function PublishIndicator({
  lessonId,
  onNavigate,
}: {
  lessonId: string;
  onNavigate: Navigate;
}) {
  const publish = usePublish();
  const {
    content,
    saveState,
    n,
    busy,
    message,
    setMessage,
    placeholder,
    discard,
    save,
  } = publish;
  const { open, setOpen, root, trigger } = usePopover();
  const [conflicts, setConflicts] = useState(false);
  const { connection, canEdit, wc } = content;
  const conflictCount = wc.conflicts.length;

  let tone: Tone = 'ok';
  let text = 'Al día';
  let icon: ReactNode = <CircleCheck size={16} aria-hidden="true" />;
  switch (saveState.phase) {
    case 'validating':
    case 'saving':
      tone = 'pending';
      text = 'Publicando…';
      icon = <LoaderCircle size={16} aria-hidden="true" className="spin" />;
      break;
    case 'queued':
      tone = 'warn';
      text = 'Sin conexión · se publicará al volver';
      icon = <CircleAlert size={16} aria-hidden="true" />;
      break;
    case 'conflicts':
      tone = 'bad';
      text = 'Hay un conflicto';
      icon = <CircleAlert size={16} aria-hidden="true" />;
      break;
    case 'error':
      tone = 'bad';
      text = 'No se pudo publicar';
      icon = <CircleAlert size={16} aria-hidden="true" />;
      break;
    case 'invalid':
      tone = 'bad';
      text = 'No se puede publicar';
      icon = <CircleAlert size={16} aria-hidden="true" />;
      break;
    case 'saved':
      tone = 'done';
      text = 'Publicado';
      break;
    case 'idle':
      if (n) {
        tone = 'pending';
        text = `${n} por publicar`;
        icon = <Upload size={16} aria-hidden="true" />;
      }
      break;
  }

  return (
    <div className="menu pub-wrap" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={`pub is-${tone}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {icon}
        <span>{text}</span>
      </button>
      {open && (
        <div
          className="popover-panel pub-panel"
          role="dialog"
          aria-label="Publicación de la clase"
        >
          {saveState.phase === 'invalid' && (
            <>
              <h3>Hay problemas que impiden publicar</h3>
              <p className="muted small">Corrígelos y vuelve a intentarlo.</p>
              <ul className="pub-problems">
                {saveState.problems.map((problem) => (
                  <li key={`${problem.path}-${problem.message}`}>
                    <b>{describePath(problem.path)}:</b> {problem.message}
                  </li>
                ))}
              </ul>
              <Button
                size="sm"
                onClick={() => {
                  setOpen(false);
                  onNavigate('clase', {
                    lesson: lessonId,
                    section: 'revision',
                  });
                }}
              >
                Ir a Revisión
              </Button>
            </>
          )}
          {saveState.phase === 'saved' && (
            <>
              <h3>Publicado en GitHub</h3>
              <p className="small">
                {runSummary(saveState.runs)}{' '}
                {saveState.runs?.[0] && (
                  <a
                    href={saveState.runs[0].url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver detalle
                  </a>
                )}
              </p>
            </>
          )}
          {busy && (
            <p className="small" role="status">
              {saveState.phase === 'validating'
                ? 'Revisando con las reglas de content:check…'
                : 'Publicando en el repositorio…'}
            </p>
          )}
          {saveState.phase === 'queued' && (
            <p className="small">
              Sin conexión: se publicará al recuperar la red.
            </p>
          )}
          {saveState.phase === 'error' && (
            <p className="small text-error">
              No se pudo publicar: {saveState.error}
            </p>
          )}
          {conflictCount > 0 && (
            <Button
              variant="danger"
              size="sm"
              onClick={() => setConflicts(true)}
            >
              Resolver {conflictCount}{' '}
              {conflictCount === 1 ? 'conflicto' : 'conflictos'}
            </Button>
          )}
          {n === 0 && saveState.phase === 'idle' && (
            <>
              <h3>Todo está publicado</h3>
              <p className="muted small">
                Cada cambio se guarda solo en este navegador. Cuando edites,
                publícalos desde aquí.
              </p>
            </>
          )}
          {n > 0 && !busy && saveState.phase !== 'invalid' && (
            <>
              <h3>
                {n} {n === 1 ? 'archivo cambiado' : 'archivos cambiados'}
              </h3>
              <p className="muted small">
                Ya están guardados en este navegador. Publícalos para que el
                curso vea la versión nueva.
              </p>
              <PendingFiles className="save-bar-files pub-files" />
            </>
          )}
          {n > 0 && !busy && (
            <>
              <label className="field">
                Qué cambiaste (opcional)
                <input
                  className="input"
                  placeholder={placeholder}
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                />
              </label>
              <div className="row">
                <Button size="sm" onClick={() => void discard()}>
                  Descartar
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!canEdit || conflictCount > 0}
                  onClick={save}
                >
                  Publicar
                </Button>
              </div>
            </>
          )}
          {!connection && (
            <Button size="sm" onClick={() => onNavigate('ajustes')}>
              Conectar
            </Button>
          )}
        </div>
      )}
      {conflicts && <ConflictDialog onClose={() => setConflicts(false)} />}
    </div>
  );
}
