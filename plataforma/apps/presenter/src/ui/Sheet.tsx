import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './Button';
import { Modal } from './Modal';

/**
 * Hoja que sube desde abajo (celular) o casi a pantalla completa (tableta): una ventana con asa,
 * título y botón para cerrar. Esc, tocar fuera y devolver el foco los resuelve `Modal`.
 */
export function Sheet({
  label,
  title,
  size = 'medium',
  onClose,
  children,
}: {
  label: string;
  title?: ReactNode;
  /** `medium` ocupa hasta el 62 % de la altura; `tall`, hasta el 90 %. */
  size?: 'medium' | 'tall';
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      label={label}
      onClose={onClose}
      placement="sheet"
      className={`sheet is-${size}`}
    >
      <span className="sheet-handle" aria-hidden="true" />
      <div className="sheet-head">
        <h2>{title ?? label}</h2>
        <IconButton label="Cerrar" onClick={onClose}>
          <X size={22} aria-hidden="true" />
        </IconButton>
      </div>
      <div className="sheet-body">{children}</div>
    </Modal>
  );
}
