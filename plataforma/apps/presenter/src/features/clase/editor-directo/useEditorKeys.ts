import { useEffect, useRef } from 'react';

interface Handlers {
  /** Sube (-1) o baja (+1) la lámina elegida. */
  onMove: (direction: -1 | 1) => void;
  onDuplicate: () => void;
  onShortcuts: () => void;
  /** Esc con varias láminas elegidas. */
  onClearSelection: () => void;
  hasSelection: boolean;
}

const typing = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

/**
 * Atajos del editor: Alt + ↑ ↓ mueve la lámina, Ctrl + D la duplica (solo con el foco dentro del
 * editor), «?» abre la lista y Esc quita la selección múltiple. Ninguno actúa dentro de campos.
 */
export function useEditorKeys(
  container: HTMLElement | null,
  handlers: Handlers,
) {
  const latest = useRef(handlers);
  useEffect(() => {
    latest.current = handlers;
  });
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      const now = latest.current;
      if (
        event.altKey &&
        (event.key === 'ArrowUp' || event.key === 'ArrowDown')
      ) {
        if (
          typing(event.target) ||
          !container?.contains(document.activeElement)
        )
          return;
        event.preventDefault();
        now.onMove(event.key === 'ArrowUp' ? -1 : 1);
      } else if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 'd'
      ) {
        if (!container?.contains(document.activeElement)) return;
        event.preventDefault();
        now.onDuplicate();
      } else if (
        event.key === '?' &&
        !event.ctrlKey &&
        !event.metaKey &&
        !typing(event.target)
      ) {
        event.preventDefault();
        now.onShortcuts();
      } else if (
        event.key === 'Escape' &&
        now.hasSelection &&
        !typing(event.target)
      ) {
        now.onClearSelection();
      }
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [container]);
}
