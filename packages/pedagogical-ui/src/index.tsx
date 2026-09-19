import { createContext, useContext, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BookOpen, Lightbulb, TriangleAlert, CheckCircle2 } from 'lucide-react';
import katex from 'katex';
import type { Activity } from '@aula/content-model';
export interface SlideRuntime {
  step: number;
  print: boolean;
  values: Record<string, string>;
  setValue: (key: string, value: string) => void;
  activities: Record<string, Activity>;
}
export const SlideContext = createContext<SlideRuntime>({
  step: 0,
  print: false,
  values: {},
  setValue: () => {},
  activities: {},
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
