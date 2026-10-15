import { createContext, useContext, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, Lightbulb, TriangleAlert, CheckCircle2, RotateCcw } from 'lucide-react';
import katex from 'katex';
import type {
  Activity,
  MascotPlacement,
  MascotPresence,
  MascotTemplate,
} from '@aula/content-model';
import { katexOptions } from '@aula/content-model';
export interface SlideRuntime {
  step: number;
  print: boolean;
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
  activities: Record<string, Activity>;
  mascotUrl: (pose: number) => string;
  templates?: readonly MascotTemplate[];
}
export const SlideContext = createContext<SlideRuntime>({
  step: 0,
  print: false,
  values: {},
  setValue: () => {},
  activities: {},
  mascotUrl: () => '',
});
export const useSlide = () => useContext(SlideContext);
type BlockProps = { titulo?: string; children: ReactNode };
function Block({ kind, titulo, children }: { kind: string } & BlockProps) {
  const Icon =
    kind === 'error'
      ? TriangleAlert
      : kind === 'definicion'
        ? BookOpen
        : kind === 'cierre'
          ? CheckCircle2
          : Lightbulb;
  return (
    <section className={`block block-${kind}`}>
      <div className="block-label">
        <Icon size={22} />
        {titulo || kind}
      </div>
      <div>{children}</div>
    </section>
  );
}
export const Definicion = (p: BlockProps) => <Block kind="definicion" {...p} />;
export const Objetivo = (p: BlockProps) => <Block kind="objetivo" {...p} />;
export const Comprobacion = (p: BlockProps) => (
  <Block kind="comprobacion" {...p} />
);
export type AssociationTone = 1 | 2 | 3 | 4;
const associationClass = (tone?: AssociationTone) =>
  tone === undefined ? '' : ` association-tone-${tone}`;
