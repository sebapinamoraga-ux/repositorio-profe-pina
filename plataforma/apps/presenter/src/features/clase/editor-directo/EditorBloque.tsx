import { createContext, useContext, type ReactNode } from 'react';

/** Lo que cada bloque necesita saber del lienzo para dibujarse (solo en el editor). */
export interface CanvasState {
  /** «todo»: se ve todo y lo que aparece más adelante se atenúa; «proyectar»: como en clase. */
  mode: 'todo' | 'proyectar';
  /** Paso que se está viendo. */
  view: number;
  /** Paso de cada bloque. */
  stepOf: ReadonlyMap<number, number>;
  /** Bloque que se está escribiendo (queda atenuado bajo su editor). */
  editing: number | null;
}

export const CanvasContext = createContext<CanvasState>({
  mode: 'proyectar',
  view: 0,
  stepOf: new Map(),
  editing: null,
});

/**
 * Envoltorio que el plugin del editor agrega a cada bloque. No tiene caja propia
 * (`display: contents`): la lámina se dibuja igual y el lienzo localiza el bloque por sus hijos.
 */
export function EditorBloque({
  i,
  children,
}: {
  i: string;
  children?: ReactNode;
}) {
  const state = useContext(CanvasContext);
  const index = Number(i);
  const future =
    state.mode === 'todo' && (state.stepOf.get(index) ?? 0) > state.view;
  return (
    <div
      data-bloque={index}
      data-futuro={future ? '' : undefined}
      data-editando={state.editing === index ? '' : undefined}
      style={{ display: 'contents' }}
    >
      {children}
    </div>
  );
}
