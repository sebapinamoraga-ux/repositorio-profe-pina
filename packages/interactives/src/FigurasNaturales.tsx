import type { ReactNode } from 'react';
import {
  cifras,
  dividir,
  divisores,
  escrituraPrima,
  esPrimo,
  factoresPrimos,
  formatNatural,
  mcm,
  multiplosHasta,
  paresDivisores,
} from './natural-numbers';

/** Figuras estáticas de los números naturales; los números pertenecen al contenido. */

const ANCHO = 1200;

function Figura({
  alto,
  descripcion,
  angosta = false,
  children,
}: {
  alto: number;
  descripcion: string;
  angosta?: boolean;
  children: ReactNode;
}) {
  const ancho = angosta ? 600 : ANCHO;
  return (
    <div className={`natural-figure${angosta ? ' natural-figure-narrow' : ''}`}>
      <svg viewBox={`0 0 ${ancho} ${alto}`} role="img" aria-label={descripcion}>
        {children}
      </svg>
    </div>
  );
}

/** Ubica cajas de distinto ancho de izquierda a derecha y salta de fila al llenarse. */
function flujo(anchos: readonly number[], alto: number, maximo: number, gap: number) {
  const posiciones: { x: number; y: number }[] = [];
  let x = 0;
  let y = 0;
  let filas = 1;
  for (const ancho of anchos) {
    if (x > 0 && x + ancho > maximo) {
      x = 0;
      y += alto + gap;
      filas++;
    }
    posiciones.push({ x, y });
    x += ancho + gap;
  }
  return { posiciones, altoTotal: filas * alto + (filas - 1) * gap };
}

const POSICIONES = ['U', 'D', 'C', 'UM', 'DM', 'CM'];

/** Valor posicional con billetes y monedas: cada cifra es la cantidad de piezas de su columna. */
export function ValorPosicional({ numero, descripcion }: { numero: number; descripcion: string }) {
  const digitos = cifras(numero);
  if (digitos.length > POSICIONES.length)
    throw new Error('ValorPosicional admite hasta seis cifras.');
  const columna = ANCHO / digitos.length;
  const filasDe = (d: number, billete: boolean) => Math.ceil(d / (billete ? 2 : 3));
  const filas = Math.max(
    1,
    ...digitos.map((d, i) => filasDe(d, 10 ** (digitos.length - 1 - i) >= 1000)),
  );
  const top = 96;
  const alto = top + filas * 64 + 70;
  return (
    <Figura alto={alto} descripcion={descripcion}>
      {digitos.map((d, i) => {
        const valor = 10 ** (digitos.length - 1 - i);
        const billete = valor >= 1000;
        const x0 = i * columna;
        const centro = x0 + columna / 2;
        const porFila = billete ? 2 : 3;
        const paso = billete ? 124 : 70;
        return (
          <g key={i}>
            {i > 0 && <line className="natural-divider" x1={x0} x2={x0} y1={10} y2={alto - 10} />}
            <text className="natural-text natural-text-strong" x={centro} y={36} textAnchor="middle" fontSize="30">
              {POSICIONES[digitos.length - 1 - i]}
            </text>
            <text className="natural-muted" x={centro} y={70} textAnchor="middle" fontSize="26">
              ${formatNatural(valor)}
            </text>
            {Array.from({ length: d }, (_, k) => {
              const fila = Math.floor(k / porFila);
              const enFila = Math.min(porFila, d - fila * porFila);
              const cx = centro + (k % porFila - (enFila - 1) / 2) * paso;
              const cy = top + 30 + fila * 64;
              return billete ? (
                <g key={k}>
                  <rect className="natural-bill" x={cx - 56} y={cy - 24} width="112" height="48" rx="6" />
                  <text className="natural-text" x={cx} y={cy + 9} textAnchor="middle" fontSize="24">
                    {formatNatural(valor)}
                  </text>
                </g>
              ) : (
                <g key={k}>
                  <circle className="natural-coin" cx={cx} cy={cy} r="29" />
                  <text className="natural-text" x={cx} y={cy + 8} textAnchor="middle" fontSize="23">
                    {valor}
                  </text>
                </g>
              );
            })}
            <text className="natural-text natural-text-strong" x={centro} y={alto - 24} textAnchor="middle" fontSize="28">
              {d} · {formatNatural(valor)} = {formatNatural(d * valor)}
            </text>
          </g>
        );
      })}
    </Figura>
  );
}