export function Tarjeta({
  titulo,
  etiqueta,
  tono,
  children,
}: BlockProps & { etiqueta?: string; tono?: AssociationTone }) {
  return (
    <section className={`teaching-card${associationClass(tono)}`}>
      {etiqueta && <span className="teaching-tag">{etiqueta}</span>}
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}
export function Paneles({
  children,
  columnas = 2,
}: {
  children: ReactNode;
  columnas?: 2 | 3;
}) {
  return <div className={`teaching-panels panels-${columnas}`}>{children}</div>;
}
export function Etiquetas({ children }: { children: ReactNode }) {
  return <div className="teaching-labels">{children}</div>;
}
export function Etiqueta({
  tono,
  children,
}: {
  tono?: AssociationTone;
  children: ReactNode;
}) {
  return <span className={associationClass(tono).trim()}>{children}</span>;
}
export function Asociacion({
  tono,
  children,
}: {
  tono: AssociationTone;
  children: ReactNode;
}) {
  return (
    <span className={`association-inline${associationClass(tono)}`}>
      {children}
    </span>
  );
}
export function Composicion({
  plantilla,
  nota,
  children,
}: {
  plantilla: string;
  nota?: string;
  children: ReactNode;
}) {
  const runtime = useSlide();
  const template = runtime.templates?.find((item) => item.id === plantilla);
  if (!template)
    throw new Error(`Plantilla de mascota desconocida: ${plantilla}`);
  const wide = ['dos-columnas', 'grafico', 'sintesis'].includes(
    template.layout,
  );
  return (
    <div
      className={`mascot-composition ${wide ? 'composition-foot' : 'composition-side'} ${template.mascot.nivel === 'marca' ? 'composition-brand' : ''}`}
      data-template={plantilla}
    >
      <div className="composition-content">{children}</div>
      <aside className="composition-companion">
        <img
          className={`composition-mascot mascot-level-${template.mascot.nivel}`}
          src={runtime.mascotUrl(template.mascot.pose)}
          alt={template.mascot.alt}
        />
        {nota && <p>{nota}</p>}
      </aside>
    </div>
  );
}
/**
 * Prerrequisito que un video recuerda de otra clase. Es un marco sin fondo propio: su
 * contenido conserva el color de su función (una definición recordada sigue azul).
 */
export function Recuerda({
  clase,
  titulo,
  children,
}: {
  clase: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <aside className="recuerda" data-clase={clase}>
      <div className="recuerda-label">
        <RotateCcw size={22} aria-hidden="true" />
        <span>Recuerda</span>
        <span className="recuerda-source">· {titulo}</span>
      </div>
      <div>{children}</div>
    </aside>
  );
}
export const Propiedad = (p: BlockProps) => <Block kind="propiedad" {...p} />;
export const Teorema = ({
  hipotesis,
  conclusion,
}: {
  hipotesis: string;
  conclusion: string;
}) => (
  <Block kind="teorema" titulo="Teorema">
    <p>
      <strong>Si:</strong> {hipotesis}
    </p>
    <p>
      <strong>Entonces:</strong> {conclusion}
    </p>
  </Block>
);
export const EjemploResuelto = (p: BlockProps) => (
  <Block kind="ejemplo" titulo="Modelado" {...p} />
);
export const PracticaGuiada = (p: BlockProps) => (
  <Block kind="guiada" titulo="Construyamos juntos" {...p} />
);
export const ErrorTipico = (p: BlockProps) => (
  <Block kind="error" titulo="Detecta el error" {...p} />
);
export const PracticaIndividual = (p: BlockProps) => (
  <Block kind="individual" titulo="Tu turno" {...p} />
);
export const Cierre = (p: BlockProps) => (
  <Block kind="cierre" titulo="Lo que nos llevamos" {...p} />
);
/** Dos columnas iguales; `amplia` da más ancho a una de ellas (p. ej. a un enunciado largo). */
export const Columnas = ({
  amplia,
  children,
}: {
  amplia?: 'izquierda' | 'derecha';
  children: ReactNode;
}) => (
  <div className={amplia ? `columns columns-wide-${amplia}` : 'columns'}>
    {children}
  </div>
);
export function MascotaProfePina({
  pose,
  nivel,
  ubicacion,
  alt,
}: {
  pose: number;
  nivel: MascotPresence;
  ubicacion: MascotPlacement;
  alt: string;
}) {
  const src = useSlide().mascotUrl(pose);
  if (!src) return null;
  return (
    <img
      className={`slide-mascot mascot-level-${nivel} mascot-position-${ubicacion}`}
      src={src}
      alt={alt}
    />
  );
}
export function Paso({ n, children }: { n: number; children: ReactNode }) {
  const { step, print } = useSlide();
  const reduced = useReducedMotion();
  const visible = print || step >= n;
  return (
    <motion.div
      className="step"
      aria-hidden={!visible}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: reduced || print ? 0 : 0.15 }}
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    >
      {children}
    </motion.div>
  );
}
/** Aparece en el paso indicado (o siempre, sin paso) y reserva su espacio mientras tanto. */
function Revela({
  paso,
  className,
  children,
}: {
  paso?: number;
  className: string;
  children: ReactNode;
}) {
  const { step, print } = useSlide();
  const reduced = useReducedMotion();
  const visible = print || paso === undefined || step >= paso;
  return (
    <motion.span
      className={className}
      aria-hidden={!visible}
      initial={false}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: reduced || print ? 0 : 0.15 }}
      style={{ visibility: visible ? 'visible' : 'hidden' }}
    >
      {children}
    </motion.span>
  );
}
const NumeroReferencia = ({ numero }: { numero: number }) => (
  <span className="reference-number">{numero}</span>
);
export type SignalPlacement = 'derecha' | 'abajo' | 'arriba';
/**
 * Ficha que nombra una expresión o un término y aparece en un paso. Su muesca apunta a lo
 * que envuelve; el número opcional la conecta con un ItemLeyenda.
 */
