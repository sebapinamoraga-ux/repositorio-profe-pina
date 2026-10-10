import { useId } from 'react';
import { useSlide } from '@aula/pedagogical-ui';
import {
  expresionCuadratica,
  marcasEje,
  muestrearCurva,
  verticeCuadratica,
  type Curva,
} from './function-graph';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 2 }).format(value);

/** Con a = 0 la expresión deja de ser cuadrática y se dibuja la recta bx + c. */
const curvaDe = (a: number, b: number, c: number): Curva =>
  a === 0 ? { tipo: 'afin', m: b, n: c } : { tipo: 'cuadratica', a, b, c };

/**
 * Parábola y = ax² + bx + c con controles para a y c; b queda fijo salvo con `variarB`.
 * La curva inicial se conserva discontinua como referencia y `marcarVertice` rotula el
 * vértice. El PDF muestra los valores estáticos declarados.
 */
export function ExploradorCuadratica({
  id,
  b,
  aInicial,
  cInicial,
  aEstatico,
  cEstatico,
  aMin = -3,
  aMax = 3,
  aPaso = 0.5,
  cMin = -4,
  cMax = 4,
  cPaso = 1,
  variarB = false,
  bEstatico,
  bMin = -4,
  bMax = 4,
  bPaso = 1,
  marcarVertice = false,
  xMin,
  xMax,
  yMin,
  yMax,
  paso = 1,
  pasoY,
  descripcion,
}: {
  id: string;
  b: number;
  aInicial: number;
  cInicial: number;
  aEstatico: number;
  cEstatico: number;
  aMin?: number;
  aMax?: number;
  aPaso?: number;
  cMin?: number;
  cMax?: number;
  cPaso?: number;
  /** Agrega un control para b; `b` pasa a ser su valor inicial. */
  variarB?: boolean;
  /** b en la versión impresa; por defecto, `b`. */
  bEstatico?: number;
  bMin?: number;
  bMax?: number;
  bPaso?: number;
  marcarVertice?: boolean;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  paso?: number;
  pasoY?: number;
  descripcion: string;
}) {
  const runtime = useSlide();
  const clipId = useId().replaceAll(':', '');
  if (aInicial === 0)
    throw new Error('ExploradorCuadratica requiere aInicial ≠ 0.');
  const keyA = `cuadratica-${id}-a`;
  const keyC = `cuadratica-${id}-c`;
  const keyB = `cuadratica-${id}-b`;
  const a = runtime.print
    ? aEstatico
    : Number(runtime.values[keyA] ?? aInicial);
  const c = runtime.print
    ? cEstatico
    : Number(runtime.values[keyC] ?? cInicial);
  const bInicial = b;
  const bActual = runtime.print
    ? (bEstatico ?? bInicial)
    : variarB
      ? Number(runtime.values[keyB] ?? bInicial)
      : bInicial;
  const ventana = { xMin, xMax, yMin, yMax };
  const left = 60;
  const top = 40;
  const unitX = 500 / (xMax - xMin);
  const unitY = 400 / (yMax - yMin);
  const sx = (x: number) => left + (x - xMin) * unitX;
  const sy = (y: number) => top + (yMax - y) * unitY;
  const path = (curva: Curva) =>
    muestrearCurva(curva, ventana)
      .map(
        (point, index) =>
          `${index === 0 ? 'M' : 'L'}${sx(point.x).toFixed(2)} ${sy(point.y).toFixed(2)}`,
      )
      .join(' ');
  const cambiada = a !== aInicial || c !== cInicial || bActual !== bInicial;
  const vertice =
    marcarVertice && a !== 0 ? verticeCuadratica(a, bActual, c) : null;
  const verticeVisible =
    vertice !== null &&
    vertice.x >= xMin &&
    vertice.x <= xMax &&
    vertice.y >= yMin &&
    vertice.y <= yMax;
  const axisY = yMin <= 0 && yMax >= 0 ? sy(0) : sy(yMin);
  const axisX = xMin <= 0 && xMax >= 0 ? sx(0) : sx(xMin);
  const corteVisible = xMin <= 0 && xMax >= 0 && c >= yMin && c <= yMax;
  return (
    <div className="graph graph-function">
      <svg viewBox="0 0 620 490" role="img" aria-label={descripcion}>
        <defs>
          <clipPath id={clipId}>
            <rect x={left} y={top} width="500" height="400" />
          </clipPath>
        </defs>
        {marcasEje(xMin, xMax, paso).map((x) => (
          <line
            key={`gx${x}`}
            className="graph-grid-line"
            x1={sx(x)}
            x2={sx(x)}
            y1={top}
            y2={top + 400}
          />
        ))}
        {marcasEje(yMin, yMax, pasoY ?? paso).map((y) => (
          <line
            key={`gy${y}`}
            className="graph-grid-line"
            x1={left}
            x2={left + 500}
            y1={sy(y)}
            y2={sy(y)}
          />
        ))}
        <line
          className="graph-axis"
          x1={left}
          x2={left + 500}
          y1={axisY}
          y2={axisY}
        />
        <line
          className="graph-axis"
          x1={axisX}
          x2={axisX}
          y1={top}
          y2={top + 400}
        />
        {marcasEje(xMin, xMax, paso)
          .filter((x) => x !== 0)
          .map((x) => (
            <text
              key={`lx${x}`}
              className="graph-axis-label"
              x={sx(x)}
              y={axisY + 24}
              textAnchor="middle"
              fontSize="19"
            >
              {formatNumber(x)}
            </text>
          ))}
        {marcasEje(yMin, yMax, pasoY ?? paso)
          .filter((y) => y !== 0)
          .map((y) => (
            <text
              key={`ly${y}`}
              className="graph-axis-label"
              x={axisX - 9}
              y={sy(y) + 7}
              textAnchor="end"
              fontSize="19"
            >
              {formatNumber(y)}
            </text>
          ))}
        <g clipPath={`url(#${clipId})`}>
          {cambiada && (
            <path
              className="graph-secondary-line"
              d={path(curvaDe(aInicial, bInicial, cInicial))}
              strokeWidth="4"
              strokeDasharray="14 10"
              fill="none"
            />
          )}
          <path
            className="graph-primary-line graph-curve"
            d={path(curvaDe(a, bActual, c))}
            strokeWidth="6"
            fill="none"
          />
          {corteVisible && (
            <circle
              className="graph-intersection"
              cx={sx(0)}
              cy={sy(c)}
              r="10"
            />
          )}
          {verticeVisible && (
            <circle
              className="graph-vertex"
              cx={sx(vertice.x)}
              cy={sy(vertice.y)}
              r="10"
            />
          )}
        </g>
        {verticeVisible && (
          <text
            className="graph-point-label graph-vertex-label"
            x={sx(vertice.x)}
            y={sy(vertice.y) + (a > 0 ? 34 : -18)}
            textAnchor="middle"
            fontSize="21"
          >
            V({formatNumber(vertice.x)}; {formatNumber(vertice.y)})
          </text>
        )}
        {corteVisible && (
          <text
            className="graph-point-label"
            x={sx(0) + 16}
            y={sy(c) + (a > 0 ? 30 : -14)}
            fontSize="21"
          >
            (0; {formatNumber(c)})
          </text>
        )}
        <text
          className="graph-axis-title"
          x={left + 512}
          y={axisY + 8}
          fontSize="24"
        >
          x
        </text>
        <text
          className="graph-axis-title"
          x={axisX - 6}
          y={top - 12}
          fontSize="24"
        >
          y
        </text>
      </svg>
      <div className="graph-caption">
        <span className="graph-caption-primary">
          y = {expresionCuadratica(a, bActual, c)}
          {a === 0 && ' · recta: no es cuadrática'}
        </span>
        {cambiada && (
          <span>inicial: y = {expresionCuadratica(aInicial, bInicial, cInicial)}</span>
        )}
      </div>
      {!runtime.print && (
        <div className="graph-controls">
          <label>
            a = {formatNumber(a)}
            <input
              aria-label="Coeficiente a"
              type="range"
              min={aMin}
              max={aMax}
              step={aPaso}
              value={a}
              onChange={(event) => runtime.setValue(keyA, event.target.value)}
            />
          </label>
          {variarB && (
            <label>
              b = {formatNumber(bActual)}
              <input
                aria-label="Coeficiente b"
                type="range"
                min={bMin}
                max={bMax}
                step={bPaso}
                value={bActual}
                onChange={(event) => runtime.setValue(keyB, event.target.value)}
              />
            </label>
          )}
          <label>
            c = {formatNumber(c)}
            <input
              aria-label="Coeficiente c"
              type="range"
              min={cMin}
              max={cMax}
              step={cPaso}
              value={c}
              onChange={(event) => runtime.setValue(keyC, event.target.value)}
            />
          </label>
          <button
            onClick={() => {
              runtime.setValue(keyA, String(aInicial));
              runtime.setValue(keyC, String(cInicial));
              if (variarB) runtime.setValue(keyB, String(bInicial));
            }}
          >
            Restablecer
          </button>
        </div>
      )}
    </div>
  );
}
