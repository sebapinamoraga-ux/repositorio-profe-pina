import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { buttonClass, type ButtonVariant } from './Button';

/** Solo hay un menú o panel abierto a la vez: abrir uno avisa a los demás para que cierren. */
const OPENED = 'aula:popover-open';

/**
 * Abrir y cerrar un panel anclado a un botón: clic fuera y Esc lo cierran (Esc devuelve el foco
 * al botón) y abrir otro panel de la app lo cierra.
 */
export function usePopover() {
  const [open, setOpenState] = useState(false);
  const id = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  const setOpen = useCallback(
    (next: boolean) => {
      setOpenState(next);
      if (next) window.dispatchEvent(new CustomEvent(OPENED, { detail: id }));
    },
    [id],
  );
  const close = useCallback((refocus = false) => {
    setOpenState(false);
    if (refocus) trigger.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const outside = (event: MouseEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpenState(false);
    };
    const key = (event: globalThis.KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      close(true);
    };
    const other = (event: Event) => {
      if (event instanceof CustomEvent && event.detail !== id)
        setOpenState(false);
    };
    document.addEventListener('mousedown', outside);
    document.addEventListener('keydown', key);
    window.addEventListener(OPENED, other);
    return () => {
      document.removeEventListener('mousedown', outside);
      document.removeEventListener('keydown', key);
      window.removeEventListener(OPENED, other);
    };
  }, [open, id, close]);

  return { open, setOpen, close, root, trigger, id };
}

export type MenuEntry =
  | 'separator'
  | {
      key: string;
      label: string;
      /** Segunda línea, en gris. */
      hint?: string;
      /** A la derecha: un atajo o un estado. */
      aside?: string;
      icon?: ReactNode;
      danger?: boolean;
      disabled?: boolean;
      onSelect: () => void;
    };

function MenuList({
  entries,
  close,
  label,
  align,
  menuRef,
}: {
  entries: readonly MenuEntry[];
  close: (refocus?: boolean) => void;
  label: string;
  align: 'left' | 'right';
  menuRef: RefObject<HTMLDivElement | null>;
}) {
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = [
      ...(menuRef.current?.querySelectorAll<HTMLButtonElement>(
        '[role="menuitem"]:not(:disabled)',
      ) ?? []),
    ];
    const at = items.indexOf(document.activeElement as HTMLButtonElement);
    const go = (k: number) => {
      event.preventDefault();
      items[(k + items.length) % items.length]?.focus();
    };
    if (event.key === 'ArrowDown') go(at + 1);
    else if (event.key === 'ArrowUp') go(at < 0 ? -1 : at - 1);
    else if (event.key === 'Home') go(0);
    else if (event.key === 'End') go(-1);
    else if (event.key === 'Tab') close();
  };
  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label={label}
      className={`menu-list is-${align}`}
      onKeyDown={move}
    >
      {entries.map((entry, k) =>
        entry === 'separator' ? (
          <div key={`sep-${k}`} role="separator" className="menu-sep" />
        ) : (
          <button
            key={entry.key}
            type="button"
            role="menuitem"
            className={`menu-item ${entry.danger ? 'is-danger' : ''}`}
            disabled={entry.disabled}
            onClick={() => {
              close(true);
              entry.onSelect();
            }}
          >
            <span className="menu-icon" aria-hidden="true">
              {entry.icon}
            </span>
            <span className="menu-text">
              <span>{entry.label}</span>
              {entry.hint && <small>{entry.hint}</small>}
            </span>
            {entry.aside && <kbd className="menu-aside">{entry.aside}</kbd>}
          </button>
        ),
      )}
    </div>
  );
}

function useOpenFocus(
  open: boolean,
  menuRef: RefObject<HTMLDivElement | null>,
) {
  useEffect(() => {
    if (open)
      menuRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus();
  }, [open, menuRef]);
}

/** Botón que abre un menú de acciones. */
export function Menu({
  label,
  entries,
  children,
  align = 'right',
  className = '',
}: {
  /** Nombre accesible del botón y del menú. */
  label: string;
  entries: readonly MenuEntry[];
  children: ReactNode;
  align?: 'left' | 'right';
  className?: string;
}) {
  const { open, setOpen, close, root, trigger } = usePopover();
  const list = useRef<HTMLDivElement>(null);
  useOpenFocus(open, list);
  return (
    <div className="menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={className || 'menu-trigger'}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        {children}
      </button>
      {open && (
        <MenuList
          entries={entries}
          close={close}
          label={label}
          align={align}
          menuRef={list}
        />
      )}
    </div>
  );
}

/** Botón dividido: la acción principal y una flecha con otras formas de hacerlo. */
export function SplitButton({
  variant = 'secondary',
  main,
  arrowLabel,
  entries,
}: {
  variant?: ButtonVariant;
  main: { label: ReactNode; disabled?: boolean; onClick: () => void };
  arrowLabel: string;
  entries: readonly MenuEntry[];
}) {
  const { open, setOpen, close, root, trigger } = usePopover();
  const list = useRef<HTMLDivElement>(null);
  useOpenFocus(open, list);
  return (
    <div className="menu split" ref={root}>
      <button
        type="button"
        className={buttonClass({
          variant,
          size: 'sm',
          className: 'split-main',
        })}
        disabled={main.disabled}
        onClick={main.onClick}
      >
        {main.label}
      </button>
      <button
        ref={trigger}
        type="button"
        className={buttonClass({
          variant,
          size: 'sm',
          className: 'split-arrow',
        })}
        aria-label={arrowLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <MenuList
          entries={entries}
          close={close}
          label={arrowLabel}
          align="right"
          menuRef={list}
        />
      )}
    </div>
  );
}