export function Senal({
  paso,
  texto,
  numero,
  posicion = 'derecha',
  children,
}: {
  paso: number;
  texto: string;
  numero?: number;
  posicion?: SignalPlacement;
  children: ReactNode;
}) {
  return (
    <span className={`signal signal-${posicion}`}>
      <span className="signal-target">{children}</span>
      <Revela paso={paso} className="signal-mark">
        {numero !== undefined && <NumeroReferencia numero={numero} />}
        <span className="signal-text">{texto}</span>
      </Revela>
    </span>
  );
}
/** Tabla para leer expresiones: nombre, expresión y un rasgo que se revela por fila. */
export function TablaLectura({
  encabezados,
  children,
}: {
  encabezados: string;
  children: ReactNode;
}) {
  const [nombre, expresion, rasgo] = encabezados
    .split('|')
    .map((e) => e.trim());
  return (
    <table className="reading-table">
      <thead>
        <tr>
          <th scope="col">{nombre}</th>
          <th scope="col">{expresion}</th>
          <th scope="col">{rasgo}</th>
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}
export function FilaLectura({
  nombre,
  rasgo,
  paso,
  children,
}: {
  nombre: string;
  rasgo: string;
  paso: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <th scope="row">{nombre}</th>
      <td>{children}</td>
      <td className="reading-trait-cell">
        <Revela paso={paso} className="reading-trait">
          {rasgo}
        </Revela>
      </td>
    </tr>
  );
}
/**
 * Semáforo de autoevaluación: rojo, amarillo y verde de arriba abajo, cada luz con su
 * significado escrito para no depender solo del color.
 */
export function Semaforo({
  rojo,
  amarillo,
  verde,
}: {
  rojo: string;
  amarillo: string;
  verde: string;
}) {
  const luces = [
    ['rojo', 'Rojo', rojo],
    ['amarillo', 'Amarillo', amarillo],
    ['verde', 'Verde', verde],
  ] as const;
  return (
    <div className="traffic-light">
      <div className="traffic-light-housing" aria-hidden="true">
        {luces.map(([id]) => (
          <span key={id} className={`traffic-light-lamp lamp-${id}`} />
        ))}
      </div>
      <ul className="traffic-light-labels">
        {luces.map(([id, nombre, texto]) => (
          <li key={id}>
            <strong>{nombre}:</strong>
            <span>{texto}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
/** Recordatorio de lo que significa cada referencia numerada. */
export function Leyenda({ children }: { children: ReactNode }) {
  return <div className="reading-legend">{children}</div>;
}
export function ItemLeyenda({
  numero,
  paso,
  children,
}: {
  numero: number;
  paso?: number;
  children: ReactNode;
}) {
  return (
    <Revela paso={paso} className="reading-legend-item">
      <NumeroReferencia numero={numero} />
      <span>{children}</span>
    </Revela>
  );
}
export function Formula({ tex }: { tex: string }) {
  return (
    <span
      className="formula"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, {
          ...katexOptions,
          displayMode: true,
        }),
      }}
    />
  );
}
/**
 * Pregunta del banco con sus alternativas. Con `mostrarRespuesta={false}` solo se plantea:
 * la respuesta queda para una lámina posterior y ni el PDF marca la correcta.
 */
export function PreguntaPAES({
  id,
  paso = 1,
  mostrarRespuesta = true,
}: {
  id: string;
  paso?: number;
  mostrarRespuesta?: boolean;
}) {
  const runtime = useSlide();
  const activity = runtime.activities[id];
  if (!activity) throw new Error(`Actividad desconocida: ${id}`);
  const revealed = mostrarRespuesta && (runtime.print || runtime.step >= paso);
  return (
    <section className="question">
      <div className="block-label">
        {activity.source.kind === 'oficial'
          ? 'PAES · fuente oficial'
          : 'Tipo PAES · elaboración propia'}
      </div>
      <p>{activity.prompt}</p>
      <div className="options">
        {activity.options?.map((option) =>
          runtime.print ? (
            <div
              key={option.id}
              className={`option ${revealed && option.correct ? 'correct' : ''}`}
            >
              <b>{option.id}</b>
              <span>{option.text}</span>
            </div>
          ) : (
            <button
              key={option.id}
              className={`option ${runtime.values[id] === option.id ? 'selected' : ''} ${revealed && option.correct ? 'correct' : ''}`}
              onClick={() => runtime.setValue(id, option.id)}
              aria-pressed={runtime.values[id] === option.id}
            >
              <b>{option.id}</b>
              <span>{option.text}</span>
            </button>
          ),
        )}
      </div>
      {mostrarRespuesta && (
        <Paso n={paso}>
          <div className="answer">
            <strong>{activity.answer}</strong>
            <p>{activity.solution}</p>
            {!runtime.print &&
              activity.options
                ?.filter(
                  (option) =>
                    option.id === runtime.values[id] && !option.correct,
                )
                .map((option) => (
                  <p className="distractor-feedback" key={option.id}>
                    <strong>Tu elección {option.id}:</strong>{' '}
                    {option.explanation}
                  </p>
                ))}
          </div>
        </Paso>
      )}
    </section>
  );
}
