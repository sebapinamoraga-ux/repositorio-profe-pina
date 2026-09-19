import { z } from 'zod';
import type { Slide } from './index';

// Recorrer el AST de MDX: nunca interpretar etiquetas con reemplazos de texto.
const attributeSchema = z.object({
  type: z.string(),
  name: z.string().optional(),
  value: z
    .union([
      z.string(),
      z.object({ value: z.string() }).passthrough(),
      z.null(),
    ])
    .optional(),
});
const nodeSchema = z
  .object({
    type: z.string(),
    name: z.string().nullable().optional(),
    attributes: z.array(attributeSchema).optional(),
    children: z.array(z.unknown()).optional(),
  })
  .passthrough();
const components = new Set([
  'Definicion',
  'Propiedad',
  'Teorema',
  'EjemploResuelto',
  'PracticaGuiada',
  'ErrorTipico',
  'PracticaIndividual',
  'Cierre',
  'Columnas',
  'Paso',
  'Formula',
  'PreguntaPAES',
  'GraficoSistema',
  'div',
  'span',
]);
export function validateMdxTree(tree: unknown, slide: Slide) {
  const steps = new Set<number>();
  const activities = new Set<string>();
  function visit(value: unknown, inStep = false) {
    const node = nodeSchema.parse(value);
    if (node.type === 'mdxjsEsm')
      throw new Error(
        'No se permiten imports ni JavaScript en las diapositivas; usa componentes registrados.',
      );
    if (
      node.type === 'mdxJsxFlowElement' ||
      node.type === 'mdxJsxTextElement'
    ) {
      if (!node.name || !components.has(node.name))
        throw new Error(`Componente no registrado: ${node.name}`);
      for (const attr of node.attributes ?? []) {
        if (attr.type !== 'mdxJsxAttribute')
          throw new Error('No se permiten atributos extendidos');
        if (
          attr.name === 'style' ||
          attr.name === 'className' ||
          attr.name?.startsWith('on')
        )
          throw new Error(`Atributo no permitido: ${attr.name}`);
      }
      const attributes = node.attributes ?? [];
      if (node.name === 'Paso' || node.name === 'PreguntaPAES') {
        const name = node.name === 'Paso' ? 'n' : 'paso';
        const attr = attributes.find((a) => a.name === name)?.value;
        const raw = typeof attr === 'string' ? attr : attr?.value;
        const n = raw === undefined && name === 'paso' ? 1 : Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > slide.steps)
          throw new Error(`Paso ${String(raw)} fuera de 1..${slide.steps}`);
        steps.add(n);
        if (node.name === 'Paso' && inStep)
          throw new Error('No anidar bloques Paso');
      }
      if (node.name === 'PreguntaPAES') {
        const id = attributes.find((a) => a.name === 'id')?.value;
        if (typeof id !== 'string')
          throw new Error('PreguntaPAES requiere un id literal');
        activities.add(id);
      }
    }
    for (const child of node.children ?? [])
      visit(child, inStep || node.name === 'Paso');
  }
  visit(tree);
  for (let n = 1; n <= slide.steps; n++)
    if (!steps.has(n)) throw new Error(`El paso ${n} no está definido`);
  for (const id of activities)
    if (!slide.activities.includes(id))
      throw new Error(`Falta declarar la actividad ${id} en frontmatter`);
  for (const id of slide.activities)
    if (!activities.has(id))
      throw new Error(`La actividad ${id} está declarada pero no se utiliza`);
}
