import { useId } from 'react';
import {
  cortesVerticales,
  marcasEje,
  muestrearCurva,
  valorFuncion,
  validarCurva,
  type Curva,
} from './function-graph';

const formatNumber = (value: number) =>
  new Intl.NumberFormat('es-CL', { maximumFractionDigits: 1 }).format(value);

type TipoCurva = Curva['tipo'];
type Coeficientes = Partial<
  Record<'m' | 'n' | 'a' | 'b' | 'c' | 'h' | 'k' | 'r', number>
>;

function requerido(nombre: string, value: number | undefined): number {
  if (value === undefined)
    throw new Error(`GraficoFuncion requiere el parámetro ${nombre}.`);
  return value;
}

function curvaDesdeProps(tipo: TipoCurva, p: Coeficientes): Curva {
  const curva: Curva =
    tipo === 'afin'
      ? { tipo, m: requerido('m', p.m), n: requerido('n', p.n) }
      : tipo === 'cuadratica'
        ? {
            tipo,
            a: requerido('a', p.a),
            b: requerido('b', p.b),
            c: requerido('c', p.c),
          }
        : {
            tipo,
            h: requerido('h', p.h),
            k: requerido('k', p.k),
            r: requerido('r', p.r),
          };
  validarCurva(curva);
  return curva;
}

