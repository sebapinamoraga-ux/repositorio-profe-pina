declare module 'virtual:aula-catalog' {
  import type { ComponentType } from 'react';
  import type { MDXComponents } from 'mdx/types';
  export const rawCatalog: {
    meta: unknown;
    slides: {
      Content: ComponentType<{ components: MDXComponents }>;
      [key: string]: unknown;
    }[];
  }[];
  export const rawActivities: Record<string, unknown>;
}
