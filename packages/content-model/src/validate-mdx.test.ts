import { it, expect } from 'vitest';
import { validateMdxTree } from './validate-mdx';
import type { Slide } from './index';
const slide: Slide = {
  id: 'a',
  title: 'A',
  phase: 'inicio',
  layout: 'concepto',
  steps: 1,
  activities: [],
};
it('detecta un paso declarado sin contenido', () => {
  expect(() => validateMdxTree({ type: 'root', children: [] }, slide)).toThrow(
    'paso 1',
  );
});
it('rechaza imports en una diapositiva', () => {
  expect(() =>
    validateMdxTree({ type: 'root', children: [{ type: 'mdxjsEsm' }] }, slide),
  ).toThrow('JavaScript');
});
it('acepta un paso numérico validado', () => {
  expect(() =>
    validateMdxTree(
      {
        type: 'root',
        children: [
          {
            type: 'mdxJsxFlowElement',
            name: 'Paso',
            attributes: [
              { type: 'mdxJsxAttribute', name: 'n', value: { value: '1' } },
            ],
          },
        ],
      },
      slide,
    ),
  ).not.toThrow();
});
