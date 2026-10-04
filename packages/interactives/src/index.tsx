import { useId } from 'react';
import { useSlide } from '@aula/pedagogical-ui';
import {
  solveLinearSystem,
  yOnLine,
  type LinearEquation,
  type Point,
} from './linear-system';

export { GraficoFuncion } from './GraficoFuncion';
export { GraficoComparacion } from './GraficoComparacion';
export { RectaIntervalos } from './RectaIntervalos';
export { DiagramaSagital } from './DiagramaSagital';
export { MaquinaFuncion } from './MaquinaFuncion';
export { ExploradorCuadratica } from './ExploradorCuadratica';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);

/** Representación estática de dos rectas; los ejemplos pertenecen al contenido. */
export function GraficoRectas({
  a1,
  b1,
  c1,
  a2,
  b2,
  c2,
  max,
  descripcion,
}: {
  a1: number;
  b1: number;
  c1: number;
  a2: number;
  b2: number;
  c2: number;
  max: number;
  descripcion: string;
}) {
  const clipId = useId().replaceAll(':', '');
  const equations: [LinearEquation, LinearEquation] = [
    { a: a1, b: b1, c: c1 },
    { a: a2, b: b2, c: c2 },
  ];
  const solution = solveLinearSystem(equations[0], equations[1]);
  const sx = (x: number) => 60 + (x / max) * 480;
  const sy = (y: number) => 430 - (y / max) * 380;
  return (
    <div className="graph">
      <svg viewBox="0 0 620 490" role="img" aria-label={descripcion}>
        <defs>
          <clipPath id={clipId}>
            <rect x="60" y="50" width="480" height="380" />
          </clipPath>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
          <g key={ratio}>
            <line
              className="graph-grid-line"
              x1={sx(max * ratio)}
              x2={sx(max * ratio)}
              y1="50"
              y2="430"
            />
            <line
              className="graph-grid-line"
              x1="60"
              x2="540"
              y1={sy(max * ratio)}
              y2={sy(max * ratio)}
            />
            <text
              className="graph-axis-label"
              x={sx(max * ratio)}
              y="460"
              textAnchor="middle"
              fontSize="20"
            >
              {formatNumber(max * ratio)}
            </text>
            <text
              className="graph-axis-label"
              x="40"
              y={sy(max * ratio) + 7}
              textAnchor="end"
              fontSize="20"
            >
              {formatNumber(max * ratio)}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          {equations.map((equation, index) => {
            const startY = yOnLine(equation, 0);
            const endY = yOnLine(equation, max);
            const vertical = startY === null || endY === null;
            return (
              <line
                key={index}
                className={
                  index === 0 ? 'graph-primary-line' : 'graph-secondary-line'
                }
                strokeWidth={index === 0 ? 7 : 4}
                strokeDasharray={index === 1 ? '14 10' : undefined}
                x1={sx(vertical ? equation.c / equation.a : 0)}
                y1={sy(startY ?? 0)}
                x2={sx(vertical ? equation.c / equation.a : max)}
                y2={sy(endY ?? max)}
              />
            );
          })}
          {solution && (
            <circle
              className="graph-intersection"
              cx={sx(solution.x)}
              cy={sy(solution.y)}
              r="9"
            />
          )}
        </g>
        {solution && (
          <text
            className="graph-point-label"
            x={sx(solution.x) + 14}
            y={sy(solution.y) - 18}
            fontSize="24"
          >
            ({formatNumber(solution.x)}; {formatNumber(solution.y)})
          </text>
        )}
        <text className="graph-axis-title" x="565" y="435" fontSize="24">
          x
        </text>
        <text className="graph-axis-title" x="55" y="30" fontSize="24">
          y
        </text>
      </svg>
      <div className="graph-caption">
        <span>Ecuación 1 · continua</span>
        <span>Ecuación 2 · discontinua</span>
      </div>
    </div>
  );
}

