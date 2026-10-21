import { X } from 'lucide-react';
import { useContent } from '../content/ContentProvider';
import { describePath } from '../content/validate';
import { Button, IconButton } from '../ui/Button';
import { Modal } from '../ui/Modal';

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
    } else if (
      j < b.length &&
      (i >= a.length || (table[i]?.[j + 1] ?? 0) >= (table[i + 1]?.[j] ?? 0))
    ) {
      out.push({ kind: '+', text: b[j] ?? '' });
      j++;
    } else {
      out.push({ kind: '-', text: a[i] ?? '' });
      i++;
    }
  }
  return out;
}

export function ConflictDialog({ onClose }: { onClose: () => void }) {
  const { wc, resolve } = useContent();
  if (!wc.conflicts.length) return null;
  return (
    <Modal
      label="Resolver conflictos"
      onClose={onClose}
      className="conflict-dialog"
    >
      <div className="modal-head">
        <div>
          <p className="kicker kicker--danger">Cambios en otro dispositivo</p>
          <h2>
            Estos archivos cambiaron en el repositorio mientras los editabas
          </h2>
        </div>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      {wc.conflicts.map((conflict) => {
        const ours = conflict.ours.op === 'put' ? conflict.ours.text : '';
        const diff = lineDiff(conflict.theirs ?? '', ours).filter(
          (line, k, all) =>
            line.kind !== ' ' ||
            all
              .slice(Math.max(0, k - 2), k + 3)
              .some((near) => near.kind !== ' '),
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
                  <span
                    key={k}
                    className={`diff-${line.kind === '+' ? 'add' : line.kind === '-' ? 'del' : 'same'}`}
                  >
                    {line.kind} {line.text}
                    {'\n'}
                  </span>
                ))}
              </pre>
            )}
            <div className="row">
              <Button
                variant="primary"
                size="sm"
                onClick={() => resolve(conflict.path, 'mine')}
              >
                Conservar mi versión
              </Button>
              <Button
                size="sm"
                onClick={() => resolve(conflict.path, 'theirs')}
              >
                Tomar la del repositorio
              </Button>
            </div>
          </section>
        );
      })}
    </Modal>
  );
}

export function runSummary(
  runs: { status: string; conclusion: string | null }[] | null,
) {
  if (runs === null) return 'Se publicará en unos minutos.';
  if (!runs.length) return 'Esperando la verificación de GitHub…';
  if (runs.some((run) => run.status !== 'completed'))
    return 'Verificando y publicando…';
  if (runs.every((run) => run.conclusion === 'success')) return 'Publicado.';
  return 'La verificación de GitHub falló: el sitio sigue con la versión anterior.';
}

/** Archivos con cambios sin guardar, con su nombre para el docente. */
export function PendingFiles({
  className = 'save-bar-files',
}: {
  className?: string;
}) {
  const { pending, wc } = useContent();
  return (
    <ul className={className}>
      {pending.map((path) => (
        <li key={path}>
          {describePath(path)}
          {wc.changes[path]?.op === 'delete' ? ' (se borra)' : ''}
        </li>
      ))}
    </ul>
  );
}