/** Puntos agrupados de a `grupo`; lo que no completa un grupo es el resto. */
export function GruposPuntos({
  total,
  grupo,
  descripcion,
}: {
  total: number;
  grupo: number;
  descripcion: string;
}) {
  if (total > 60) throw new Error('GruposPuntos admite hasta 60 puntos.');
  const { cociente, resto } = dividir(total, grupo);
  const columnas = Math.min(grupo, 5);
  const filas = Math.ceil(grupo / 5);
  const paso = 44;
  const caja = { ancho: columnas * paso + 18, alto: filas * paso + 18 };
  const cajas = [
    ...Array.from({ length: cociente }, () => caja.ancho),
    ...(resto ? [Math.min(resto, 5) * paso + 18] : []),
  ];
  const { posiciones, altoTotal } = flujo(cajas, caja.alto, 1170, 14);
  const alto = altoTotal + 76;
  const anchoUsado = Math.max(...posiciones.map((p, i) => p.x + (cajas[i] ?? 0)));
  const puntos = (cantidad: number, x0: number, y0: number, clase: string) =>
    Array.from({ length: cantidad }, (_, k) => (
      <circle
        key={k}
        className={clase}
        cx={x0 + 9 + paso / 2 + (k % 5) * paso}
        cy={y0 + 9 + paso / 2 + Math.floor(k / 5) * paso}
        r="16"
      />
    ));
  return (
    <Figura alto={alto} descripcion={descripcion}>
      <g transform={`translate(${(ANCHO - anchoUsado) / 2} 10)`}>
        {posiciones.map((p, i) => {
          const esResto = i >= cociente;
          const cantidad = esResto ? resto : grupo;
          const ancho = cajas[i] ?? 0;
          const altoCaja = esResto ? Math.ceil(resto / 5) * paso + 18 : caja.alto;
          return (
            <g key={i}>
              <rect
                className={esResto ? 'natural-box-rest' : 'natural-box'}
                x={p.x}
                y={p.y}
                width={ancho}
                height={altoCaja}
                rx="12"
              />
              {puntos(cantidad, p.x, p.y, esResto ? 'natural-dot-rest' : 'natural-dot')}
            </g>
          );
        })}
      </g>
      <text className="natural-text natural-text-strong" x={ANCHO / 2} y={alto - 22} textAnchor="middle" fontSize="32">
        {total} = {grupo} · {cociente} + {resto}
      </text>
    </Figura>
  );
}

/** Todos los rectángulos de n cuadrados: sus lados son los divisores de n. */
export function RectangulosDivisores({ n, descripcion }: { n: number; descripcion: string }) {
  if (n > 30) throw new Error('RectangulosDivisores admite hasta n = 30.');
  const pares = paresDivisores(n);
  const lado = Math.min(44, Math.floor(1100 / n));
  const anchos = pares.map(([, b]) => Math.max(b * lado, 120));
  const altoFila = Math.max(...pares.map(([a]) => a * lado)) + 50;
  const { posiciones, altoTotal } = flujo(anchos, altoFila, 1140, 36);
  const alto = altoTotal + 70;
  return (
    <Figura alto={alto} descripcion={descripcion}>
      <g transform="translate(30 14)">
        {pares.map(([a, b], i) => {
          const p = posiciones[i] ?? { x: 0, y: 0 };
          return (
            <g key={`${a}x${b}`}>
              {Array.from({ length: a * b }, (_, k) => (
                <rect
                  key={k}
                  className="natural-cell"
                  x={p.x + (k % b) * lado}
                  y={p.y + Math.floor(k / b) * lado}
                  width={lado}
                  height={lado}
                />
              ))}
              <text
                className="natural-text natural-text-strong"
                x={p.x + (b * lado) / 2}
                y={p.y + a * lado + 36}
                textAnchor="middle"
                fontSize="28"
              >
                {a} × {b}
              </text>
            </g>
          );
        })}
      </g>
      <text className="natural-text" x={ANCHO / 2} y={alto - 18} textAnchor="middle" fontSize="30">
        Divisores de {n}: {divisores(n).join(', ')}
      </text>
    </Figura>
  );
}

