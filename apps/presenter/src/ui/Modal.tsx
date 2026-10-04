import { useEffect, useRef, type ReactNode } from 'react';

const FOCUSABLE =
  'button:not([disabled]),[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

/** Retiene el foco dentro de `ref`, cierra con Esc y devuelve el foco a quien abrió. */
export function useDialogFocus(
  ref: React.RefObject<HTMLElement | null>,
  onClose: () => void,
) {
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  }, [onClose]);
  useEffect(() => {
    const opener = document.activeElement;
    const node = ref.current;
    const first =
      node?.querySelector<HTMLElement>('[data-autofocus]') ??
      node?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? node)?.focus();
    const key = (event: KeyboardEvent) => {
      const dialog = ref.current;
      if (!dialog) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = [...dialog.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (item) => item.getClientRects().length,
      );
      const head = items[0];
      const tail = items[items.length - 1];
      if (!head || !tail) return;
      if (!dialog.contains(document.activeElement)) {
        event.preventDefault();
        head.focus();
      } else if (event.shiftKey && document.activeElement === head) {
        event.preventDefault();
        tail.focus();
      } else if (!event.shiftKey && document.activeElement === tail) {
        event.preventDefault();
        head.focus();
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      document.removeEventListener('keydown', key, true);
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
    };
  }, [ref]);
}

export function Modal({
  label,
  onClose,
  children,
  className = '',
  placement = 'center',
  role = 'dialog',
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  placement?: 'center' | 'sheet' | 'drawer';
  role?: 'dialog' | 'alertdialog';
}) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogFocus(ref, onClose);
  return (
    <div
      className={`modal-backdrop modal-${placement}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        role={role}
        aria-modal="true"
        aria-label={label}
        tabIndex={-1}
        className={`modal ${className}`}
      >
        {children}
      </div>
    </div>
  );
}
