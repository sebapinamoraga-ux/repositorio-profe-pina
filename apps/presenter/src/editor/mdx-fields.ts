import { createProcessor } from '@mdx-js/mdx';
import remarkMath from 'remark-math';
import { z } from 'zod';
import {
  INTERACTIVE_SPECS,
  parseLiteral,
  printAttribute,
  type ParamValue,
} from '@aula/content-model/interactive-params';

/** Atributo literal de un interactivo, con el rango de `nombre=valor` en el MDX. */
export interface ParamAttr {
  value: ParamValue;
  start: number;
  end: number;
}

/**
 * Campos editables de una lámina, con su rango exacto en el MDX. Editar un campo reemplaza
 * solo ese tramo del texto: el resto del archivo queda igual.
 */
export type Field =
  | { kind: 'text'; group: string; label: string; start: number; end: number; value: string }
  | { kind: 'attr'; group: string; label: string; start: number; end: number; value: string }
  | { kind: 'template'; group: string; label: string; start: number; end: number; value: string }
  | { kind: 'fixed'; group: string; label: string; value: string }
  | {
      kind: 'params';
      group: string;
      label: string;
      component: string;
      /** Dónde insertar un atributo nuevo (tras el último, o tras el nombre). */
      insertAt: number;
      attrs: Record<string, ParamAttr>;
    };

const pointSchema = z.object({ offset: z.number().optional() }).passthrough();
const positionSchema = z.object({ start: pointSchema, end: pointSchema }).optional();
type MdxNode = {
  type: string;
  name?: string | null;
  attributes?: { type: string; name?: string; value?: unknown; position?: z.infer<typeof positionSchema> }[];
  children?: MdxNode[];
  position?: z.infer<typeof positionSchema>;
};
const nodeSchema: z.ZodType<MdxNode> = z.lazy(() =>
  z
    .object({
      type: z.string(),
      name: z.string().nullable().optional(),
      attributes: z
        .array(
          z
            .object({
              type: z.string(),
              name: z.string().optional(),
              value: z.unknown().optional(),
              position: positionSchema,
            })
            .passthrough(),
        )
        .optional(),
      children: z.array(nodeSchema).optional(),
      position: positionSchema,
    })
    .passthrough(),
);

const BLOCK_NAMES: Record<string, string> = {
  Definicion: 'Definición',
  Objetivo: 'Objetivo',
  Comprobacion: 'Comprobación',
  Tarjeta: 'Tarjeta',
  Propiedad: 'Propiedad',
  Teorema: 'Teorema',
  EjemploResuelto: 'Ejemplo resuelto',
  PracticaGuiada: 'Práctica guiada',
  ErrorTipico: 'Error típico',
  PracticaIndividual: 'Práctica individual',
  Cierre: 'Cierre',
  Composicion: 'Composición',
  Etiqueta: 'Etiqueta',
};
const ATTR_LABELS: Record<string, string> = {
  titulo: 'Título',
  etiqueta: 'Etiqueta',
  nota: 'Nota de la mascota',
  tex: 'Fórmula (TeX)',
};
const FIXED: Record<string, string> = {
  PreguntaPAES: 'Pregunta PAES',
  GraficoSistema: 'Gráfico',
  GraficoDosCondiciones: 'Gráfico',
  GraficoRectas: 'Gráfico',
  GraficoFuncion: 'Gráfico',
  GraficoComparacion: 'Gráfico',
  RectaIntervalos: 'Recta numérica',
  DiagramaSagital: 'Diagrama sagital',
  MaquinaFuncion: 'Máquina de función',
  ExploradorCuadratica: 'Gráfico interactivo',
  MascotaProfePina: 'Mascota',
};
const PRESENCE: Record<string, string> = {
  sutil: 'Sutil',
  pedagogica: 'Pedagógica',
  marca: 'Marca',
};

function fixedValue(name: string, attrs: MdxNode['attributes'] = []) {
  const read = (key: string) => {
    const attr = attrs.find((a) => a.name === key);
    if (!attr) return undefined;
    if (typeof attr.value === 'string') return attr.value;
    const expression = z.object({ value: z.string() }).safeParse(attr.value);
    return expression.success ? expression.data.value : undefined;
  };
  if (name === 'MascotaProfePina')
    return `Pose ${read('pose') ?? '?'} · ${PRESENCE[read('nivel') ?? ''] ?? read('nivel') ?? ''}`;
  if (name === 'PreguntaPAES') return `Actividad «${read('id') ?? ''}» del banco`;
  return 'Parámetros fijos; se editan en «MDX de la lámina».';
}

const processor = createProcessor({ remarkPlugins: [remarkMath] });

function literal(attr: { value?: unknown }) {
  return typeof attr.value === 'string' ? attr.value : undefined;
}

