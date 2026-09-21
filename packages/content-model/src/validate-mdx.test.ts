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
it('rechaza más de una mascota en la misma diapositiva', () => {
  const mascota = {
    type: 'mdxJsxFlowElement',
    name: 'MascotaProfePina',
    attributes: [
      { type: 'mdxJsxAttribute', name: 'pose', value: { value: '43' } },
      { type: 'mdxJsxAttribute', name: 'nivel', value: 'sutil' },
      {
        type: 'mdxJsxAttribute',
        name: 'ubicacion',
        value: 'superior-derecha',
      },
      {
        type: 'mdxJsxAttribute',
        name: 'alt',
        value: 'Profe Piña sostiene una taza.',
      },
    ],
  };
  expect(() =>
    validateMdxTree(
      { type: 'root', children: [mascota, mascota] },
      { ...slide, steps: 0 },
    ),
  ).toThrow('una mascota');
});

it('valida referencias y cuenta mascotas incorporadas mediante plantillas', () => {
  const composition = {
    type: 'mdxJsxFlowElement',
    name: 'Composicion',
    attributes: [
      {
        type: 'mdxJsxAttribute',
        name: 'plantilla',
        value: 'pedagogica-modelado',
      },
    ],
  };
  const tree = { type: 'root', children: [composition] };
  expect(() =>
    validateMdxTree(tree, { ...slide, steps: 0 }, new Set()),
  ).toThrow('desconocida');
  expect(() =>
    validateMdxTree(
      tree,
      { ...slide, steps: 0 },
      new Set(['pedagogica-modelado']),
    ),
  ).not.toThrow();
  expect(() =>
    validateMdxTree(
      { type: 'root', children: [composition, composition] },
      { ...slide, steps: 0 },
    ),
  ).toThrow('una mascota');
});

function element(name: string, tono?: string) {
  return {
    type: 'mdxJsxTextElement',
    name,
    attributes:
      tono === undefined
        ? []
        : [{ type: 'mdxJsxAttribute', name: 'tono', value: { value: tono } }],
  };
}
const noSteps = { ...slide, steps: 0 };
it('acepta los componentes de momento y de asociación con tono 1 a 5', () => {
  for (const name of ['Ticket', 'Registro', 'Etiqueta', 'Tarjeta'])
    expect(() =>
      validateMdxTree({ type: 'root', children: [element(name)] }, noSteps),
    ).not.toThrow();
  for (const tono of ['1', '2', '3', '4', '5'])
    expect(() =>
      validateMdxTree(
        { type: 'root', children: [element('Asociado', tono)] },
        noSteps,
      ),
    ).not.toThrow();
});
it('rechaza tonos de asociación fuera de 1 a 5 y Asociado sin tono', () => {
  for (const tono of ['0', '6', 'a', '1.5'])
    expect(() =>
      validateMdxTree(
        { type: 'root', children: [element('Tarjeta', tono)] },
        noSteps,
      ),
    ).toThrow('de 1 a 5');
  expect(() =>
    validateMdxTree({ type: 'root', children: [element('Asociado')] }, noSteps),
  ).toThrow('requiere un tono');
});
