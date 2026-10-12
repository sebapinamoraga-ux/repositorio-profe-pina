import { z } from 'zod';
import { mascotPropsSchema, type Slide } from './index';
import {
  missingParams,
  parseLiteral,
  type ParamValue,
} from './interactive-params';

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
  'Senal',
  'TablaLectura',
  'FilaLectura',
  'Leyenda',
  'ItemLeyenda',
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
  'ExploradorCuadratica',
  'MascotaProfePina',
  'div',
  'span',
]);
/** Atributo con el paso en que aparece cada componente que se revela. */
const STEP_ATTRIBUTES: Partial<
  Record<string, readonly { name: string; required: boolean }[]>
> = {
  Paso: [{ name: 'n', required: true }],
  PreguntaPAES: [{ name: 'paso', required: true }],
  Senal: [{ name: 'paso', required: true }],
  FilaLectura: [{ name: 'paso', required: true }],
  ItemLeyenda: [{ name: 'paso', required: false }],
  GraficoFuncion: [
    { name: 'pasoPendiente', required: false },
    { name: 'pasoCorteY', required: false },
    { name: 'pasoCurva', required: false },
    { name: 'pasoReferencia', required: false },
  ],
};
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
  function visit(
    value: unknown,
    inStep = false,
    inReadingTable = false,
    inLegend = false,
  ) {
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
      for (const stepAttribute of STEP_ATTRIBUTES[node.name] ?? []) {
        const raw = literalAttribute(attributes, stepAttribute.name);
        if (raw === undefined && !stepAttribute.required) continue;
        // Una pregunta sin respuesta en la lámina no ocupa pasos.
        if (
          node.name === 'PreguntaPAES' &&
          literalAttribute(attributes, 'mostrarRespuesta') === 'false'
        )
          continue;
        const n =
          raw === undefined && node.name === 'PreguntaPAES' ? 1 : Number(raw);
        if (!Number.isInteger(n) || n < 1 || n > slide.steps)
          throw new Error(`Paso ${String(raw)} fuera de 1..${slide.steps}`);
        steps.add(n);
      }
      if (node.name === 'Paso' && inStep)
        throw new Error('No anidar bloques Paso');
      if (node.name === 'Senal') {
        const posicion = literalAttribute(attributes, 'posicion');
        if (
          posicion !== undefined &&
          posicion !== 'derecha' &&
          posicion !== 'abajo' &&
          posicion !== 'arriba'
        )
          throw new Error(
            `Senal requiere posicion derecha, abajo o arriba: ${posicion}`,
          );
        if (!literalAttribute(attributes, 'texto'))
          throw new Error('Senal requiere un texto literal');
      }
      if (node.name === 'Senal' || node.name === 'ItemLeyenda') {
        const raw = literalAttribute(attributes, 'numero');
        const required = node.name === 'ItemLeyenda';
        if (
          (raw !== undefined || required) &&
          !(Number.isInteger(Number(raw)) && Number(raw) >= 1)
        )
          throw new Error(`${node.name} requiere un numero entero positivo`);
      }
      if (node.name === 'Columnas') {
        const amplia = literalAttribute(attributes, 'amplia');
        if (
          amplia !== undefined &&
          amplia !== 'izquierda' &&
          amplia !== 'derecha'
        )
          throw new Error(
            `Columnas acepta amplia="izquierda" o "derecha": ${amplia}`,
          );
      }
      if (node.name === 'TablaLectura') {
        const headers = literalAttribute(attributes, 'encabezados') ?? '';
        if (headers.split('|').filter((h) => h.trim()).length !== 3)
          throw new Error(
            'TablaLectura requiere tres encabezados separados por |',
          );
      }
      if (node.name === 'FilaLectura') {
        if (!inReadingTable)
          throw new Error('FilaLectura va dentro de TablaLectura');
        if (
          !literalAttribute(attributes, 'nombre') ||
          !literalAttribute(attributes, 'rasgo')
        )
          throw new Error('FilaLectura requiere nombre y rasgo literales');
      }
      if (node.name === 'ItemLeyenda' && !inLegend)
        throw new Error('ItemLeyenda va dentro de Leyenda');
      if (node.name === 'GraficoFuncion') {
        const tipo = literalAttribute(attributes, 'tipo');
        if (
          tipo !== 'afin' &&
          tipo !== 'cuadratica' &&
          tipo !== 'circunferencia'
        )
          throw new Error(
            `GraficoFuncion requiere tipo afin, cuadratica o circunferencia: ${tipo ?? ''}`,
          );
      }
      // Los obligatorios de cada interactivo salen del mismo registro que usa el editor.
      if (node.name !== 'PreguntaPAES' && node.name !== 'MascotaProfePina') {
        const values: Record<string, ParamValue> = {};
        for (const attr of attributes) {
          const raw =
            typeof attr.value === 'string' ? attr.value : attr.value?.value;
          const value = parseLiteral(attr.value) ?? raw;
          if (attr.name && value !== undefined) values[attr.name] = value;
        }
        const present = new Set(
          attributes.flatMap((attr) => (attr.name ? [attr.name] : [])),
        );
        const missing = missingParams(node.name, present, values);
        if (missing[0])
          throw new Error(`${node.name} requiere el atributo ${missing[0]}`);
      }
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
      visit(
        child,
        inStep || node.name === 'Paso',
        inReadingTable || node.name === 'TablaLectura',
        inLegend || node.name === 'Leyenda',
      );
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
