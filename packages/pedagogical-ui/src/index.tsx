import { createContext, useContext, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import {
  BookOpen,
  Camera,
  CheckCheck,
  CheckCircle2,
  Lightbulb,
  Target,
  Ticket as TicketIcon,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react';
import katex from 'katex';
import type {
  Activity,
  MascotPlacement,
  MascotPresence,
  MascotTemplate,
} from '@aula/content-model';
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
/** Un icono por momento pedagógico: el color nunca es la única señal (docs/visual-language.md). */
const blockIcons: Record<string, LucideIcon> = {
  error: TriangleAlert,
  definicion: BookOpen,
  cierre: CheckCircle2,
  objetivo: Target,
  comprobacion: CheckCheck,
  ticket: TicketIcon,
};
const blockTitles: Record<string, string> = {
  objetivo: 'Objetivo',
  comprobacion: 'Verifiquemos',
  ticket: 'Ticket de salida',
};
function Block({ kind, titulo, children }: { kind: string } & BlockProps) {
  const Icon = blockIcons[kind] ?? Lightbulb;
  return (
    <section className={`block block-${kind}`}>
      <div className="block-label">
        <Icon size={22} />
        {titulo || blockTitles[kind] || kind}
      </div>
      <div>{children}</div>
    </section>
  );
}
/** Color de asociación (1 a 5): enlaza cajas o términos que representan lo mismo en distintos lugares. */
type Tono = number | string;
const toneClass = (tono?: Tono) =>
  tono === undefined ? '' : ` tono-${Number(tono)}`;
export const Definicion = (p: BlockProps) => <Block kind="definicion" {...p} />;
export const Objetivo = (p: BlockProps) => <Block kind="objetivo" {...p} />;
export const Comprobacion = (p: BlockProps) => (
  <Block kind="comprobacion" {...p} />
);
export const Ticket = (p: BlockProps) => <Block kind="ticket" {...p} />;
export function Tarjeta({
  titulo,
  etiqueta,
  tono,
  children,
}: BlockProps & { etiqueta?: string; tono?: Tono }) {
  return (
    <section className={`teaching-card${toneClass(tono)}`}>
      {etiqueta && <span className="teaching-tag">{etiqueta}</span>}
      <h3>{titulo}</h3>
      {children}
    </section>
  );
}
/** Material para consultar o compartir, no para revisar en clase. */
export function Registro({
  titulo,
  etiqueta,
  children,
}: BlockProps & { etiqueta?: string }) {
  return (
    <section className="teaching-card registro">
      <div className="block-label">
        <Camera size={22} />
        Registro · {titulo}
      </div>
      {etiqueta && <span className="teaching-tag">{etiqueta}</span>}
      {children}
    </section>
  );
}
export function Etiqueta({
  tono,
  children,
}: {
  tono?: Tono;
  children: ReactNode;
}) {
  return <span className={`etiqueta${toneClass(tono)}`}>{children}</span>;
}
export function Asociado({
  tono,
  children,
}: {
  tono: Tono;
  children: ReactNode;
}) {
  return <span className={`asociado${toneClass(tono)}`}>{children}</span>;
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
export const Columnas = ({ children }: { children: ReactNode }) => (
  <div className="columns">{children}</div>
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
export function Formula({ tex }: { tex: string }) {
  return (
    <span
      className="formula"
      dangerouslySetInnerHTML={{
        __html: katex.renderToString(tex, {
          throwOnError: true,
          trust: false,
          displayMode: true,
        }),
      }}
    />
  );
}
export function PreguntaPAES({ id, paso = 1 }: { id: string; paso?: number }) {
  const runtime = useSlide();
  const activity = runtime.activities[id];
  if (!activity) throw new Error(`Actividad desconocida: ${id}`);
  const revealed = runtime.print || runtime.step >= paso;
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
              className={`option ${option.correct ? 'correct' : ''}`}
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
      <Paso n={paso}>
        <div className="answer">
          <strong>{activity.answer}</strong>
          <p>{activity.solution}</p>
          {!runtime.print &&
            activity.options
              ?.filter(
                (option) => option.id === runtime.values[id] && !option.correct,
              )
              .map((option) => (
                <p className="distractor-feedback" key={option.id}>
                  <strong>Tu elección {option.id}:</strong> {option.explanation}
                </p>
              ))}
        </div>
      </Paso>
    </section>
  );
}
