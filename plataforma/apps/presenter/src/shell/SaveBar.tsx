import { useState } from 'react';
import { X } from 'lucide-react';
import { useOnline } from '../app/route';
import { useContent } from '../content/ContentProvider';
import { describePath } from '../content/validate';
import type { View } from '../store/schema';
import { Button, IconButton } from '../ui/Button';
import { ConflictDialog, PendingFiles, runSummary } from './PublishParts';
import { usePublish } from './usePublish';

/**
 * Único aviso de solo lectura, en la parte superior de las pantallas docentes: sin conexión con
 * GitHub la app muestra el contenido publicado y los controles de edición quedan desactivados.
 */
export function ConnectionStrip({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { connection, mode, sync } = useContent();
  if (connection && mode !== 'build') return null;
  return (
    <p className="connection-strip">
      {connection ? (
        sync.status === 'error' ? (
          `No se pudo leer el repositorio: ${sync.error ?? ''}`
        ) : (
          'Leyendo el contenido del repositorio…'
        )
      ) : (
        <>
          <b>Solo lectura.</b> La app muestra el contenido publicado. Para editar, conecta la app
          con GitHub en{' '}
          <Button variant="quiet" size="sm" onClick={() => onNavigate('ajustes')}>
            Ajustes
          </Button>
          .
        </>
      )}
    </p>
  );
}

function syncLabel(
  connected: boolean,
  online: boolean,
  status: string,
  mode: string,
  n: number,
) {
  if (!connected) return 'Sin conectar · solo lectura';
  if (!online || status === 'offline') return `Sin conexión${n ? ` · ${n} por publicar` : ''}`;
  if (status === 'error') return 'Error al leer GitHub';
  if (n) return `${n} por publicar`;
  return mode === 'live' ? 'Al día con GitHub' : 'Sincronizando…';
}

/** Estado de la conexión con GitHub: un solo indicador, que lleva a Ajustes. */
export function SyncPill({
  compact = false,
  onOpen,
}: {
  compact?: boolean;
  onOpen?: () => void;
}) {
  const online = useOnline();
  const { connection, mode, sync, pending } = useContent();
  const n = pending.length;
  const label = syncLabel(Boolean(connection), online, sync.status, mode, n);
  const tone =
    !connection || !online || sync.status !== 'idle' ? 'is-offline' : n ? 'is-pending' : '';
  const body = (
    <>
      <span aria-hidden="true" className="save-dot" />
      {!compact && label}
    </>
  );
  if (onOpen)
    return (
      <button
        type="button"
        className={`save-pill is-button ${tone}`}
        aria-label={`${label}. Abrir Ajustes`}
        title={label}
        onClick={onOpen}
      >
        {body}
      </button>
    );
  return (
    <span className={`save-pill ${tone}`} aria-label={label} title={label}>
      {body}
    </span>
  );
}

/** Cambios sin guardar, guardado en el repositorio y su publicación. */
export function SaveBar({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { content, pending, saveState, n, busy, message, setMessage, placeholder, discard, save } =
    usePublish();
  const { canEdit, connection } = content;
  const [open, setOpen] = useState(false);
  const [conflicts, setConflicts] = useState(false);
  if (!pending.length && saveState.phase === 'idle') return null;
  return (
    <section aria-label="Cambios sin guardar" className={`save-bar is-${saveState.phase}`}>
      <div className="save-bar-main">
        <p className="save-bar-status" role="status">
          {saveState.phase === 'validating' && 'Revisando con las reglas de content:check…'}
          {saveState.phase === 'saving' && 'Guardando en el repositorio…'}
          {saveState.phase === 'queued' && 'Sin conexión: se guardará al recuperar la red.'}
          {saveState.phase === 'conflicts' && 'Otro dispositivo cambió los mismos archivos.'}
          {saveState.phase === 'error' && `No se pudo guardar: ${saveState.error}`}
          {saveState.phase === 'invalid' && 'Hay problemas que impiden guardar.'}
          {saveState.phase === 'saved' && (
            <>
              Guardado en GitHub. {runSummary(saveState.runs)}{' '}
              {saveState.runs?.[0] && (
                <a href={saveState.runs[0].url} target="_blank" rel="noreferrer">
                  Ver detalle
                </a>
              )}
            </>
          )}
          {saveState.phase === 'idle' && (
            <>
              <b>
                {n} {n === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}
              </b>{' '}
              <Button variant="quiet" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? 'Ocultar' : 'Ver cuáles'}
              </Button>
            </>
          )}
        </p>
        <div className="row">
          {content.wc.conflicts.length > 0 && (
            <Button variant="danger" size="sm" onClick={() => setConflicts(true)}>
              Resolver {content.wc.conflicts.length}{' '}
              {content.wc.conflicts.length === 1 ? 'conflicto' : 'conflictos'}
            </Button>
          )}
          {n > 0 && !busy && (
            <>
              <input
                className="input save-message"
                aria-label="Descripción del cambio"
                placeholder={placeholder}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <Button size="sm" onClick={() => void discard()}>
                Descartar
              </Button>
              <Button
                variant="primary" size="sm"
                disabled={!canEdit || content.wc.conflicts.length > 0}
                onClick={save}
              >
                Guardar en el repositorio
              </Button>
            </>
          )}
          {!connection && (
            <Button size="sm" onClick={() => onNavigate('ajustes')}>
              Conectar
            </Button>
          )}
          {(saveState.phase === 'saved' || saveState.phase === 'error') && (
            <IconButton label="Cerrar aviso" onClick={content.dismissSave}>
              <X size={18} aria-hidden="true" />
            </IconButton>
          )}
        </div>
      </div>
      {open && saveState.phase === 'idle' && <PendingFiles />}
      {saveState.phase === 'invalid' && (
        <ul className="save-bar-files is-error">
          {saveState.problems.map((problem) => (
            <li key={`${problem.path}-${problem.message}`}>
              <b>{describePath(problem.path)}:</b> {problem.message}
            </li>
          ))}
        </ul>
      )}
      {conflicts && <ConflictDialog onClose={() => setConflicts(false)} />}
    </section>
  );
}