export function GraficoDosCondiciones({
  id,
  a1,
  b1,
  c1,
  a2,
  b2,
  c2,
  xMax,
  yMax,
  xInicial = 0,
  xEstatico,
  paso = 100,
  etiqueta1 = 'Condición 1',
  etiqueta2 = 'Condición 2',
}: {
  id: string;
  a1: number;
  b1: number;
  c1: number;
  a2: number;
  b2: number;
  c2: number;
  xMax: number;
  yMax: number;
  xInicial?: number;
  xEstatico: number;
  paso?: number;
  etiqueta1?: string;
  etiqueta2?: string;
}) {
  const runtime = useSlide();
  const clipId = useId().replaceAll(':', '');
  const first: LinearEquation = { a: a1, b: b1, c: c1 };
  const second: LinearEquation = { a: a2, b: b2, c: c2 };
  const solution = solveLinearSystem(first, second);
  if (!solution) throw new Error('El gráfico requiere dos rectas secantes.');
  const stateKey = `graph-${id}-x`;
  const selectedX = runtime.print
    ? xEstatico
    : Number(runtime.values[stateKey] ?? xInicial);
  const selectedY = yOnLine(first, selectedX);
  const width = 650;
  const height = 430;
  const left = 72;
  const top = 30;
  const plotWidth = 520;
  const plotHeight = 340;
  const sx = (x: number) => left + (x / xMax) * plotWidth;
  const sy = (y: number) => top + plotHeight - (y / yMax) * plotHeight;
  const lineSegment = (equation: LinearEquation) => {
    const candidates = [
      { x: 0, y: yOnLine(equation, 0) },
      { x: xMax, y: yOnLine(equation, xMax) },
      equation.a === 0 ? null : { x: equation.c / equation.a, y: 0 },
      equation.a === 0
        ? null
        : { x: (equation.c - equation.b * yMax) / equation.a, y: yMax },
    ].filter(
      (point): point is Point =>
        point !== null &&
        point.y !== null &&
        point.x >= 0 &&
        point.x <= xMax &&
        point.y >= 0 &&
        point.y <= yMax,
    );
    const unique = candidates.filter(
      (point, index) =>
        candidates.findIndex(
          (other) =>
            Math.abs(other.x - point.x) < 1e-8 &&
            Math.abs(other.y - point.y) < 1e-8,
        ) === index,
    );
    const start = unique[0];
    const end = unique[1];
    if (!start || !end)
      throw new Error('La recta no cruza el rango visible del gráfico.');
    return { start, end };
  };
  const firstSegment = lineSegment(first);
  const secondSegment = lineSegment(second);
  const tickValues = [0, 0.25, 0.5, 0.75, 1];
  return (
    <div className="graph graph-context">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Las dos condiciones se intersectan en ${formatNumber(solution.x)}, ${formatNumber(solution.y)}.`}
      >
        <defs>
          <clipPath id={clipId}>
            <rect x={left} y={top} width={plotWidth} height={plotHeight} />
          </clipPath>
        </defs>
        {tickValues.map((ratio) => (
          <g key={ratio}>
            <line
              className="graph-grid-line"
              x1={sx(ratio * xMax)}
              x2={sx(ratio * xMax)}
              y1={top}
              y2={top + plotHeight}
            />
            <line
              className="graph-grid-line"
              x1={left}
              x2={left + plotWidth}
              y1={sy(ratio * yMax)}
              y2={sy(ratio * yMax)}
            />
            <text
              className="graph-axis-label"
              x={sx(ratio * xMax)}
              y={top + plotHeight + 28}
              textAnchor="middle"
              fontSize="17"
            >
              {formatNumber((ratio * xMax) / 1000)}
            </text>
            <text
              className="graph-axis-label"
              x={left - 14}
              y={sy(ratio * yMax) + 6}
              textAnchor="end"
              fontSize="17"
            >
              {formatNumber((ratio * yMax) / 1000)}
            </text>
          </g>
        ))}
        <g clipPath={`url(#${clipId})`}>
          <line
            className="graph-primary-line"
            strokeWidth="5"
            x1={sx(firstSegment.start.x)}
            y1={sy(firstSegment.start.y)}
            x2={sx(firstSegment.end.x)}
            y2={sy(firstSegment.end.y)}
          />
          <line
            className="graph-secondary-line"
            strokeWidth="5"
            x1={sx(secondSegment.start.x)}
            y1={sy(secondSegment.start.y)}
            x2={sx(secondSegment.end.x)}
            y2={sy(secondSegment.end.y)}
          />
          {selectedY !== null && selectedY >= 0 && selectedY <= yMax && (
            <circle
              className="graph-probe"
              cx={sx(selectedX)}
              cy={sy(selectedY)}
              r="8"
            />
          )}
          <line
            className="graph-guide"
            x1={sx(solution.x)}
            x2={sx(solution.x)}
            y1={sy(solution.y)}
            y2={sy(0)}
          />
          <line
            className="graph-guide"
            x1={sx(0)}
            x2={sx(solution.x)}
            y1={sy(solution.y)}
            y2={sy(solution.y)}
          />
          <circle
            className="graph-intersection"
            cx={sx(solution.x)}
            cy={sy(solution.y)}
            r="10"
          />
        </g>
        <text
          className="graph-point-label"
          x={sx(solution.x) + 16}
          y={sy(solution.y) - 16}
          fontSize="22"
        >
          ({formatNumber(solution.x / 1000)}; {formatNumber(solution.y / 1000)})
        </text>
        <text
          className="graph-axis-title"
          x="590"
          y="404"
          textAnchor="end"
          fontSize="19"
        >
          sándwich ($ miles)
        </text>
        <text className="graph-axis-title" x="76" y="21" fontSize="19">
          jugo ($ miles)
        </text>
      </svg>
      <div className="graph-caption">
        <span>{etiqueta1}</span>
        <span>{etiqueta2}</span>
      </div>
      {!runtime.print && (
        <div className="graph-controls">
          <label>
            Explorar la primera condición
            <input
              aria-label="Precio del sándwich sobre la primera condición"
              type="range"
              min="0"
              max={xMax}
              step={paso}
              value={selectedX}
              onChange={(event) =>
                runtime.setValue(stateKey, event.target.value)
              }
            />
          </label>
          <button onClick={() => runtime.setValue(stateKey, String(xInicial))}>
            Restablecer
          </button>
        </div>
      )}
    </div>
  );
}
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
            <line
              className="graph-grid-line"
              x1={sx(n)}
              x2={sx(n)}
              y1="40"
              y2="450"
            />
            <line
              className="graph-grid-line"
              x1="60"
              x2="580"
              y1={sy(n)}
              y2={sy(n)}
            />
            <text
              className="graph-axis-label"
              x={sx(n)}
              y="480"
              textAnchor="middle"
              fontSize="20"
            >
              {n}
            </text>
            <text
              className="graph-axis-label"
              x="35"
              y={sy(n) + 7}
              fontSize="20"
            >
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
            className="graph-primary-line"
            strokeWidth="5"
          />
          <line
            x1={sx(0)}
            y1={sy(-1)}
            x2={sx(8)}
            y2={sy(7)}
            className="graph-secondary-line"
            strokeWidth="5"
          />
          <circle className="graph-intersection" cx={sx(x)} cy={sy(y)} r="9" />
        </g>
        <text
          className="graph-point-label"
          x={sx(x) + 14}
          y={sy(y) - 17}
          fontSize="26"
        >
          ({x}; {y})
        </text>
        <text className="graph-axis-title" x="605" y="455" fontSize="26">
          x
        </text>
        <text className="graph-axis-title" x="55" y="27" fontSize="26">
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
