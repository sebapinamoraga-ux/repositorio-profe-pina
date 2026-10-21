import { ChevronDown, Undo2 } from 'lucide-react';
import { useUi } from '../../../ui/UiProvider';
import { usePopover } from '../../../ui/Menu';
import { useLessonHistory } from './HistoryContext';

/** «hace 12 s», «hace 3 min». */
export function ago(at: number, now = Date.now()) {
  const seconds = Math.max(0, Math.round((now - at) / 1000));
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  return minutes < 60
    ? `hace ${minutes} min`
    : `hace ${Math.round(minutes / 60)} h`;
}

const hint = (k: number) =>
  k === 0
    ? 'Deshacer este cambio'
    : k === 1
      ? 'Deshacer este cambio y el posterior'
      : `Deshacer este cambio y los ${k} posteriores`;

/**
 * Deshacer el último cambio y, en la flecha, «Últimos cambios»: volver a como estaba antes de
 * cualquiera de los cinco últimos.
 */
export function HistoryMenu() {
  const history = useLessonHistory();
  const ui = useUi();
  const { open, setOpen, root, trigger } = usePopover();
  const { entries, canUndo } = history;
  const undo = (k: number) => {
    const message = history.undoTo(k);
    if (message) ui.toast(message);
    setOpen(false);
  };
  return (
    <div className="menu undo-menu" ref={root}>
      <button
        type="button"
        className="undo-main"
        aria-label="Deshacer"
        title={
          canUndo ? 'Deshacer el último cambio (Ctrl + Z)' : 'Nada que deshacer'
        }
        disabled={!canUndo}
        onClick={() => undo(0)}
      >
        <Undo2 size={18} aria-hidden="true" />
      </button>
      <button
        ref={trigger}
        type="button"
        className="undo-more"
        aria-label="Últimos cambios"
        title={canUndo ? 'Últimos cambios' : 'Nada que deshacer'}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={!canUndo}
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div
          className="popover-panel undo-panel"
          role="dialog"
          aria-label="Últimos cambios"
        >
          <p className="kicker">Últimos cambios</p>
          <ul>
            {entries.map((entry, k) => (
              <li key={entry.seq}>
                <button type="button" title={hint(k)} onClick={() => undo(k)}>
                  <Undo2 size={16} aria-hidden="true" />
                  <span>{entry.label}</span>
                  <small>{ago(entry.at)}</small>
                </button>
              </li>
            ))}
          </ul>
          <p className="muted small">
            Clic en un cambio para volver a como estaba antes de él. Ctrl + Z
            deshace el último.
          </p>
        </div>
      )}
    </div>
  );
}
