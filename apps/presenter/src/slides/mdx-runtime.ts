import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { katexOptions } from '@aula/content-model';
import type { CompiledContent } from '../store/deck';

/**
 * Compila en el navegador el MDX de una lámina editada. Se carga de forma diferida:
 * las clases del repositorio se siguen compilando en build y no lo necesitan.
 */
export async function compileBody(body: string): Promise<CompiledContent> {
  const module = await evaluate(body, {
    ...runtime,
    remarkPlugins: [remarkMath],
    rehypePlugins: [[rehypeKatex, katexOptions]],
  });
  return module.default;
}
