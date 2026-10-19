import { useSlide } from '@aula/pedagogical-ui';
import { escribirFraccion, partesTomadas } from './fractions';

/**
 * Fracción como partes de barras iguales (pizzas, cintas…). Las partes tomadas van en azul;
 * `subdividir` parte cada parte en k para mostrar una fracción equivalente, y `recta` dibuja
 * la fracción como punto entre 0 y 1. Los pasos son opcionales; el PDF muestra el último estado.
 */
export function BarraFraccion({
  barras = 1,
  partes,
  tomadas = 0,
  porBarra = false,
  subdividir,
  recta = false,
  pasoTomadas,
  pasoSubdividir,
  pasoRecta,
  descripcion,
}: {
  barras?: number;
  partes: number;
  tomadas?: number;
  /** Toma `tomadas` partes de cada barra (un reparto), en vez de llenarlas en orden. */
  porBarra?: boolean;
  /** Parte cada parte en k partes iguales (k ≥ 2). */
  subdividir?: number;
  /** Dibuja la fracción como punto de la recta entre 0 y 1 (solo con una barra). */
  recta?: boolean;
  pasoTomadas?: number;
  pasoSubdividir?: number;
  pasoRecta?: number;
  descripcion: string;
}) {
  const { step, print } = useSlide();
  const visible = (paso: number | undefined) => print || paso === undefined || step >= paso;
  const tomadasPorBarra = partesTomadas(barras, partes, tomadas, porBarra);
  if (subdividir !== undefined && (!Number.isInteger(subdividir) || subdividir < 2 || subdividir * partes > 48))
    throw new Error('BarraFraccion: subdividir debe ser un natural mayor que 1 (hasta 48 partes en total).');
  if (recta && barras !== 1) throw new Error('BarraFraccion: la recta es para una sola barra.');
  const verTomadas = visible(pasoTomadas);
  const verSubdivision = subdividir !== undefined && visible(pasoSubdividir);
  const verRecta = recta && visible(pasoRecta);
  const izquierda = 120;
  const largo = 860;
  const alto = 70;
  const fila = 96;
  const parte = largo / partes;
  const yRecta = barras * fila + 40;
  const altoTotal = recta ? yRecta + 110 : barras * fila + 10;
  const k = subdividir ?? 1;
  const unaBarra = barras === 1 && !porBarra;
  const escrita = verSubdivision
    ? `${escribirFraccion(tomadas, partes)} = ${escribirFraccion(tomadas * k, partes * k)}`
    : escribirFraccion(tomadas, partes);
  const xPunto = izquierda + (tomadas / partes) * largo;
  return (
    <div className="natural-figure">
      <svg viewBox={`0 0 1200 ${altoTotal}`} role="img" aria-label={descripcion}>
        {tomadasPorBarra.map((fila_, b) => {
          const y = 10 + b * fila;
          return (
            <g key={b}>
              {fila_.map((tomada, j) => (
                <rect
                  key={j}
                  className={tomada && verTomadas ? 'natural-piece' : 'natural-piece natural-piece-alt'}
                  x={izquierda + j * parte}
                  y={y}
                  width={parte}
                  height={alto}
                />
              ))}
              {verSubdivision &&
                Array.from({ length: partes * k }, (_, m) => m)
                  .filter((m) => m % k !== 0)
                  .map((m) => (
                    <line
                      key={`s${m}`}
                      className="natural-fraction-split"
                      x1={izquierda + (m * parte) / k}
                      x2={izquierda + (m * parte) / k}
                      y1={y + 4}
                      y2={y + alto - 4}
                    />
                  ))}
            </g>
          );
        })}
        {unaBarra && tomadas > 0 && verTomadas && (
          <text className="natural-text natural-text-strong" x={izquierda + largo + 28} y={10 + alto / 2 + 11} fontSize="32">
            {escrita}
          </text>
        )}
        {recta && (
          <g visibility={verRecta ? 'visible' : 'hidden'}>
            <line className="natural-axis" x1={izquierda - 20} x2={izquierda + largo + 20} y1={yRecta} y2={yRecta} />
            {Array.from({ length: partes * k + 1 }, (_, m) => (
              <line
                key={m}
                className="natural-axis"
                x1={izquierda + (m * parte) / k}
                x2={izquierda + (m * parte) / k}
                y1={yRecta - (m % k === 0 ? 12 : 7)}
                y2={yRecta + (m % k === 0 ? 12 : 7)}
              />
            ))}
            {[0, 1].map((v) => (
              <text key={v} className="natural-text" x={izquierda + v * largo} y={yRecta + 48} textAnchor="middle" fontSize="30">
                {v}
              </text>
            ))}
            <line className="natural-guide" x1={xPunto} x2={xPunto} y1={10 + alto} y2={yRecta} />
            <circle className="natural-dot-common" cx={xPunto} cy={yRecta} r="13" />
            <text className="natural-text natural-text-strong" x={xPunto} y={yRecta + 48} textAnchor="middle" fontSize="30">
              {escribirFraccion(tomadas, partes)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
