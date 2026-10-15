import { useId } from 'react';
import { useSlide } from '@aula/pedagogical-ui';
import { formatEntero, lecturasResta, recorrido, rotulosRecta } from './integer-line';

const signo = (value: number) => (value > 0 ? 'pos' : value < 0 ? 'neg' : 'cero');
const formatSalto = (salto: number) => (salto > 0 ? `+${salto}` : formatEntero(salto));

interface Dibujo {
  min: number;
  max: number;
  puntos: readonly number[];
  rotulos: readonly string[];
  desde: number | undefined;
  saltos: readonly number[];
  rotulosSaltos: readonly string[];
  distancias: readonly number[];
  opuestos: readonly number[];
  /** Reserva el alto del salto más largo posible (interactivos): la recta no se mueve. */
  saltoMaximo?: number;
  /** Qué saltos, distancias y opuestos se ven en el paso actual (por defecto, todos). */
  mostrar?: Mostrar;
  descripcion: string;
}

interface Mostrar {
  salto: (index: number) => boolean;
  distancia: (index: number) => boolean;
  opuesto: (index: number) => boolean;
}
const TODO: Mostrar = { salto: () => true, distancia: () => true, opuesto: () => true };

/**
 * Dibujo común: saltos sobre la recta, rótulos, distancias al cero y opuestos bajo ella.
 * Positivos en azul y negativos en ocre, en los puntos y en los saltos.
 */
