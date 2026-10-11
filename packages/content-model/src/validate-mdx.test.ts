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

it('limita las asociaciones pedagógicas a cuatro tonos literales', () => {
  const association = (name: string, value: string) => ({
    type: 'mdxJsxTextElement',
    name,
    attributes: [{ type: 'mdxJsxAttribute', name: 'tono', value: { value } }],
  });
  expect(() =>
    validateMdxTree(
      { type: 'root', children: [association('Etiqueta', '2')] },
      { ...slide, steps: 0 },
    ),
  ).not.toThrow();
  expect(() =>
    validateMdxTree(
      { type: 'root', children: [association('Tarjeta', '5')] },
      { ...slide, steps: 0 },
    ),
  ).toThrow('1..4');
  expect(() =>
    validateMdxTree(
      { type: 'root', children: [association('Asociacion', 'variable')] },
      { ...slide, steps: 0 },
    ),
  ).toThrow('1..4');
});
const grafico = (attrs: Record<string, string>) => ({
  type: 'root',
  children: [
    {
      type: 'mdxJsxFlowElement',
      name: 'GraficoFuncion',
      attributes: Object.entries(attrs).map(([name, value]) => ({
        type: 'mdxJsxAttribute',
        name,
        value: { value },
      })),
    },
  ],
});
const sinPasos: Slide = { ...slide, steps: 0 };
const ventana = {
  xMin: '-1',
  xMax: '4',
  yMin: '-1',
  yMax: '8',
  etiqueta: 'f(x) = 2x + 1',
  descripcion: 'Recta.',
};
it('acepta GraficoFuncion con los coeficientes de su tipo', () => {
  expect(() =>
    validateMdxTree(
      grafico({ tipo: 'afin', m: '2', n: '1', ...ventana }),
      sinPasos,
    ),
  ).not.toThrow();
});
it('rechaza GraficoFuncion sin un coeficiente o con un tipo desconocido', () => {
  expect(() =>
    validateMdxTree(
      grafico({ tipo: 'cuadratica', a: '1', b: '0', ...ventana }),
      sinPasos,
    ),
  ).toThrow('atributo c');
  expect(() =>
    validateMdxTree(grafico({ tipo: 'seno', ...ventana }), sinPasos),
  ).toThrow('tipo');
});
const componente = (name: string, attrs: string[]) => ({
  type: 'root',
  children: [
    {
      type: 'mdxJsxFlowElement',
      name,
      attributes: attrs.map((attr) => ({
        type: 'mdxJsxAttribute',
        name: attr,
        value: { value: '1' },
      })),
    },
  ],
});
it('exige los atributos de GraficoComparacion y RectaIntervalos', () => {
  expect(() =>
    validateMdxTree(
      componente('RectaIntervalos', ['min', 'max', 'descripcion']),
      sinPasos,
    ),
  ).toThrow('intervalos');
  expect(() =>
    validateMdxTree(
      componente('RectaIntervalos', [
        'min',
        'max',
        'intervalos',
        'descripcion',
      ]),
      sinPasos,
    ),
  ).not.toThrow();
  expect(() =>
    validateMdxTree(
      componente('GraficoComparacion', ['m1', 'n1', 'm2', 'n2']),
      sinPasos,
    ),
  ).toThrow('xMin');
});
it('cuenta la señal como paso y valida su posición y texto', () => {
  const senal = (attrs: Record<string, string | { value: string }>) => ({
    type: 'root',
    children: [
      {
        type: 'mdxJsxTextElement',
        name: 'Senal',
        attributes: Object.entries(attrs).map(([name, value]) => ({
          type: 'mdxJsxAttribute',
          name,
          value,
        })),
      },
    ],
  });
  expect(() =>
    validateMdxTree(
      senal({ paso: { value: '1' }, texto: 'pendiente', posicion: 'abajo' }),
      slide,
    ),
  ).not.toThrow();
  expect(() =>
    validateMdxTree(senal({ paso: { value: '2' }, texto: 'afín' }), slide),
  ).toThrow('fuera de 1..1');
  expect(() => validateMdxTree(senal({ texto: 'afín' }), slide)).toThrow(
    'fuera de 1..1',
  );
  expect(() =>
    validateMdxTree(
      senal({ paso: { value: '1' }, texto: 'afín', posicion: 'izquierda' }),
      slide,
    ),
  ).toThrow('posicion');
  expect(() => validateMdxTree(senal({ paso: { value: '1' } }), slide)).toThrow(
    'texto',
  );
});
it('valida la tabla de lectura y la leyenda numerada', () => {
  const el = (
    name: string,
    attrs: Record<string, string | { value: string }>,
    children: unknown[] = [],
  ) => ({
    type: 'mdxJsxFlowElement',
    name,
    attributes: Object.entries(attrs).map(([key, value]) => ({
      type: 'mdxJsxAttribute',
      name: key,
      value,
    })),
    children,
  });
  const fila = el('FilaLectura', {
    nombre: 'Base',
    rasgo: 'afín',
    paso: { value: '1' },
  });
  const tabla = (headers: string, rows: unknown[] = [fila]) =>
    el('TablaLectura', { encabezados: headers }, rows);
  const root = (...children: unknown[]) => ({ type: 'root', children });
  expect(() =>
    validateMdxTree(root(tabla('Plan|Expresión|Tipo')), slide),
  ).not.toThrow();
  expect(() => validateMdxTree(root(tabla('Plan|Tipo')), slide)).toThrow(
    'tres encabezados',
  );
  expect(() => validateMdxTree(root(fila), slide)).toThrow(
    'dentro de TablaLectura',
  );
  expect(() =>
    validateMdxTree(
      root(
        tabla('Plan|Expresión|Tipo', [
          el('FilaLectura', { nombre: 'Base', paso: { value: '1' } }),
        ]),
      ),
      slide,
    ),
  ).toThrow('nombre y rasgo');
  const item = (attrs: Record<string, string | { value: string }>) =>
    root(
      tabla('Plan|Expresión|Tipo'),
      el('Leyenda', {}, [el('ItemLeyenda', attrs)]),
    );
  expect(() =>
    validateMdxTree(
      root(
        tabla('Plan|Expresión|Tipo'),
        el('Leyenda', {}, [el('ItemLeyenda', { numero: { value: '1' } })]),
      ),
      slide,
    ),
  ).not.toThrow();
  expect(() =>
    validateMdxTree(item({ numero: { value: '0' } }), slide),
  ).toThrow('numero');
  expect(() =>
    validateMdxTree(
      root(
        tabla('Plan|Expresión|Tipo'),
        el('ItemLeyenda', { numero: { value: '1' } }),
      ),
      slide,
    ),
  ).toThrow('dentro de Leyenda');
  expect(() =>
    validateMdxTree(
      root(
        tabla('Plan|Expresión|Tipo'),
        el('Leyenda', {}, [
          el('ItemLeyenda', { numero: { value: '1' }, paso: { value: '2' } }),
        ]),
      ),
      slide,
    ),
  ).toThrow('fuera de 1..1');
});
