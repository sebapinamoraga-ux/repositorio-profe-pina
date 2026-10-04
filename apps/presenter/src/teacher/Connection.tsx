import { useState, type FormEvent } from 'react';
import { useContent } from '../content/ContentProvider';
import { DEFAULT_BRANCH, DEFAULT_REPO } from '../content/storage';
import type { View } from '../store/schema';
import { useUi } from '../ui/UiProvider';

const NEW_TOKEN_URL = 'https://github.com/settings/personal-access-tokens/new';

function when(iso: string | null) {
  if (!iso) return 'nunca';
  return new Date(iso).toLocaleString('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
}

/** Conexión con el repositorio: el token se pega una vez por dispositivo. */
export function Connection({ onNavigate }: { onNavigate: (view: View) => void }) {
  const content = useContent();
  const ui = useUi();
  const { connection, sync, snapshot, mode, pending } = content;
  const [repo, setRepo] = useState(connection?.repo ?? DEFAULT_REPO);
  const [branch, setBranch] = useState(connection?.branch ?? DEFAULT_BRANCH);
  const [token, setToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!token.trim()) return;
    setBusy(true);
    setError(null);
    const problem = await content.connect({
      repo: repo.trim(),
      branch: branch.trim() || DEFAULT_BRANCH,
      token: token.trim(),
    });
    setBusy(false);
    if (problem) setError(problem);
    else {
      setToken('');
      ui.toast('Conectada con GitHub. Ya puedes editar y guardar desde este dispositivo.');
    }
  };
  const disconnect = async () => {
    if (
      !(await ui.confirm({
        title: '¿Desconectar este dispositivo?',
        body: pending.length
          ? `Hay ${pending.length} cambios sin guardar: quedan en este navegador, pero no podrás guardarlos hasta volver a conectar.`
          : 'Se borra el token de este navegador. Podrás volver a conectar con un token nuevo.',
        ok: 'Desconectar',
      }))
    )
      return;
    content.disconnect();
  };

  return (
    <main className="page">
      <div className="page-inner connection">
        <p className="kicker">Conexión</p>
        <h1 className="page-title">Contenido en GitHub</h1>
        <p className="page-lead">
          Las clases, actividades y la planificación viven en el repositorio. Al conectar
          este dispositivo, la app lee la versión al día (incluidos los borradores) y cada
          «Guardar» crea un commit; el sitio público se actualiza en unos minutos.
        </p>
        {connection ? (
          <section className="card connection-card" aria-label="Estado de la conexión">
            <p>
              <b>Repositorio:</b> {connection.repo} · rama {connection.branch}
            </p>
            <p>
              <b>Estado:</b>{' '}
              {sync.status === 'loading'
                ? 'leyendo…'
                : sync.status === 'offline'
                  ? 'sin conexión (usando la última copia)'
                  : sync.status === 'error'
                    ? `error: ${sync.error ?? ''}`
                    : mode === 'live'
                      ? 'al día'
                      : 'conectando…'}
            </p>
            <p>
              <b>Última lectura:</b> {when(sync.lastSync)}
              {snapshot && <span className="muted"> · commit {snapshot.commit.slice(0, 7)}</span>}
            </p>
            <div className="row">
              <button type="button" className="btn btn-small" onClick={() => void content.refresh()}>
                Actualizar ahora
              </button>
              <button type="button" className="btn btn-small" onClick={() => onNavigate('biblioteca')}>
                Ir a la biblioteca
              </button>
              <button type="button" className="btn btn-small btn-danger-soft" onClick={() => void disconnect()}>
                Desconectar este dispositivo
              </button>
            </div>
          </section>
        ) : (
          <form className="card connection-card" onSubmit={(event) => void submit(event)}>
            <label className="field">
              Repositorio (usuario/nombre)
              <input value={repo} onChange={(event) => setRepo(event.target.value)} />
            </label>
            <label className="field">
              Rama
              <input value={branch} onChange={(event) => setBranch(event.target.value)} />
            </label>
            <label className="field">
              Token de GitHub
              <input
                type="password"
                autoComplete="off"
                spellCheck={false}
                value={token}
                onChange={(event) => setToken(event.target.value)}
              />
            </label>
            {error && (
              <p role="alert" className="alert alert-error small">
                {error}
              </p>
            )}
            <div className="row">
              <button type="submit" className="btn btn-ink" disabled={busy || !token.trim()}>
                {busy ? 'Comprobando…' : 'Conectar'}
              </button>
            </div>
          </form>
        )}
        <section className="card" aria-label="Cómo crear el token">
          <h2>Cómo crear el token (una vez por dispositivo)</h2>
          <ol className="steps-list">
            <li>
              Abre{' '}
              <a href={NEW_TOKEN_URL} target="_blank" rel="noreferrer">
                GitHub → Fine-grained personal access token
              </a>
              .
            </li>
            <li>Ponle un nombre (por ejemplo «Aula · tablet») y una fecha de vencimiento.</li>
            <li>
              En <b>Repository access</b> elige <b>Only select repositories</b> y marca solo{' '}
              <code>{repo || DEFAULT_REPO}</code>.
            </li>
            <li>
              En <b>Permissions → Repository permissions</b> da <b>Contents: Read and write</b>.
              Opcional: <b>Actions: Read-only</b>, para ver aquí si la publicación terminó.
            </li>
            <li>Genera el token, cópialo y pégalo arriba. GitHub no lo vuelve a mostrar.</li>
          </ol>
          <p className="muted small">
            El token queda solo en este navegador. Si pierdes el dispositivo, revócalo en
            GitHub. Tus cursos, sesiones y notas no se suben al repositorio.
          </p>
        </section>
      </div>
    </main>
  );
}
