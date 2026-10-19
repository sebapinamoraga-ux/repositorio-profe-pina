import { useId } from 'react';

/** Máquina de una función: entrada → regla → salida, estática y declarada por el contenido. */
export function MaquinaFuncion({
  entrada,
  regla,
  salida,
  descripcion,
}: {
  entrada: string;
  regla: string;
  salida: string;
  descripcion: string;
}) {
  const markerId = useId().replaceAll(':', '');
  const boxes = [
    {
      x: 8,
      width: 150,
      label: 'entrada',
      text: entrada,
      className: 'machine-io-1',
    },
    {
      x: 222,
      width: 196,
      label: 'regla',
      text: regla,
      className: 'machine-rule',
    },
    {
      x: 482,
      width: 150,
      label: 'salida',
      text: salida,
      className: 'machine-io-2',
    },
  ];
  return (
    <div className="machine">
      <svg viewBox="0 0 640 150" role="img" aria-label={descripcion}>
        <defs>
          <marker
            id={markerId}
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="4.5"
            markerHeight="4.5"
            orient="auto"
          >
            <path d="M0,0 L10,5 L0,10 z" className="sagittal-head" />
          </marker>
        </defs>
        {boxes.map((box) => (
          <g key={box.label}>
            <text
              className="machine-label"
              x={box.x + box.width / 2}
              y="28"
              textAnchor="middle"
              fontSize="20"
            >
              {box.label}
            </text>
            <rect
              className={box.className}
              x={box.x}
              y="44"
              width={box.width}
              height="86"
              rx="14"
            />
            <text
              className="machine-text"
              x={box.x + box.width / 2}
              y="97"
              textAnchor="middle"
              fontSize="27"
            >
              {box.text}
            </text>
          </g>
        ))}
        {[
          [160, 218],
          [420, 478],
        ].map(([x1, x2]) => (
          <line
            key={x1}
            className="sagittal-arrow"
            x1={x1}
            x2={x2}
            y1="87"
            y2="87"
            strokeWidth="4"
            markerEnd={`url(#${markerId})`}
          />
        ))}
      </svg>
    </div>
  );
}