function DibujoRecta({
  min,
  max,
  puntos,
  rotulos,
  desde,
  saltos,
  rotulosSaltos,
  distancias,
  opuestos,
  saltoMaximo,
  mostrar = TODO,
  descripcion,
}: Dibujo) {
  const markerId = useId().replaceAll(':', '');
  const etiquetas = rotulosRecta(min, max);
  const posiciones = desde === undefined ? [] : recorrido(desde, saltos);
  if (saltos.length > 0 && desde === undefined)
    throw new Error('RectaEnteros requiere desde para dibujar saltos.');
  const marcados = [
    ...puntos,
    ...posiciones,
    ...distancias,
    ...opuestos.flatMap((v) => [v, -v]),
  ];
  for (const value of marcados)
    if (value < min || value > max)
      throw new Error(`El valor ${value} queda fuera de la recta [${min}; ${max}].`);
  const left = 60;
  const right = 1140;
  const sx = (v: number) => left + ((v - min) / (max - min)) * (right - left);
  const alturaSalto = (salto: number) => Math.min(70, 28 + Math.abs(sx(salto) - sx(0)) * 0.07);
  const reservados = saltoMaximo === undefined ? saltos : [...saltos, saltoMaximo];
  const axis = reservados.length ? Math.max(...reservados.map(alturaSalto)) + 46 : 24;
  let y = axis + 52;
  // Un rótulo que quedaría junto a otro baja a una segunda fila.
  const nivelRotulo = puntos.map((v, index) =>
    puntos
      .slice(0, index)
      .some((otro, j) => rotulos[j] && Math.abs(sx(otro) - sx(v)) < 120)
      ? 1
      : 0,
  );
  const filaRotulos = rotulos.length ? (y += 38) : y;
  // Con dos o más rótulos se reserva la segunda fila: el alto no cambia al mover los puntos.
  if (rotulos.filter(Boolean).length > 1) y += 34;
  const filasDistancia = distancias.map(() => (y += 62));
  const filasOpuesto = opuestos.map(() => (y += 58));
  const alto = y + 6;
  const llegadas = posiciones.filter((_, k) => k === 0 || mostrar.salto(k - 1));
  const fuertes = new Set([
    ...puntos,
    ...llegadas,
    ...distancias.filter((_, k) => mostrar.distancia(k)),
    ...opuestos.filter((_, k) => mostrar.opuesto(k)).flatMap((v) => [v, -v]),
  ]);
  // Un valor marcado fuera de los rótulos regulares oculta el rótulo vecino que lo taparía.
  const unidad = (right - left) / (max - min);
  const regulares = etiquetas.filter(
    (v) =>
      fuertes.has(v) ||
      ![...fuertes].some((f) => !etiquetas.includes(f) && Math.abs(f - v) * unidad < 60),
  );
  const textoMarca = (v: number) => (
    <text
      key={`r${v}`}
      className={`number-line-label${fuertes.has(v) ? ` number-line-label-strong integer-text-${signo(v)}` : ''}`}
      x={sx(v)}
      y={axis + 42}
      textAnchor="middle"
      fontSize="30"
    >
      {formatEntero(v)}
    </text>
  );
  return (
    <div className="number-line integer-line">
      <svg viewBox={`0 0 1200 ${alto}`} role="img" aria-label={descripcion}>
        <defs>
          {(['pos', 'neg'] as const).map((tone) => (
            <marker
              key={tone}
              id={`${markerId}-${tone}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="4"
              markerHeight="4"
              orient="auto-start-reverse"
            >
              <path d="M0,0 L10,5 L0,10 z" className={`integer-fill-${tone}`} />
            </marker>
          ))}
        </defs>
        <line className="number-line-axis" x1={left - 30} x2={right + 30} y1={axis} y2={axis} />
        {Array.from({ length: max - min + 1 }, (_, i) => min + i).map((v) => {
          const largo = v === 0 ? 18 : etiquetas.includes(v) ? 11 : 6;
          return (
            <line
              key={`t${v}`}
              className="number-line-axis"
              x1={sx(v)}
              x2={sx(v)}
              y1={axis - largo}
              y2={axis + largo}
            />
          );
        })}
        {regulares.map(textoMarca)}
        {[...fuertes].filter((v) => !etiquetas.includes(v)).map(textoMarca)}
        {saltos.map((salto, index) => {
          const inicio = posiciones[index] ?? 0;
          const x1 = sx(inicio);
          const x2 = sx(inicio + salto);
          const alturaPico = alturaSalto(salto);
          const tone = salto < 0 ? 'neg' : 'pos';
          if (salto === 0) return null;
          return (
            <g key={`s${index}`} visibility={mostrar.salto(index) ? 'visible' : 'hidden'}>
              <path
                className={`integer-jump integer-stroke-${tone}`}
                d={`M${x1} ${axis - 6} Q${(x1 + x2) / 2} ${axis - 6 - 2 * alturaPico} ${x2} ${axis - 6}`}
                fill="none"
                strokeWidth="6"
                markerEnd={`url(#${markerId}-${tone})`}
              />
              <text
                className={`integer-jump-label integer-text-${tone}`}
                x={(x1 + x2) / 2}
                y={axis - alturaPico - 16}
                textAnchor="middle"
                fontSize="32"
              >
                {rotulosSaltos[index] ?? formatSalto(salto)}
              </text>
            </g>
          );
        })}
        {[...new Set([...puntos, ...llegadas])].map((v) => (
          <circle key={`p${v}`} className={`integer-fill-${signo(v)}`} cx={sx(v)} cy={axis} r="13" />
        ))}
        {puntos.map((v, index) =>
          rotulos[index] ? (
            <text
              key={`rp${index}`}
              className={`integer-text-${signo(v)}`}
              x={sx(v)}
              y={filaRotulos + 34 * (nivelRotulo[index] ?? 0)}
              textAnchor="middle"
              fontSize="28"
              fontWeight="700"
            >
              {rotulos[index]}
            </text>
          ) : null,
        )}
        {distancias.map((v, index) => {
          const fila = filasDistancia[index] ?? 0;
          const tone = signo(v);
          return (
            <g key={`d${index}`} visibility={mostrar.distancia(index) ? 'visible' : 'hidden'}>
              <line className={`integer-stroke-${tone}`} strokeWidth="5" x1={sx(0)} x2={sx(v)} y1={fila - 34} y2={fila - 34} />
              {[0, v].map((extremo) => (
                <line
                  key={extremo}
                  className={`integer-stroke-${tone}`}
                  strokeWidth="4"
                  x1={sx(extremo)}
                  x2={sx(extremo)}
                  y1={fila - 46}
                  y2={fila - 22}
                />
              ))}
              <text
                className={`integer-text-${tone}`}
                x={(sx(0) + sx(v)) / 2}
                y={fila}
                textAnchor="middle"
                fontSize="28"
                fontWeight="700"
              >
                |{formatEntero(v)}| = {formatEntero(Math.abs(v))}
              </text>
            </g>
          );
        })}
        {opuestos.map((v, index) => {
          const fila = filasOpuesto[index] ?? 0;
          const a = sx(-Math.abs(v));
          const b = sx(Math.abs(v));
          return (
            <g key={`o${index}`} visibility={mostrar.opuesto(index) ? 'visible' : 'hidden'}>
              <path
                className="integer-mirror"
                d={`M${a} ${fila - 58} Q${(a + b) / 2} ${fila - 6} ${b} ${fila - 58}`}
                fill="none"
                strokeWidth="3"
                strokeDasharray="10 8"
              />
              <text className="number-line-label" x={(a + b) / 2} y={fila} textAnchor="middle" fontSize="26">
                {formatEntero(v)} y {formatEntero(-v)}: opuestos
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

/** Recta numérica estática de los enteros; los valores y saltos pertenecen al contenido. */
export function RectaEnteros({
  min,
  max,
  puntos = [],
  rotulos = [],
  desde,
  saltos = [],
  rotulosSaltos = [],
  distancias = [],
  opuestos = [],
  pasosSaltos,
  pasosDistancias,
  pasosOpuestos,
  descripcion,
}: {
  min: number;
  max: number;
  /** Enteros marcados con un punto. */
  puntos?: number[];
  /** Rótulo bajo cada punto, en el mismo orden. */
  rotulos?: string[];
  /** Punto de partida de los saltos. */
  desde?: number;
  /** Desplazamientos sucesivos: positivo hacia la derecha, negativo hacia la izquierda. */
  saltos?: number[];
  rotulosSaltos?: string[];
  /** Enteros cuya distancia al cero se acota bajo la recta. */
  distancias?: number[];
  /** Enteros que se unen con su opuesto por un arco simétrico respecto del cero. */
  opuestos?: number[];
  /** Paso en que aparece cada salto, cada distancia y cada opuesto (uno por elemento). */
  pasosSaltos?: number[];
  pasosDistancias?: number[];
  pasosOpuestos?: number[];
  descripcion: string;
}) {
  const { step, print } = useSlide();
  const en = (pasos: number[] | undefined) => (index: number) => {
    const paso = pasos?.[index];
    return print || paso === undefined || step >= paso;
  };
  return (
    <DibujoRecta
      mostrar={{ salto: en(pasosSaltos), distancia: en(pasosDistancias), opuesto: en(pasosOpuestos) }}
      min={min}
      max={max}
      puntos={puntos}
      rotulos={rotulos}
      desde={desde}
      saltos={saltos}
      rotulosSaltos={rotulosSaltos}
      distancias={distancias}
      opuestos={opuestos}
      descripcion={descripcion}
    />
  );
}

/**
 * Resta a − b dibujada como el salto −b desde a, con sus dos lecturas: a − b y a + (−b).
 * Controles para a y b con restablecer; el PDF muestra los valores estáticos declarados.
 */
export function ExploradorResta({
  id,
  aInicial,
  bInicial,
  aEstatico,
  bEstatico,
  aMin = -10,
  aMax = 10,
  bMin = -10,
  bMax = 10,
  descripcion,
}: {
  id: string;
  aInicial: number;
  bInicial: number;
  aEstatico: number;
  bEstatico: number;
  aMin?: number;
  aMax?: number;
  bMin?: number;
  bMax?: number;
  descripcion: string;
}) {
  const runtime = useSlide();
  const keyA = `resta-${id}-a`;
  const keyB = `resta-${id}-b`;
  for (const [value, low, high, name] of [
    [aInicial, aMin, aMax, 'aInicial'],
    [aEstatico, aMin, aMax, 'aEstatico'],
    [bInicial, bMin, bMax, 'bInicial'],
    [bEstatico, bMin, bMax, 'bEstatico'],
  ] as const)
    if (!Number.isInteger(value) || value < low || value > high)
      throw new Error(`ExploradorResta: ${name} debe ser un entero entre ${low} y ${high}.`);
  const a = runtime.print ? aEstatico : Number(runtime.values[keyA] ?? aInicial);
  const b = runtime.print ? bEstatico : Number(runtime.values[keyB] ?? bInicial);
  const lecturas = lecturasResta(a, b);
  return (
    <div className="integer-explorer">
      <DibujoRecta
        min={aMin - bMax}
        max={aMax - bMin}
        puntos={b === 0 ? [a] : [a, lecturas.resultado]}
        rotulos={b === 0 ? ['parto y llego'] : ['parto', 'llego']}
        desde={a}
        saltos={[-b]}
        rotulosSaltos={[]}
        distancias={[]}
        opuestos={[]}
        saltoMaximo={Math.max(Math.abs(bMin), Math.abs(bMax))}
        descripcion={descripcion}
      />
      <div className="integer-readings">
        <span>{lecturas.resta}</span>
        <span>{lecturas.suma}</span>
      </div>
      {!runtime.print && (
        <div className="graph-controls">
          <label>
            a = {formatEntero(a)}
            <input
              aria-label="Número a"
              type="range"
              min={aMin}
              max={aMax}
              step={1}
              value={a}
              onChange={(event) => runtime.setValue(keyA, event.target.value)}
            />
          </label>
          <label>
            b = {formatEntero(b)}
            <input
              aria-label="Número b"
              type="range"
              min={bMin}
              max={bMax}
              step={1}
              value={b}
              onChange={(event) => runtime.setValue(keyB, event.target.value)}
            />
          </label>
          <button
            onClick={() => {
              runtime.setValue(keyA, String(aInicial));
              runtime.setValue(keyB, String(bInicial));
            }}
          >
            Restablecer
          </button>
        </div>
      )}
    </div>
  );
}
