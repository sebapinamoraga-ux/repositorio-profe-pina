import { useId } from 'react';
import {
  interseccionAfines,
  marcasEje,
  tramosMenor,
  validarVentana,
  type FuncionAfin,
} from './function-graph';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);

/**
 * Dos funciones afines en un mismo plano: su intersección (la solución del sistema)
 * y, opcionalmente, el tramo en que cada una toma el menor valor.
 */
export function GraficoComparacion({
  m1,
  n1,
  m2,
  n2,
  xMin,
  xMax,
  yMin,
  yMax,
  pasoX = 1,
  pasoY = 1,
  ejeX = 'x',
  ejeY = 'y',
  etiqueta1,
  etiqueta2,
  resaltarMenor = false,
  marcarInterseccion = true,
  rotularInterseccion = true,
  descripcion,
}: {
  m1: number;
  n1: number;
  m2: number;
  n2: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  pasoX?: number;
  pasoY?: number;
  ejeX?: string;
  ejeY?: string;
  etiqueta1: string;
  etiqueta2: string;
  resaltarMenor?: boolean;
  /** Dibuja el punto común y sus guías hacia los ejes. */
  marcarInterseccion?: boolean;
  /** Escribe las coordenadas del punto común. */
  rotularInterseccion?: boolean;
  descripcion: string;
}) {
  const clipId = useId().replaceAll(':', '');
  validarVentana({ xMin, xMax, yMin, yMax });
  const primera: FuncionAfin = { m: m1, n: n1 };
  const segunda: FuncionAfin = { m: m2, n: n2 };
  if (![m1, n1, m2, n2].every(Number.isFinite))
    throw new Error('GraficoComparacion requiere coeficientes finitos.');
  const corte = interseccionAfines(primera, segunda);
  const tramos = resaltarMenor ? tramosMenor(primera, segunda, xMin, xMax) : [];
  const left = 92;
  const top = 34;
  const plotWidth = 478;
  const plotHeight = 372;
  const sx = (x: number) => left + ((x - xMin) / (xMax - xMin)) * plotWidth;
  const sy = (y: number) => top + ((yMax - y) / (yMax - yMin)) * plotHeight;
  const axisY = yMin <= 0 && yMax >= 0 ? sy(0) : sy(yMin);
  const axisX = xMin <= 0 && xMax >= 0 ? sx(0) : sx(xMin);
  const xTicks = marcasEje(xMin, xMax, pasoX);
  const yTicks = marcasEje(yMin, yMax, pasoY);
  const recta = (f: FuncionAfin) => ({
    x1: sx(xMin),
    y1: sy(f.m * xMin + f.n),
    x2: sx(xMax),
    y2: sy(f.m * xMax + f.n),
  });
  const visible =
    marcarInterseccion &&
    corte !== null &&
    corte.x >= xMin &&
    corte.x <= xMax &&
    corte.y >= yMin &&
    corte.y <= yMax;
  return (
    <div className="graph graph-function graph-comparison">
      <svg viewBox="0 0 640 490" role="img" aria-label={descripcion}>
        <defs>
          <clipPath id={clipId}>
            <rect x={left} y={top} width={plotWidth} height={plotHeight} />
          </clipPath>
        </defs>
        {xTicks.map((x) => (
          <line
            key={`gx${x}`}
            className="graph-grid-line"
            x1={sx(x)}
            x2={sx(x)}
            y1={top}
            y2={top + plotHeight}
          />
        ))}
        {yTicks.map((y) => (
          <line
            key={`gy${y}`}
            className="graph-grid-line"
            x1={left}
            x2={left + plotWidth}
            y1={sy(y)}
            y2={sy(y)}
          />
        ))}
        {tramos.map((tramo) => (
          <rect
            key={`t${tramo.desde}`}
            className={`comparison-band-${tramo.menor}`}
            x={sx(tramo.desde)}
            y={axisY - 14}
            width={sx(tramo.hasta) - sx(tramo.desde)}
            height="14"
          />
        ))}
        <line
          className="graph-axis"
          x1={left}
          x2={left + plotWidth}
          y1={axisY}
          y2={axisY}
        />
        <line
          className="graph-axis"
          x1={axisX}
          x2={axisX}
          y1={top}
          y2={top + plotHeight}
        />
        {xTicks.map((x) => (
          <text
            key={`lx${x}`}
            className="graph-axis-label"
            x={sx(x)}
            y={axisY + 26}
            textAnchor="middle"
            fontSize="19"
          >
            {formatNumber(x)}
          </text>
        ))}
        {yTicks
          .filter((y) => y !== yMin)
          .map((y) => (
            <text
              key={`ly${y}`}
              className="graph-axis-label"
              x={axisX - 10}
              y={sy(y) + 7}
              textAnchor="end"
              fontSize="19"
            >
              {formatNumber(y)}
            </text>
          ))}
        <g clipPath={`url(#${clipId})`}>
          <line
            className="graph-primary-line"
            strokeWidth="6"
            {...recta(primera)}
          />
          <line
            className="graph-secondary-line"
            strokeWidth="6"
            {...recta(segunda)}
          />
          {visible && corte && (
            <>
              <line
                className="graph-guide"
                x1={sx(corte.x)}
                x2={sx(corte.x)}
                y1={sy(corte.y)}
                y2={axisY}
              />
              <line
                className="graph-guide"
                x1={axisX}
                x2={sx(corte.x)}
                y1={sy(corte.y)}
                y2={sy(corte.y)}
              />
              <circle
                className="graph-intersection"
                cx={sx(corte.x)}
                cy={sy(corte.y)}
                r="11"
              />
            </>
          )}
        </g>
        {visible && rotularInterseccion && corte && (
          <text
            className="graph-point-label"
            x={sx(corte.x) - 16}
            y={sy(corte.y) - 20}
            textAnchor="end"
            fontSize="22"
          >
            ({formatNumber(corte.x)}; {formatNumber(corte.y)})
          </text>
        )}
        <text
          className="graph-axis-title"
          x={left + plotWidth}
          y={axisY + 56}
          textAnchor="end"
          fontSize="20"
        >
          {ejeX}
        </text>
        <text
          className="graph-axis-title"
          x={axisX + 10}
          y={top - 12}
          fontSize="20"
        >
          {ejeY}
        </text>
      </svg>
      <div className="graph-caption">
        <span>{etiqueta1}</span>
        <span>{etiqueta2}</span>
      </div>
    </div>
  );
}
