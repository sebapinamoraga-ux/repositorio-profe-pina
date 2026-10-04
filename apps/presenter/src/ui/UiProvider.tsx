import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Check } from 'lucide-react';
import { Modal } from './Modal';

interface ConfirmOptions {
  title: string;
  body?: string;
  ok?: string;
  cancel?: string;
  danger?: boolean;
}
interface Toast {
  id: number;
  message: string;
  undo?: () => void;
}
interface UiValue {
  /** Aviso breve; con `undo` ofrece «Deshacer» durante unos segundos. */
  toast: (message: string, undo?: () => void, ms?: number) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  say: (message: string) => void;
}

const UiContext = createContext<UiValue | null>(null);
export function useUi() {
  const value = useContext(UiContext);
  if (!value) throw new Error('useUi requiere UiProvider');
  return value;
}

export function UiProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const [live, setLive] = useState('');
  const [dialog, setDialog] = useState<
    (ConfirmOptions & { resolve: (value: boolean) => void }) | null
  >(null);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  const show = useCallback(
    (message: string, undo?: () => void, ms = 8000) => {
      clearTimeout(timer.current);
      setToast({ id: Date.now(), message, undo });
      setLive(message + (undo ? '. Puedes deshacer.' : ''));
      timer.current = setTimeout(() => setToast(null), ms);
    },
    [],
  );
  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => setDialog({ ...options, resolve })),
    [],
  );
  const say = useCallback((message: string) => {
    setLive('');
    setTimeout(() => setLive(message), 30);
  }, []);
  const value = useMemo(
    () => ({ toast: show, confirm, say }),
    [show, confirm, say],
  );
  const close = (result: boolean) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <UiContext.Provider value={value}>
      {children}
      <div className="sr-only" aria-live="polite">
        {live}
      </div>
      {toast && (
        <div className="toast" key={toast.id}>
          <Check size={20} aria-hidden="true" className="toast-icon" />
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo?.();
                show('Acción deshecha', undefined, 3000);
              }}
            >
              Deshacer
            </button>
          )}
        </div>
      )}
      {dialog && (
        <Modal
          label={dialog.title}
          onClose={() => close(false)}
          role="alertdialog"
          className="confirm"
        >
          <h2>{dialog.title}</h2>
          {dialog.body && <p>{dialog.body}</p>}
          <div className="modal-actions">
            <button
              type="button"
              className="btn"
              data-autofocus={dialog.danger ? '' : undefined}
              onClick={() => close(false)}
            >
              {dialog.cancel ?? 'Cancelar'}
            </button>
            <button
              type="button"
              className={dialog.danger ? 'btn btn-danger' : 'btn btn-ink'}
              data-autofocus={dialog.danger ? undefined : ''}
              onClick={() => close(true)}
            >
              {dialog.ok ?? 'Aceptar'}
            </button>
          </div>
        </Modal>
      )}
    </UiContext.Provider>
  );
}
