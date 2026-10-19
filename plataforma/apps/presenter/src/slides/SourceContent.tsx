import { Component, Suspense, use, type ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import type { CompiledContent } from '../store/deck';

const cache = new Map<string, Promise<CompiledContent>>();
function compiled(body: string) {
  let promise = cache.get(body);
  if (!promise) {
    promise = import('./mdx-runtime').then(({ compileBody }) =>
      compileBody(body),
    );
    cache.set(body, promise);
    if (cache.size > 200) {
      const oldest = cache.keys().next().value;
      if (oldest !== undefined) cache.delete(oldest);
    }
  }
  return promise;
}

function Compiled({
  body,
  components,
}: {
  body: string;
  components: MDXComponents;
}) {
  const Content = use(compiled(body));
  return <Content components={components} />;
}

interface ErrorState {
  error: string | null;
  key: string;
}
class SlideError extends Component<
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

/** MDX editado en el navegador, con estado de carga y error dentro del lienzo. */
export function SourceContent({
  body,
  components,
}: {
  body: string;
  components: MDXComponents;
}) {
  return (
    <SlideError resetKey={body}>
      <Suspense
        fallback={
          <p className="slide-loading" role="status">
            Preparando la lámina…
          </p>
        }
      >
        <Compiled body={body} components={components} />
      </Suspense>
    </SlideError>
  );
}