/** Tabla de 1 a `max`: primos destacados, el 1 aparte y `marcar` con borde ocre. */
export function CribaPrimos({
  max,
  columnas = 10,
  marcar = [],
  descripcion,
}: {
  max: number;
  columnas?: number;
  marcar?: number[];
  descripcion: string;
}) {
  if (max > 60) throw new Error('CribaPrimos admite hasta 60 números.');
  const ancho = 1120 / columnas;
  const altoCelda = 66;
  const filas = Math.ceil(max / columnas);
  const alto = filas * altoCelda + 80;
  return (
    <Figura alto={alto} descripcion={descripcion}>
      <g transform="translate(40 8)">
        {Array.from({ length: max }, (_, i) => {
          const n = i + 1;
          const x = (i % columnas) * ancho;
          const y = Math.floor(i / columnas) * altoCelda;
          const primo = esPrimo(n);
          return (
            <g key={n}>
              <rect
                className={`natural-sieve${primo ? ' natural-sieve-prime' : ''}${marcar.includes(n) ? ' natural-sieve-mark' : ''}`}
                x={x + 4}
                y={y + 4}
                width={ancho - 8}
                height={altoCelda - 8}
                rx="8"
              />
              <text
                className={primo ? 'natural-text natural-text-strong' : 'natural-muted'}
                x={x + ancho / 2}
                y={y + altoCelda / 2 + 11}
                textAnchor="middle"
                fontSize="30"
              >
                {n}
              </text>
            </g>
          );
        })}
      </g>
      <g transform={`translate(40 ${filas * altoCelda + 26})`}>
        <rect className="natural-sieve natural-sieve-prime" x="0" y="0" width="40" height="34" rx="6" />
        <text className="natural-text" x="54" y="27" fontSize="26">primo</text>
        <rect className="natural-sieve" x="200" y="0" width="40" height="34" rx="6" />
        <text className="natural-text" x="254" y="27" fontSize="26">compuesto, o el 1 (ni primo ni compuesto)</text>
        {marcar.length > 0 && (
          <>
            <rect className="natural-sieve natural-sieve-mark" x="830" y="0" width="40" height="34" rx="6" />
            <text className="natural-text" x="884" y="27" fontSize="26">impar compuesto</text>
          </>
        )}
      </g>
    </Figura>
  );
}

/** Árbol de factores: en cada nivel sale el menor primo y sigue el otro factor. */
export function ArbolFactores({ n, descripcion }: { n: number; descripcion: string }) {
  const factores = factoresPrimos(n);
  if (factores.length < 2) throw new Error('ArbolFactores requiere un número compuesto.');
  if (factores.length > 7) throw new Error('ArbolFactores admite hasta siete factores.');
  const nodos: number[] = [n];
  for (const p of factores.slice(0, -1)) nodos.push((nodos.at(-1) ?? n) / p);
  const dx = 62;
  const dy = 76;
  const x0 = 130;
  const y0 = 44;
  const alto = y0 + (nodos.length - 1) * dy + 100;
  return (
    <Figura alto={alto} descripcion={descripcion} angosta>
      {nodos.map((valor, k) => {
        const x = x0 + k * dx;
        const y = y0 + k * dy;
        const ultimo = k === nodos.length - 1;
        const primo = factores[k] ?? 0;
        return (
          <g key={k}>
            {!ultimo && (
              <>
                <line className="natural-branch" x1={x} y1={y + 12} x2={x - dx + 12} y2={y + dy - 26} />
                <line className="natural-branch" x1={x} y1={y + 12} x2={x + dx} y2={y + dy - 26} />
                <circle className="natural-prime-leaf" cx={x - dx} cy={y + dy} r="24" />
                <text className="natural-text natural-text-strong" x={x - dx} y={y + dy + 10} textAnchor="middle" fontSize="28">
                  {primo}
                </text>
              </>
            )}
            {ultimo && <circle className="natural-prime-leaf" cx={x} cy={y} r="24" />}
            <text
              className={`natural-text${ultimo ? ' natural-text-strong' : ''}`}
              x={x}
              y={y + 10}
              textAnchor="middle"
              fontSize="30"
            >
              {formatNatural(valor)}
            </text>
          </g>
        );
      })}
      <text className="natural-text natural-text-strong" x={300} y={alto - 24} textAnchor="middle" fontSize="32">
        {formatNatural(n)} = {escrituraPrima(n)}
      </text>
    </Figura>
  );
}