/** Rango del valor entre comillas dentro de `nombre="valor"`. */
function valueRange(source: string, start: number, end: number) {
  const slice = source.slice(start, end);
  const eq = slice.indexOf('=');
  const quote = slice.slice(eq + 1).search(/["']/);
  if (eq < 0 || quote < 0) return null;
  const open = start + eq + 1 + quote;
  const close = source.lastIndexOf(source[open] ?? '"', end - 1);
  return close > open ? { start: open + 1, end: close } : null;
}

const isJsx = (node: MdxNode) =>
  node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement';

export function extractFields(body: string): Field[] {
  const root = nodeSchema.parse(processor.parse(body));
  const out: Field[] = [];

  const pushText = (group: string, nodes: MdxNode[]) => {
    const start = nodes[0]?.position?.start.offset;
    const end = nodes[nodes.length - 1]?.position?.end.offset;
    if (start === undefined || end === undefined) return;
    const value = body.slice(start, end);
    if (!value.trim()) return;
    out.push({ kind: 'text', group, label: 'Contenido', start, end, value });
  };

  const walk = (node: MdxNode, group: string) => {
    let run: MdxNode[] = [];
    for (const child of node.children ?? []) {
      if (child.type !== 'mdxJsxFlowElement') {
        run.push(child);
        continue;
      }
      pushText(group, run);
      run = [];
      const name = child.name ?? '';
      const label = BLOCK_NAMES[name];
      const inner =
        name === 'Paso'
          ? `${group ? `${group} › ` : ''}Paso ${literal(child.attributes?.find((a) => a.name === 'n') ?? {}) ?? ''}`.trim()
          : label
            ? `${group ? `${group} › ` : ''}${label}`
            : group;
      const params = INTERACTIVE_SPECS[name] ? paramsOf(child) : null;
      if (params) {
        out.push({
          kind: 'params',
          group: inner || (FIXED[name] ?? name),
          label: FIXED[name] ?? name,
          component: name,
          ...params,
        });
        continue;
      }
      if (FIXED[name]) {
        const label = FIXED[name] ?? name;
        out.push({
          kind: 'fixed',
          group: inner || label,
          label,
          value: fixedValue(name, child.attributes),
        });
        continue;
      }
      for (const attr of child.attributes ?? []) {
        const value = literal(attr);
        const start = attr.position?.start.offset;
        const end = attr.position?.end.offset;
        if (!attr.name || value === undefined || start === undefined || end === undefined)
          continue;
        const range = valueRange(body, start, end);
        if (!range) continue;
        if (attr.name === 'plantilla')
          out.push({ kind: 'template', group: inner, label: 'Plantilla de mascota', ...range, value });
        else if (ATTR_LABELS[attr.name])
          out.push({ kind: 'attr', group: inner, label: ATTR_LABELS[attr.name] ?? attr.name, ...range, value });
      }
      if (child.children?.some((c) => !isJsx(c)) || child.children?.some(isJsx))
        walk(child, inner);
    }
    pushText(group, run);
  };
  walk(root, '');
  return out;
}

export function spliceField(body: string, field: { start: number; end: number }, value: string) {
  return body.slice(0, field.start) + value + body.slice(field.end);
}

/** Atributos de un interactivo si todos son literales; si alguno es una expresión, null. */
function paramsOf(node: MdxNode): { insertAt: number; attrs: Record<string, ParamAttr> } | null {
  const begin = node.position?.start.offset;
  if (begin === undefined) return null;
  const attrs: Record<string, ParamAttr> = {};
  let insertAt = begin + 1 + (node.name ?? '').length;
  for (const attr of node.attributes ?? []) {
    const start = attr.position?.start.offset;
    const end = attr.position?.end.offset;
    if (attr.type !== 'mdxJsxAttribute' || !attr.name || start === undefined || end === undefined)
      return null;
    const value = parseLiteral(attr.value);
    if (value === null) return null;
    attrs[attr.name] = { value, start, end };
    insertAt = Math.max(insertAt, end);
  }
  return { insertAt, attrs };
}

/**
 * Cambia, agrega o quita (`undefined`) un atributo de un interactivo sin tocar el resto.
 * Después de cada cambio hay que volver a leer los campos: los rangos se desplazan.
 */
export function setParam(
  body: string,
  field: { insertAt: number; attrs: Record<string, ParamAttr> },
  name: string,
  value: ParamValue | undefined,
): string {
  const current = field.attrs[name];
  if (current) {
    if (value !== undefined)
      return body.slice(0, current.start) + printAttribute(name, value) + body.slice(current.end);
    let from = current.start;
    while (from > 0 && /\s/.test(body[from - 1] ?? '')) from--;
    return body.slice(0, from) + body.slice(current.end);
  }
  if (value === undefined) return body;
  return `${body.slice(0, field.insertAt)} ${printAttribute(name, value)}${body.slice(field.insertAt)}`;
}
