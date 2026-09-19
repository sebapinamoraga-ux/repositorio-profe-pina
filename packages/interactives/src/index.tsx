import { useId } from 'react';
import { useSlide } from '@aula/pedagogical-ui';
export function GraficoSistema({
  sumaInicial = 7,
  sumaEstatica = 7,
}: {
  sumaInicial?: number;
  sumaEstatica?: number;
}) {
  const runtime = useSlide();
  const id = useId().replaceAll(':', '');
  const sum = runtime.print
    ? sumaEstatica
    : Number(runtime.values['graph-sum'] ?? sumaInicial);
  const sx = (x: number) => 60 + x * 65;
  const sy = (y: number) => 450 - y * 50;
  const x = (sum + 1) / 2;
  const y = (sum - 1) / 2;
  return (
    <div className="graph">
      <svg
        viewBox="0 0 650 520"
        role="img"
        aria-label={`Las rectas x más y igual a ${sum} y x menos y igual a 1 se cortan en ${x}, ${y}.`}
      >
        <defs>
          <clipPath id={id}>
            <rect x="60" y="40" width="520" height="410" />
          </clipPath>
        </defs>
        {Array.from({ length: 9 }, (_, n) => (
          <g key={n}>
            <line x1={sx(n)} x2={sx(n)} y1="40" y2="450" stroke="#2b3947" />
            <line x1="60" x2="580" y1={sy(n)} y2={sy(n)} stroke="#2b3947" />
            <text
              x={sx(n)}
              y="480"
              fill="#c3ced8"
              textAnchor="middle"
              fontSize="20"
            >
              {n}
            </text>
            <text x="35" y={sy(n) + 7} fill="#c3ced8" fontSize="20">
              {n}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${id})`}>
          <line
            x1={sx(0)}
            y1={sy(sum)}
            x2={sx(8)}
            y2={sy(sum - 8)}
            stroke="#91c9ff"
            strokeWidth="5"
          />
          <line
            x1={sx(0)}
            y1={sy(-1)}
            x2={sx(8)}
            y2={sy(7)}
            stroke="#e4bc78"
            strokeWidth="5"
          />
          <circle cx={sx(x)} cy={sy(y)} r="9" fill="#bbefd8" />
        </g>
        <text x={sx(x) + 14} y={sy(y) - 17} fill="#bbefd8" fontSize="26">
          ({x}; {y})
        </text>
        <text x="605" y="455" fill="white" fontSize="26">
          x
        </text>
        <text x="55" y="27" fill="white" fontSize="26">
          y
        </text>
      </svg>
      <div className="graph-caption">
        <span>x + y = {sum}</span>
        <span>x − y = 1</span>
      </div>
      {!runtime.print && (
        <div className="graph-controls">
          <label>
            Explorar la primera ecuación{' '}
            <input
              aria-label="Suma de las variables"
              type="range"
              min="3"
              max="9"
              step="2"
              value={sum}
              onChange={(e) => runtime.setValue('graph-sum', e.target.value)}
            />
          </label>
          <button
            onClick={() => runtime.setValue('graph-sum', String(sumaInicial))}
          >
            Restablecer
          </button>
        </div>
      )}
    </div>
  );
}