/** Una recta por número con sus múltiplos; los comunes se unen con una guía. */
export function LineasMultiplos({
  numeros,
  hasta,
  rotulos = [],
  descripcion,
}: {
  numeros: number[];
  hasta: number;
  rotulos?: string[];
  descripcion: string;
}) {
  if (numeros.length < 2 || numeros.length > 4)
    throw new Error('LineasMultiplos admite de dos a cuatro números.');
  const comun = mcm(numeros);
  const comunes = [0, ...multiplosHasta(comun, hasta)];
  const izquierda = 250;
  const derecha = 1150;
  const sx = (v: number) => izquierda + (v / hasta) * (derecha - izquierda);
  const fila = 80;
  const top = 44;
  const alto = top + numeros.length * fila + 16;
  return (
    <Figura alto={alto} descripcion={descripcion}>
      {comunes.map((v) => (
        <line key={`g${v}`} className="natural-guide" x1={sx(v)} x2={sx(v)} y1={top - 30} y2={top + (numeros.length - 1) * fila + 22} />
      ))}
      {numeros.map((n, i) => {
        const y = top + i * fila;
        return (
          <g key={n}>
            <text className="natural-text natural-text-strong" x={20} y={y + 10} fontSize="28">
              {rotulos[i] ?? `múltiplos de ${n}`}
            </text>
            <line className="natural-axis" x1={izquierda} x2={derecha} y1={y} y2={y} />
            {[0, ...multiplosHasta(n, hasta)].map((m) => {
              const destacado = comunes.includes(m);
              return (
                <g key={m}>
                  <circle className={destacado ? 'natural-dot-common' : 'natural-dot'} cx={sx(m)} cy={y} r={destacado ? 13 : 10} />
                  <text
                    className={destacado ? 'natural-text natural-text-strong natural-text-mask' : 'natural-text'}
                    x={sx(m)}
                    y={y + 42}
                    textAnchor="middle"
                    fontSize="25"
                  >
                    {m}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </Figura>
  );
}

/** Barras cortadas en trozos iguales de largo `trozo`, que debe dividir a todas. */
export function BarrasDivision({
  longitudes,
  trozo,
  unidad = '',
  descripcion,
}: {
  longitudes: number[];
  trozo: number;
  unidad?: string;
  descripcion: string;
}) {
  if (longitudes.some((l) => l % trozo !== 0))
    throw new Error(`BarrasDivision: ${trozo} no divide a todas las longitudes.`);
  if (!Number.isInteger(trozo) || trozo < 1) throw new Error('El trozo debe ser natural.');
  const izquierda = 170;
  const largo = 760;
  const escala = largo / Math.max(...longitudes);
  const fila = 80;
  const alto = longitudes.length * fila + 20;
  const sufijo = unidad ? ` ${unidad}` : '';
  return (
    <Figura alto={alto} descripcion={descripcion}>
      {longitudes.map((l, i) => {
        const y = 14 + i * fila;
        const trozos = l / trozo;
        return (
          <g key={i}>
            <text className="natural-text natural-text-strong" x={20} y={y + 38} fontSize="28">
              {l}{sufijo}
            </text>
            {Array.from({ length: trozos }, (_, k) => (
              <g key={k}>
                <rect
                  className={k % 2 ? 'natural-piece natural-piece-alt' : 'natural-piece'}
                  x={izquierda + k * trozo * escala}
                  y={y}
                  width={trozo * escala}
                  height="54"
                />
                <text className="natural-text" x={izquierda + (k + 0.5) * trozo * escala} y={y + 37} textAnchor="middle" fontSize="26">
                  {trozo}
                </text>
              </g>
            ))}
            <text className="natural-text" x={izquierda + l * escala + 22} y={y + 38} fontSize="28">
              = {trozos} {trozos === 1 ? 'trozo' : 'trozos'}
            </text>
          </g>
        );
      })}
    </Figura>
  );
}