/** Gráfico estático de una curva con escala uniforme; los ejemplos pertenecen al contenido. */
export function GraficoFuncion({
  tipo,
  m,
  n,
  a,
  b,
  c,
  h,
  k,
  r,
  xMin,
  xMax,
  yMin,
  yMax,
  paso = 1,
  pasoY,
  ejeX = 'x',
  ejeY = 'y',
  puntosX = [],
  rectaVertical,
  marcarCorteY = false,
  pendienteEn,
  etiqueta,
  descripcion,
}: {
  tipo: TipoCurva;
  m?: number;
  n?: number;
  a?: number;
  b?: number;
  c?: number;
  h?: number;
  k?: number;
  r?: number;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  paso?: number;
  /** Paso de la grilla vertical; por defecto, el mismo que la horizontal. */
  pasoY?: number;
  ejeX?: string;
  ejeY?: string;
  puntosX?: number[];
  rectaVertical?: number;
  /** Marca y rotula el corte con el eje y, (0, n), de una función afín. */
  marcarCorteY?: boolean;
  /** Dibuja el triángulo de pendiente (+1 en x, +m en y) desde este valor de x. */
  pendienteEn?: number;
  etiqueta: string;
  descripcion: string;
}) {
  const clipId = useId().replaceAll(':', '');
  const curva = curvaDesdeProps(tipo, { m, n, a, b, c, h, k, r });
  const points = muestrearCurva(curva, { xMin, xMax, yMin, yMax });
  // La circunferencia exige la misma escala en ambos ejes; las funciones usan todo el lienzo.
  const uniform = Math.min(500 / (xMax - xMin), 400 / (yMax - yMin));
  const unitX = tipo === 'circunferencia' ? uniform : 500 / (xMax - xMin);
  const unitY = tipo === 'circunferencia' ? uniform : 400 / (yMax - yMin);
  const plotWidth = unitX * (xMax - xMin);
  const plotHeight = unitY * (yMax - yMin);
  const left = 60 + (500 - plotWidth) / 2;
  const top = 40 + (400 - plotHeight) / 2;
  const sx = (x: number) => left + (x - xMin) * unitX;
  const sy = (y: number) => top + (yMax - y) * unitY;
  const inside = (x: number, y: number) =>
    x >= xMin - 1e-9 &&
    x <= xMax + 1e-9 &&
    y >= yMin - 1e-9 &&
    y <= yMax + 1e-9;
  const xTicks = marcasEje(xMin, xMax, paso);
  const yTicks = marcasEje(yMin, yMax, pasoY ?? paso);
  if ((marcarCorteY || pendienteEn !== undefined) && curva.tipo !== 'afin')
    throw new Error(
      'El corte con el eje y y la pendiente solo se marcan en funciones afines.',
    );
  const corteY =
    marcarCorteY && curva.tipo === 'afin' && inside(0, curva.n)
      ? curva.n
      : undefined;
  const triangulo =
    pendienteEn !== undefined && curva.tipo === 'afin'
      ? {
          x0: pendienteEn,
          y0: curva.m * pendienteEn + curva.n,
          y1: curva.m * (pendienteEn + 1) + curva.n,
          m: curva.m,
        }
      : undefined;
  const axisY = yMin <= 0 && yMax >= 0 ? sy(0) : sy(yMin);
  const axisX = xMin <= 0 && xMax >= 0 ? sx(0) : sx(xMin);
  const marked = puntosX.flatMap((x) => {
    const y = valorFuncion(curva, x);
    const next = valorFuncion(curva, x + 1e-3);
    return y !== null && next !== null && inside(x, y)
      ? [{ x, y, rising: next > y }]
      : [];
  });
  const cuts =
    rectaVertical === undefined
      ? []
      : cortesVerticales(curva, rectaVertical).filter((y) =>
          inside(rectaVertical, y),
        );
  const path = points
    .map(
      (point, index) =>
        `${index === 0 ? 'M' : 'L'}${sx(point.x).toFixed(2)} ${sy(point.y).toFixed(2)}`,
    )
    .join(' ');
  return (
    <div className="graph graph-function">
      <svg viewBox="0 0 620 490" role="img" aria-label={descripcion}>
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
        {xTicks
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
        {yTicks
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
          <path
            className="graph-primary-line graph-curve"
            d={path}
            strokeWidth="6"
            fill="none"
          />
          {rectaVertical !== undefined && (
            <line
              className="graph-secondary-line"
              strokeWidth="4"
              strokeDasharray="14 10"
              x1={sx(rectaVertical)}
              x2={sx(rectaVertical)}
              y1={top}
              y2={top + plotHeight}
            />
          )}
          {marked.map((point) => (
            <circle
              key={`p${point.x}`}
              className="graph-probe"
              cx={sx(point.x)}
              cy={sy(point.y)}
              r="9"
            />
          ))}
          {triangulo && (
            <path
              className="graph-slope"
              d={`M${sx(triangulo.x0)} ${sy(triangulo.y0)} L${sx(triangulo.x0 + 1)} ${sy(triangulo.y0)} L${sx(triangulo.x0 + 1)} ${sy(triangulo.y1)}`}
              fill="none"
              strokeWidth="4"
              strokeDasharray="10 7"
            />
          )}
          {corteY !== undefined && (
            <circle
              className="graph-intersection"
              cx={sx(0)}
              cy={sy(corteY)}
              r="10"
            />
          )}
          {rectaVertical !== undefined &&
            cuts.map((y) => (
              <circle
                key={`c${y}`}
                className="graph-intersection"
                cx={sx(rectaVertical)}
                cy={sy(y)}
                r="10"
              />
            ))}
        </g>
        {marked.map((point) => (
          <text
            key={`t${point.x}`}
            className="graph-point-label"
            x={sx(point.x) + 16}
            y={sy(point.y) + (point.rising ? 28 : -14)}
            textAnchor="start"
            fontSize="20"
          >
            ({formatNumber(point.x)}; {formatNumber(point.y)})
          </text>
        ))}
        {triangulo && (
          <>
            <text
              className="graph-slope-label"
              x={(sx(triangulo.x0) + sx(triangulo.x0 + 1)) / 2}
              y={sy(triangulo.y0) + (triangulo.m > 0 ? 30 : -14)}
              textAnchor="middle"
              fontSize="22"
            >
              +1
            </text>
            <text
              className="graph-slope-label"
              x={sx(triangulo.x0 + 1) + 12}
              y={(sy(triangulo.y0) + sy(triangulo.y1)) / 2 + 8}
              fontSize="22"
            >
              {triangulo.m > 0 ? '+' : '−'}
              {formatNumber(Math.abs(triangulo.m))}
            </text>
          </>
        )}
        {corteY !== undefined && (
          <text
            className="graph-point-label"
            x={sx(0) + 16}
            y={sy(corteY) + (curva.tipo === 'afin' && curva.m > 0 ? 30 : -14)}
            fontSize="21"
          >
            (0; {formatNumber(corteY)})
          </text>
        )}
        <text
          className="graph-axis-title"
          x={left + plotWidth + 12}
          y={axisY + 8}
          fontSize={ejeX.length > 2 ? '19' : '24'}
          textAnchor={ejeX.length > 2 ? 'end' : 'start'}
          dy={ejeX.length > 2 ? 46 : 0}
          dx={ejeX.length > 2 ? -12 : 0}
        >
          {ejeX}
        </text>
        <text
          className="graph-axis-title"
          x={ejeY.length > 2 ? axisX + 10 : axisX - 6}
          y={top - 12}
          fontSize={ejeY.length > 2 ? '19' : '24'}
        >
          {ejeY}
        </text>
      </svg>
      <div className="graph-caption">
        <span className="graph-caption-primary">{etiqueta}</span>
        {rectaVertical !== undefined && (
          <span>
            x = {formatNumber(rectaVertical)} · {cuts.length}{' '}
            {cuts.length === 1 ? 'corte' : 'cortes'}
          </span>
        )}
      </div>
    </div>
  );
}
