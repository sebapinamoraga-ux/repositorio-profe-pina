import type { ReactNode } from 'react';
import { Button } from '../../../ui/Button';
import { useVisualViewportHeight } from './touch';

/**
 * Modo enfoque para escribir con el dedo: se ocultan la lista y los encabezados; la lámina se
 * ve cambiar arriba (o a la izquierda), el texto se edita en un panel y los formatos van en una
 * fila sobre el teclado.
 */
export function FocusMode({
  label,
  slide,
  editor,
  formats,
  onDone,
}: {
  label: string;
  slide: ReactNode;
  editor: ReactNode;
  formats: ReactNode;
  onDone: () => void;
}) {
  const height = useVisualViewportHeight();
  return (
    <div
      className="focus-mode"
      role="dialog"
      aria-label={`Escribir en «${label}»`}
      style={{ height }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onDone();
        }
      }}
    >
      <header className="focus-head">
        <b>Escribiendo en «{label}»</b>
        <Button variant="primary" size="sm" onClick={onDone}>
          Listo
        </Button>
      </header>
      <div className="focus-body">
        <div className="focus-slide">{slide}</div>
        <div className="focus-editor">{editor}</div>
      </div>
      <div className="focus-formats">{formats}</div>
    </div>
  );
}
