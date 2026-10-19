import { useEffect, useRef, useState, type ReactNode } from 'react';

/** Escala el lienzo de 1600×900 para que quepa entero en su contenedor, sin recortes ni scroll. */
export function FitSlide({
  children,
  className = '',
  mode = 'contain',
}: {
  children: ReactNode;
  className?: string;
  mode?: 'contain' | 'width';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () =>
      setBox({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const scale =
    mode === 'width' ? box.w / 1600 : Math.min(box.w / 1600, box.h / 900);
  const x = mode === 'width' ? 0 : (box.w - 1600 * scale) / 2;
  const y = mode === 'width' ? 0 : (box.h - 900 * scale) / 2;
  return (
    <div
      ref={ref}
      className={`fit-slide fit-${mode} ${className}`}
      style={mode === 'width' ? { height: 900 * scale } : undefined}
    >
      {box.w > 0 && (
        <div
          className="fit-stage"
          style={{ transform: `translate(${x}px, ${y}px) scale(${scale})` }}
        >
          {children}
        </div>
      )}
    </div>
  );
}
