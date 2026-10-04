import { useId } from 'react';
import { marcasEje } from './function-graph';
import { parsearIntervalo } from './interval';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value);

/** Recta numérica estática con uno o dos intervalos; los intervalos pertenecen al contenido. */
export function RectaIntervalos({
  min,
  max,
  paso = 1,
  intervalos,
  etiquetas = [],
  tonos = [],
  descripcion,
}: {
  min: number;
  max: number;
  paso?: number;
  intervalos: string[];
  etiquetas?: string[];
  /** Color de cada intervalo (1 o 2); por defecto, 1 y 2 en orden. */
  tonos?: number[];
  descripcion: string;
}) {
  const markerId = useId().replaceAll(':', '');
  if (!(min < max)) throw new Error('RectaIntervalos requiere min < max.');
  if (intervalos.length < 1 || intervalos.length > 2)
    throw new Error('RectaIntervalos admite uno o dos intervalos.');
  const parsed = intervalos.map(parsearIntervalo);
  const left = 70;
  const right = 1130;
  const axis = 115;
  const sx = (v: number) =>
    left +
    ((Math.min(Math.max(v, min), max) - min) / (max - min)) * (right - left);
  const ticks = marcasEje(min, max, paso);
  const extremos = parsed
    .flatMap((i) => [i.desde, i.hasta])
    .filter(
      (v) =>
        Number.isFinite(v) &&
        v >= min &&
        v <= max &&
        !ticks.some((t) => Math.abs(t - v) < 1e-9),
    );
  return (
    <div className="number-line">
      <svg viewBox="0 40 1200 140" role="img" aria-label={descripcion}>
        <defs>
          {[1, 2].map((tone) => (
            <marker
              key={tone}
              id={`${markerId}-${tone}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="3"
              markerHeight="3"
              orient="auto-start-reverse"
            >
              <path
                d="M0,0 L10,5 L0,10 z"
                className={`interval-fill-${tone}`}
              />
            </marker>
          ))}
        </defs>
        <line
          className="number-line-axis"
          x1={left - 20}
          x2={right + 20}
          y1={axis}
          y2={axis}
        />
        {ticks.map((t) => (
          <g key={t}>
            <line
              className="number-line-axis"
              x1={sx(t)}
              x2={sx(t)}
              y1={axis - 12}
              y2={axis + 12}
            />
            <text
              className="number-line-label"
              x={sx(t)}
              y={axis + 50}
              textAnchor="middle"
              fontSize="26"
            >
              {formatNumber(t)}
            </text>
          </g>
        ))}
        {extremos.map((v) => (
          <text
            key={`e${v}`}
            className="number-line-label number-line-label-strong"
            x={sx(v)}
            y={axis + 50}
            textAnchor="middle"
            fontSize="26"
          >
            {formatNumber(v)}
          </text>
        ))}
        {parsed.map((intervalo, index) => {
          const tone = tonos[index] ?? index + 1;
          if (tone !== 1 && tone !== 2)
            throw new Error('RectaIntervalos admite tonos 1 o 2.');
          const start = sx(intervalo.desde);
          const end = sx(intervalo.hasta);
          const infiniteStart =
            !Number.isFinite(intervalo.desde) || intervalo.desde < min;
          const infiniteEnd =
            !Number.isFinite(intervalo.hasta) || intervalo.hasta > max;
          return (
            <g key={index}>
              <line
                className={`interval-stroke-${tone}`}
                strokeWidth="10"
                x1={infiniteStart ? left - 18 : start}
                x2={infiniteEnd ? right + 18 : end}
                y1={axis}
                y2={axis}
                markerStart={
                  infiniteStart ? `url(#${markerId}-${tone})` : undefined
                }
                markerEnd={
                  infiniteEnd ? `url(#${markerId}-${tone})` : undefined
                }
              />
              {!infiniteStart && (
                <circle
                  className={
                    intervalo.cerradoDesde
                      ? `interval-fill-${tone}`
                      : `interval-open interval-open-${tone}`
                  }
                  cx={start}
                  cy={axis}
                  r="13"
                />
              )}
              {!infiniteEnd && (
                <circle
                  className={
                    intervalo.cerradoHasta
                      ? `interval-fill-${tone}`
                      : `interval-open interval-open-${tone}`
                  }
                  cx={end}
                  cy={axis}
                  r="13"
                />
              )}
              <text
                className={`interval-text-${tone}`}
                x={
                  ((infiniteStart ? left : start) +
                    (infiniteEnd ? right : end)) /
                  2
                }
                y={axis - 40}
                textAnchor="middle"
                fontSize="28"
              >
                {intervalos[index]}
                {etiquetas[index] ? ` · ${etiquetas[index]}` : ''}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
