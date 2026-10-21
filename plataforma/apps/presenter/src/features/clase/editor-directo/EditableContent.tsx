import {
  Component,
  Suspense,
  use,
  useDeferredValue,
  type ReactNode,
} from 'react';
import type { CompiledContent } from '../../../store/deck';
import { mdxComponents } from '../../../slides/components';
import { extractBlocks } from '../editor/blocks';
import { EditorBloque } from './EditorBloque';

const components = { ...mdxComponents, EditorBloque };

const cache = new Map<string, Promise<CompiledContent>>();
function compiled(body: string, starts: ReadonlyMap<number, number>) {
  let promise = cache.get(body);
  if (!promise) {
    promise = import('../../../slides/mdx-runtime').then(({ compileBody }) =>
      compileBody(body, { blocks: starts }),
    );
    cache.set(body, promise);
    if (cache.size > 100) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }
  return promise;
}

function Compiled({
  body,
  starts,
}: {
  body: string;
  starts: ReadonlyMap<number, number>;
}) {
  const Content = use(compiled(body, starts));
  return <Content components={components} />;
}

interface ErrorState {
  error: string | null;
  key: string;
}
class Boundary extends Component<
  { children: ReactNode; resetKey: string },
  ErrorState
> {
  state: ErrorState = { error: null, key: this.props.resetKey };
  static getDerivedStateFromError(error: unknown) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
  static getDerivedStateFromProps(
    props: { resetKey: string },
    state: ErrorState,
  ) {
    return props.resetKey === state.key
      ? null
      : { error: null, key: props.resetKey };
  }
  render() {
    if (this.state.error)
      return (
        <div className="slide-error" role="alert">
          <strong>Esta lámina no compila.</strong>
          <p>{this.state.error}</p>
        </div>
      );
    return this.props.children;
  }
}

/** Posición del MDX en que empieza cada bloque (y el Paso en línea que lo envuelve) → su índice. */
export function blockStarts(body: string): ReadonlyMap<number, number> {
  const model = extractBlocks(body);
  const starts = new Map<number, number>();
  if (model.ok)
    for (const block of model.blocks)
      starts.set(
        block.paso?.inline ? block.paso.start : block.start,
        block.index,
      );
  return starts;
}

/**
 * El cuerpo de la lámina compilado para el editor: cada bloque va en un `EditorBloque`. Mientras
 * el MDX está a medias, la lámina muestra el error de compilación y vuelve cuando se corrige. Al
 * teclear, la lámina anterior se queda en pantalla hasta que la nueva está lista.
 */
export function EditableContent({ body }: { body: string }) {
  const deferred = useDeferredValue(body);
  return (
    <Boundary resetKey={deferred}>
      <Suspense
        fallback={
          <p className="slide-loading" role="status">
            Preparando la lámina…
          </p>
        }
      >
        <Compiled body={deferred} starts={blockStarts(deferred)} />
      </Suspense>
    </Boundary>
  );
}
