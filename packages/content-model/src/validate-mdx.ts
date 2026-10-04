import { z } from 'zod';
import { mascotPropsSchema, type Slide } from './index';

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
  'Objetivo',
  'Comprobacion',
  'Tarjeta',
  'Paneles',
  'Etiquetas',
  'Etiqueta',
  'Asociacion',
  'Composicion',
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
  'GraficoDosCondiciones',
  'GraficoRectas',
  'GraficoFuncion',
  'GraficoComparacion',
  'RectaIntervalos',
  'DiagramaSagital',
  'MaquinaFuncion',
  'MascotaProfePina',
  'div',
  'span',
]);
export function validateMdxTree(
  tree: unknown,
  slide: Slide,
  templateIds?: ReadonlySet<string>,
) {
  const steps = new Set<number>();
  const activities = new Set<string>();
  let mascotCount = 0;
  const literalAttribute = (
    attributes: z.infer<typeof attributeSchema>[],
    name: string,
  ) => {
    const value = attributes.find(
      (attribute) => attribute.name === name,
    )?.value;
    return typeof value === 'string' ? value : value?.value;
  };
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
      if (
        node.name === 'Tarjeta' ||
        node.name === 'Etiqueta' ||
        node.name === 'Asociacion'
      ) {
        const tone = literalAttribute(attributes, 'tono');
        if (
          tone !== undefined &&
          (!/^[1-4]$/.test(tone) || !Number.isInteger(Number(tone)))
        )
          throw new Error(`Tono de asociación fuera de 1..4: ${tone}`);
        if (node.name === 'Asociacion' && tone === undefined)
          throw new Error('Asociacion requiere un tono literal de 1..4');
      }
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
      if (node.name === 'GraficoFuncion') {
        const names = new Set(attributes.map((attr) => attr.name));
        const tipo = literalAttribute(attributes, 'tipo');
        const required: Record<string, string[]> = {
          afin: ['m', 'n'],
          cuadratica: ['a', 'b', 'c'],
          circunferencia: ['h', 'k', 'r'],
        };
        const coefficients = tipo === undefined ? undefined : required[tipo];
        if (!coefficients)
          throw new Error(
            `GraficoFuncion requiere tipo afin, cuadratica o circunferencia: ${tipo ?? ''}`,
          );
        for (const name of [
          ...coefficients,
          'xMin',
          'xMax',
          'yMin',
          'yMax',
          'etiqueta',
          'descripcion',
        ])
          if (!names.has(name))
            throw new Error(`GraficoFuncion requiere el atributo ${name}`);
      }
      const requiredByComponent: Record<string, string[]> = {
        GraficoComparacion: [
          'm1',
          'n1',
          'm2',
          'n2',
          'xMin',
          'xMax',
          'yMin',
          'yMax',
          'etiqueta1',
          'etiqueta2',
          'descripcion',
        ],
        RectaIntervalos: ['min', 'max', 'intervalos', 'descripcion'],
        DiagramaSagital: [
          'entradas',
          'salidas',
          'flechas',
          'tituloEntradas',
          'tituloSalidas',
          'descripcion',
        ],
        MaquinaFuncion: ['entrada', 'regla', 'salida', 'descripcion'],
      };
      for (const name of requiredByComponent[node.name] ?? [])
        if (!attributes.some((attr) => attr.name === name))
          throw new Error(`${node.name} requiere el atributo ${name}`);
      if (node.name === 'PreguntaPAES') {
        const id = attributes.find((a) => a.name === 'id')?.value;
        if (typeof id !== 'string')
          throw new Error('PreguntaPAES requiere un id literal');
        activities.add(id);
      }
      if (node.name === 'MascotaProfePina') {
        mascotCount++;
        mascotPropsSchema.parse({
          pose: Number(literalAttribute(attributes, 'pose')),
          nivel: literalAttribute(attributes, 'nivel'),
          ubicacion: literalAttribute(attributes, 'ubicacion'),
          alt: literalAttribute(attributes, 'alt'),
        });
      }
      if (node.name === 'Composicion') {
        mascotCount++;
        const template = literalAttribute(attributes, 'plantilla');
        if (!template || (templateIds && !templateIds.has(template)))
          throw new Error(
            `Plantilla de mascota desconocida: ${template ?? ''}`,
          );
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
  if (mascotCount > 1)
    throw new Error('Solo se permite una mascota por diapositiva');
}
