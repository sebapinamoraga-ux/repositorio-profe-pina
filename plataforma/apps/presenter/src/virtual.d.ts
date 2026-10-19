declare module 'virtual:aula-mascots' {
  export const mascotFiles: Record<number, string>;
}
declare module 'virtual:aula-catalog' {
  import type { ComponentType } from 'react';
  import type { MDXComponents } from 'mdx/types';
  /** Archivos de contenido del build (ruta del repositorio → texto); sin borradores en producción. */
  export const buildFiles: Record<string, string>;
  /** Cada lámina del build, ya compilada, por ruta del repositorio. */
  export const compiledSlides: Record<
    string,
    ComponentType<{ components: MDXComponents }>
  >;
}
