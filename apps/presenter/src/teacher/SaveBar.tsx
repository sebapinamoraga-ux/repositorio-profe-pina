import { useState } from 'react';
import { X } from 'lucide-react';
import { useOnline } from '../app/route';
import { defaultMessage, useContent } from '../content/ContentProvider';
import { describePath } from '../content/validate';
import type { View } from '../store/schema';
import { Modal } from '../ui/Modal';
import { useUi } from '../ui/UiProvider';

/** Aviso para editar: sin conexión con GitHub la app solo muestra el contenido. */
export function ConnectHint({ onNavigate }: { onNavigate?: (view: View) => void }) {
  const { connection, mode, sync } = useContent();
  if (connection && mode === 'build')
    return (
      <p role="status" className="alert alert-info">
        {sync.status === 'error'
          ? `No se pudo leer el repositorio: ${sync.error ?? ''}`
          : 'Leyendo el contenido del repositorio…'}
      </p>
    );
  if (connection) return null;
  return (
    <p role="status" className="alert alert-info">
      Para editar clases desde cualquier dispositivo, conecta la app con GitHub en{' '}
      {onNavigate ? (
        <button type="button" className="link-btn" onClick={() => onNavigate('conexion')}>
          Conexión
        </button>
      ) : (
        <b>Conexión</b>
      )}
      . Mientras tanto, la app muestra el contenido publicado.
    </p>
  );
}

/** Estado de sincronización en la barra docente. */
export function SyncPill({ compact = false }: { compact?: boolean }) {
  const online = useOnline();
  const { connection, mode, sync, pending } = useContent();
  const n = pending.length;
  const label = !connection
    ? 'Sin conectar · solo lectura'
    : !online || sync.status === 'offline'
      ? `Sin conexión${n ? ` · ${n} sin guardar` : ''}`
      : sync.status === 'error'
        ? 'Error al leer GitHub'
        : n
          ? `${n} ${n === 1 ? 'cambio sin guardar' : 'cambios sin guardar'}`
          : mode === 'live'
            ? 'Al día con GitHub'
            : 'Sincronizando…';
  const tone =
    !connection || !online || sync.status !== 'idle' ? 'is-offline' : n ? 'is-pending' : '';
  return (
    <span className={`save-pill ${tone}`} aria-label={label} title={label}>
      <span aria-hidden="true" className="save-dot" />
      {!compact && label}
    </span>
  );
}

/** Diferencias por líneas (LCS), suficiente para archivos de contenido. */
export function lineDiff(before: string, after: string) {
  const a = before.split('\n');
  const b = after.split('\n');
  const table = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      (table[i] as number[])[j] =
        a[i] === b[j]
          ? (table[i + 1]?.[j + 1] ?? 0) + 1
          : Math.max(table[i + 1]?.[j] ?? 0, table[i]?.[j + 1] ?? 0);
  const out: { kind: ' ' | '-' | '+'; text: string }[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: ' ', text: a[i] ?? '' });
      i++;
      j++;
    } else if (j < b.length && (i >= a.length || (table[i]?.[j + 1] ?? 0) >= (table[i + 1]?.[j] ?? 0))) {
      out.push({ kind: '+', text: b[j] ?? '' });
      j++;
    } else {
      out.push({ kind: '-', text: a[i] ?? '' });
      i++;
    }
  }
  return out;
}

