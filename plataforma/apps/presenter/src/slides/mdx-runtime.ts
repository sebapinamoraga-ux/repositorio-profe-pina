import { evaluate } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { katexOptions } from '@aula/content-model';
import type { CompiledContent } from '../store/deck';

interface MdNode {
  type: string;
  position?: { start?: { offset?: number } };
  children?: MdNode[];
  name?: string;
  attributes?: { type: string; name: string; value: string }[];
}

/**
 * Solo para el editor: envuelve cada bloque de la lámina en `<EditorBloque i="k">`, que el
 * lienzo dibuja como un `div` con `display: contents` para saber dónde está cada bloque. `starts`
 * dice en qué posición del MDX empieza el bloque k. No se usa fuera del editor (Presentador,
 * PDF y Estudiante compilan sin él).
 */
function remarkEditorBlocks(starts: ReadonlyMap<number, number>) {
  // Solo se recorre lo que contiene bloques; lo que está dentro de un bloque no se toca.
  const containers = new Set([
    'Columnas',
    'div',
    'Paso',
    'Paneles',
    'Composicion',
  ]);
  const wrap = (node: MdNode) => {
    if (!node.children) return;
    node.children = node.children.map((child) => {
      if (
        child.type === 'mdxJsxFlowElement' &&
        child.name &&
        containers.has(child.name)
      )
        wrap(child);
      const offset = child.position?.start?.offset;
      const index = offset === undefined ? undefined : starts.get(offset);
      if (index === undefined) return child;
      const wrapper: MdNode = {
        type: 'mdxJsxFlowElement',
        name: 'EditorBloque',
        attributes: [
          { type: 'mdxJsxAttribute', name: 'i', value: String(index) },
        ],
        children: [child],
      };
      return wrapper;
    });
  };
  return () => (tree: unknown) => {
    wrap(tree as MdNode);
  };
}

/**
 * Compila en el navegador el MDX de una lámina editada. Se carga de forma diferida:
 * las clases del repositorio se siguen compilando en build y no lo necesitan.
 */
export async function compileBody(
  body: string,
  options: { blocks?: ReadonlyMap<number, number> } = {},
): Promise<CompiledContent> {
  const module = await evaluate(body, {
    ...runtime,
    remarkPlugins: [
      remarkMath,
      ...(options.blocks ? [remarkEditorBlocks(options.blocks)] : []),
    ],
    rehypePlugins: [[rehypeKatex, katexOptions]],
  });
  return module.default;
}