function ConflictDialog({ onClose }: { onClose: () => void }) {
  const { wc, resolve } = useContent();
  if (!wc.conflicts.length) return null;
  return (
    <Modal label="Resolver conflictos" onClose={onClose} className="conflict-dialog">
      <div className="modal-head">
        <div>
          <p className="kicker kicker-danger">Cambios en otro dispositivo</p>
          <h2>Estos archivos cambiaron en el repositorio mientras los editabas</h2>
        </div>
        <button type="button" className="icon-btn" aria-label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </button>
      </div>
      {wc.conflicts.map((conflict) => {
        const ours = conflict.ours.op === 'put' ? conflict.ours.text : '';
        const diff = lineDiff(conflict.theirs ?? '', ours).filter((line, k, all) =>
          line.kind !== ' ' ||
          all.slice(Math.max(0, k - 2), k + 3).some((near) => near.kind !== ' '),
        );
        return (
          <section key={conflict.path} className="conflict">
            <h3>{describePath(conflict.path)}</h3>
            <p className="muted small">
              {conflict.ours.op === 'delete'
                ? 'Tú lo borraste; en el repositorio cambió.'
                : conflict.theirs === null
                  ? 'En el repositorio se borró; tú lo editaste.'
                  : 'En rojo, la versión del repositorio; en verde, la tuya.'}
            </p>
            {diff.length > 0 && (
              <pre className="diff" aria-label="Diferencias">
                {diff.map((line, k) => (
                  <span key={k} className={`diff-${line.kind === '+' ? 'add' : line.kind === '-' ? 'del' : 'same'}`}>
                    {line.kind} {line.text}
                    {'\n'}
                  </span>
                ))}
              </pre>
            )}
            <div className="row">
              <button type="button" className="btn btn-small btn-ink" onClick={() => resolve(conflict.path, 'mine')}>
                Conservar mi versión
              </button>
              <button type="button" className="btn btn-small" onClick={() => resolve(conflict.path, 'theirs')}>
                Tomar la del repositorio
              </button>
            </div>
          </section>
        );
      })}
    </Modal>
  );
}

function runSummary(runs: { status: string; conclusion: string | null }[] | null) {
  if (runs === null) return 'Se publicará en unos minutos.';
  if (!runs.length) return 'Esperando la verificación de GitHub…';
  if (runs.some((run) => run.status !== 'completed')) return 'Verificando y publicando…';
  if (runs.every((run) => run.conclusion === 'success')) return 'Publicado.';
  return 'La verificación de GitHub falló: el sitio sigue con la versión anterior.';
}

/** Cambios sin guardar, guardado en el repositorio y su publicación. */
export function SaveBar({ onNavigate }: { onNavigate: (view: View) => void }) {
  const content = useContent();
  const ui = useUi();
  const { pending, saveState, canEdit, connection } = content;
  const [open, setOpen] = useState(false);
  const [conflicts, setConflicts] = useState(false);
  const [message, setMessage] = useState('');
  if (!pending.length && saveState.phase === 'idle') return null;
  const busy = saveState.phase === 'validating' || saveState.phase === 'saving';
  const n = pending.length;
  const discard = async () => {
    if (
      !(await ui.confirm({
        title: '¿Descartar los cambios sin guardar?',
        body: `Se pierden ${n === 1 ? 'el cambio' : `los ${n} cambios`} hechos en este navegador desde el último guardado.`,
        ok: 'Descartar',
      }))
    )
      return;
    const undo = content.snap();
    content.discard();
    ui.toast('Cambios descartados', undo);
  };
  const save = () => {
    void content.save(message || undefined).then(() => setMessage(''));
  };
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
              <button type="button" className="link-btn" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
                {open ? 'Ocultar' : 'Ver cuáles'}
              </button>
            </>
          )}
        </p>
        <div className="row">
          {content.wc.conflicts.length > 0 && (
            <button type="button" className="btn btn-small btn-danger-soft" onClick={() => setConflicts(true)}>
              Resolver {content.wc.conflicts.length}{' '}
              {content.wc.conflicts.length === 1 ? 'conflicto' : 'conflictos'}
            </button>
          )}
          {n > 0 && !busy && (
            <>
              <input
                className="input save-message"
                aria-label="Descripción del cambio"
                placeholder={defaultMessage(pending)}
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
              <button type="button" className="btn btn-small" onClick={() => void discard()}>
                Descartar
              </button>
              <button
                type="button"
                className="btn btn-small btn-ink"
                disabled={!canEdit || content.wc.conflicts.length > 0}
                onClick={save}
              >
                Guardar en el repositorio
              </button>
            </>
          )}
          {!connection && (
            <button type="button" className="btn btn-small" onClick={() => onNavigate('conexion')}>
              Conectar
            </button>
          )}
          {(saveState.phase === 'saved' || saveState.phase === 'error') && (
            <button type="button" className="icon-btn" aria-label="Cerrar aviso" onClick={content.dismissSave}>
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
      {open && saveState.phase === 'idle' && (
        <ul className="save-bar-files">
          {pending.map((path) => (
            <li key={path}>
              {describePath(path)}
              {content.wc.changes[path]?.op === 'delete' ? ' (se borra)' : ''}
            </li>
          ))}
        </ul>
      )}
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
