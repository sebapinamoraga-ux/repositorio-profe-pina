import {
  BLOCK_NAMES,
  FIXED,
  elementFields,
  isJsx,
  nodeSchema,
  processor,
  textField,
  type Field,
  type MdxNode,
} from './mdx-fields';

/**
 * Modelo de bloques de una lámina: lo que el docente ve como piezas sueltas (un párrafo, una
 * fórmula, una tarjeta, un gráfico). Cada bloque es un rango exacto del MDX y todas las
 * operaciones son reemplazos de rangos: el resto del archivo queda byte a byte igual.
 *
 * Los contenedores (`Columnas`, `Paneles`, sus `div` y `Composicion`) se recorren pero no son
 * bloques. `<Paso n={k}>` solo asigna paso. Lo que no se entiende (sintaxis inválida, Paso
 * anidados, expresiones `{…}`, import/export, `n` no literal) deja la lámina en solo lectura.
 */

/** Envoltorio `<Paso n={k}>` directo de un bloque. */
export interface PasoWrap {
  /** Rango de todo el envoltorio (en línea: el párrafo que solo contiene el Paso). */
  start: number;
  end: number;
  n: number;
  /** Envuelve más de un bloque (o un contenedor): no se puede reescribir sin partirlo. */
  shared: boolean;
  /** El Paso va dentro de un párrafo, en vez de envolver bloques en líneas propias. */
  inline: boolean;
  /** Rango del atributo `n={…}`. */
  nStart: number;
  nEnd: number;
}

export interface Block {
  /** Posición en el orden del documento. */
  index: number;
  kind: 'text' | 'formula' | 'component' | 'fixed';
  /** Nombre del componente MDX; null en texto y fórmulas. */
  component: string | null;
  /** Nombre para el docente: «Tarjeta», «Texto», «Fórmula»… */
  label: string;
  /** Resumen de hasta 40 caracteres. */
  summary: string;
  /** Paso en que aparece (0 = al abrir), incluido el que viene de un contenedor. */
  step: number;
  /** Rango del bloque sin su envoltorio `<Paso>`. */
  start: number;
  end: number;
  paso: PasoWrap | null;
  /** Su paso lo fija un `<Paso>` que envuelve a todo su contenedor: no se cambia por bloque. */
  inherited: boolean;
  container: string;
  fields: Field[];
  /** Pasos que revelan partes de su interior (`<Paso>` dentro del bloque, `paso={n}`…). */
  innerSteps: number[];
}

export interface Container {
  id: string;
  kind: 'root' | 'columna' | 'paneles' | 'composicion' | 'div';
  label: string;
  /** Dónde se agrega algo al final: el inicio de la etiqueta de cierre (o el fin del cuerpo). */
  end: number;
}

export type BlockModel =
  | { ok: true; blocks: Block[]; containers: Container[] }
  | { ok: false; reason: string };

export type BlockEdit =
  | { ok: true; body: string; steps?: number; select?: number }
  | { ok: false; reason: string };

class Unsupported extends Error {}

const EXTRA_NAMES: Record<string, string> = {
  Etiquetas: 'Etiquetas',
  Leyenda: 'Leyenda',
  ItemLeyenda: 'Elemento de leyenda',
  TablaLectura: 'Tabla de lectura',
  FilaLectura: 'Fila de lectura',
  Senal: 'Señal',
  Semaforo: 'Semáforo',
  Formula: 'Fórmula destacada',
  Asociacion: 'Asociación',
  span: 'Texto',
  div: 'Bloque',
};
const MAX_SUMMARY = 40;
const isWhitespace = (char: string | undefined) =>
  char !== undefined && /\s/.test(char);

const offsets = (node: MdxNode) => {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  if (start === undefined || end === undefined)
    throw new Unsupported('Falta la posición de un nodo.');
  return { start, end };
};

function excerpt(text: string) {
  const plain = text
    .replace(/[$*_`\\]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return plain.length > MAX_SUMMARY
    ? `${plain.slice(0, MAX_SUMMARY - 1).trimEnd()}…`
    : plain;
}

/** Valor entero de un atributo literal (`n="2"` o `n={2}`); null si no lo es. */
function intOf(attr: { value?: unknown } | undefined): number | null {
  if (!attr) return null;
  const raw =
    typeof attr.value === 'string'
      ? attr.value
      : typeof attr.value === 'object' &&
          attr.value !== null &&
          'value' in attr.value
        ? (attr.value as { value: unknown }).value
        : null;
  return typeof raw === 'string' && /^\d+$/.test(raw.trim())
    ? Number(raw.trim())
    : null;
}

/** Atributos que fijan un paso: `paso`, `pasoX` (entero) y `pasosX` (lista de enteros). */
function stepValues(
  attr: NonNullable<MdxNode['attributes']>[number],
): number[] {
  if (!attr.name || !attr.name.startsWith('paso')) return [];
  const single = intOf(attr);
  if (single !== null) return [single];
  const value = attr.value;
  if (typeof value === 'object' && value !== null && 'value' in value) {
    const raw = (value as { value: unknown }).value;
    if (typeof raw === 'string' && /^\[[\d\s,]*\]$/.test(raw.trim()))
      return (raw.match(/\d+/g) ?? []).map(Number);
  }
  return [];
}

function innerSteps(node: MdxNode): number[] {
  const found = new Set<number>();
  const visit = (current: MdxNode) => {
    if (isJsx(current)) {
      if (current.name === 'Paso') {
        const n = intOf(current.attributes?.find((a) => a.name === 'n'));
        if (n !== null) found.add(n);
      }
      for (const attr of current.attributes ?? [])
        for (const n of stepValues(attr)) found.add(n);
    }
    for (const child of current.children ?? []) visit(child);
  };
  visit(node);
  return [...found].sort((a, b) => a - b);
}

/** Rechaza lo que el modelo de bloques no sabe escribir de vuelta. */
function validateTree(node: MdxNode, insidePaso: boolean) {
  if (node.type === 'mdxjsEsm')
    throw new Unsupported('La lámina tiene import o export.');
  if (node.type === 'mdxFlowExpression' || node.type === 'mdxTextExpression')
    throw new Unsupported(
      'La lámina tiene una expresión {…} dentro del texto.',
    );
  let inside = insidePaso;
  if (isJsx(node)) {
    for (const attr of node.attributes ?? [])
      if (attr.type !== 'mdxJsxAttribute')
        throw new Unsupported('Hay atributos extendidos.');
    if (node.name === 'Paso') {
      if (insidePaso) throw new Unsupported('Hay un Paso dentro de otro Paso.');
      if (intOf(node.attributes?.find((a) => a.name === 'n')) === null)
        throw new Unsupported('Un Paso no tiene un «n» numérico literal.');
      inside = true;
    }
  }
  for (const child of node.children ?? []) validateTree(child, inside);
}

interface Walk {
  body: string;
  blocks: Block[];
  containers: Container[];
  occurrences: Map<string, number>;
}

/** Cierre de la etiqueta de apertura: el primer `>` después de los atributos. */
function openTagEnd(body: string, node: MdxNode) {
  const { start } = offsets(node);
  let from = start + 1 + (node.name ?? '').length;
  for (const attr of node.attributes ?? [])
    from = Math.max(from, attr.position?.end.offset ?? from);
  return body.indexOf('>', from) + 1;
}

const closeTagStart = (body: string, node: MdxNode) =>
  body.lastIndexOf('</', offsets(node).end);

function describe(name: string | null, fields: Field[]) {
  const nameOf = name ?? '';
  return (
    BLOCK_NAMES[nameOf] ??
    FIXED[nameOf] ??
    EXTRA_NAMES[nameOf] ??
    (nameOf || fields[0]?.label || 'Bloque')
  );
}

function summarize(label: string, fields: Field[]) {
  const title = fields.find(
    (f) => f.kind === 'attr' && f.attr === 'titulo' && f.value.trim(),
  );
  if (title?.kind === 'attr') return excerpt(title.value);
  const text = fields.find((f) => f.kind === 'text');
  if (text?.kind === 'text') return excerpt(text.value);
  const fixed = fields.find((f) => f.kind === 'fixed');
  if (fixed?.kind === 'fixed') return excerpt(fixed.value);
  return label;
}

/** Rango del TeX dentro de un `$$ … $$`, sin los delimitadores ni sus saltos de línea. */
function mathRange(body: string, node: MdxNode) {
  const { start, end } = offsets(node);
  let from = start + 2;
  let to = end - 2;
  if (body[from] === '\n') from++;
  if (body[to - 1] === '\n') to--;
  return to >= from
    ? { start: from, end: to }
    : { start: start + 2, end: start + 2 };
}

function walk(
  ctx: Walk,
  nodes: MdxNode[],
  container: string,
  wrap: PasoBuild | null,
  step: number,
) {
  const inherited = step > 0 && wrap === null;
  const push = (
    block: Omit<Block, 'index' | 'paso' | 'inherited' | 'container' | 'step'>,
  ) => {
    const index = ctx.blocks.length;
    const paso = wrap ? wrap.paso : null;
    ctx.blocks.push({
      ...block,
      index,
      paso,
      inherited,
      container,
      step: wrap ? wrap.paso.n : step,
    });
    if (wrap) wrap.members.push(index);
  };
  const enter = (
    node: MdxNode,
    id: string,
    kind: Container['kind'],
    label: string,
  ) => {
    ctx.containers.push({
      id,
      kind,
      label,
      end: closeTagStart(ctx.body, node),
    });
    if (wrap) wrap.complex = true;
    walk(ctx, node.children ?? [], id, null, step);
  };
  const occurrence = (key: string) => {
    const k = ctx.occurrences.get(key) ?? 0;
    ctx.occurrences.set(key, k + 1);
    return k;
  };

  for (const node of nodes) {
    const { start, end } = offsets(node);
    if (node.type === 'mdxJsxFlowElement') {
      const name = node.name ?? '';
      if (name === 'Paso') {
        const n = intOf(node.attributes?.find((a) => a.name === 'n')) ?? 0;
        const attr = node.attributes?.find((a) => a.name === 'n');
        const built: PasoBuild = {
          paso: {
            start,
            end,
            n,
            shared: false,
            inline: false,
            nStart: attr?.position?.start.offset ?? start,
            nEnd: attr?.position?.end.offset ?? start,
          },
          members: [],
          complex: false,
        };
        walk(ctx, node.children ?? [], container, built, n);
        built.paso.shared = built.members.length > 1 || built.complex;
        continue;
      }
      if (name === 'Columnas') {
        const occ = occurrence('columnas');
        const prefix = occ === 0 ? 'columnas' : `columnas${occ + 1}`;
        if (wrap) wrap.complex = true;
        let k = 0;
        for (const child of node.children ?? []) {
          // Cada hijo de Columnas es una columna: un `div` con su contenido, o un bloque suelto
          // (un gráfico, un `Paso` que lo envuelve…).
          const id = `${prefix}/${k}`;
          const isDiv =
            child.type === 'mdxJsxFlowElement' && child.name === 'div';
          ctx.containers.push({
            id,
            kind: 'columna',
            label: `Columna ${k + 1}`,
            end: isDiv ? closeTagStart(ctx.body, child) : offsets(child).end,
          });
          walk(ctx, isDiv ? (child.children ?? []) : [child], id, null, step);
          k++;
        }
        continue;
      }
      if (name === 'Paneles') {
        enter(node, `paneles/${occurrence('paneles')}`, 'paneles', 'Paneles');
        continue;
      }
      if (name === 'div') {
        enter(node, `div/${occurrence('div')}`, 'div', 'Contenedor');
        continue;
      }
      if (name === 'Composicion') {
        const fields = elementFields(ctx.body, { ...node, children: [] }, '');
        push({
          kind: 'fixed',
          component: 'Composicion',
          label: 'Mascota',
          summary: 'Mascota',
          start,
          end: openTagEnd(ctx.body, node),
          fields,
          innerSteps: [],
        });
        enter(node, 'composicion', 'composicion', 'Composición');
        continue;
      }
      const fields = elementFields(ctx.body, node, '');
      const label = describe(name, fields);
      push({
        kind: FIXED[name] ? 'fixed' : 'component',
        component: name,
        label,
        summary: summarize(label, fields),
        start,
        end,
        fields,
        innerSteps: innerSteps(node),
      });
      continue;
    }
    if (node.type === 'math') {
      const range = mathRange(ctx.body, node);
      const field: Field = {
        kind: 'text',
        group: '',
        label: 'Fórmula (TeX)',
        ...range,
        value: ctx.body.slice(range.start, range.end),
      };
      push({
        kind: 'formula',
        component: null,
        label: 'Fórmula',
        summary: excerpt(field.value) || 'Fórmula',
        start,
        end,
        fields: [field],
        innerSteps: [],
      });
      continue;
    }
    // Párrafo que solo contiene un `<Paso>` en línea: texto con ese paso.
    if (node.type === 'paragraph' && !wrap) {
      const meaningful = (node.children ?? []).filter(
        (c) => !(c.type === 'text' && !(literalText(ctx.body, c) ?? '').trim()),
      );
      const only = meaningful[0];
      if (
        meaningful.length === 1 &&
        only &&
        only.type === 'mdxJsxTextElement' &&
        only.name === 'Paso'
      ) {
        const attr = only.attributes?.find((a) => a.name === 'n');
        const n = intOf(attr) ?? 0;
        const inner = only.children ?? [];
        const first = inner[0] ? offsets(inner[0]).start : null;
        const last = inner.length
          ? offsets(inner[inner.length - 1] ?? only).end
          : null;
        const built: PasoBuild = {
          paso: {
            start,
            end,
            n,
            shared: false,
            inline: true,
            nStart: attr?.position?.start.offset ?? start,
            nEnd: attr?.position?.end.offset ?? start,
          },
          members: [],
          complex: false,
        };
        const bodyStart = first ?? openTagEnd(ctx.body, only);
        const bodyEnd = last ?? bodyStart;
        const text = ctx.body.slice(bodyStart, bodyEnd);
        const index = ctx.blocks.length;
        ctx.blocks.push({
          index,
          kind: 'text',
          component: null,
          label: 'Texto',
          summary: excerpt(text) || 'Texto',
          step: n,
          start: bodyStart,
          end: bodyEnd,
          paso: built.paso,
          inherited: false,
          container,
          fields: [
            {
              kind: 'text',
              group: '',
              label: 'Contenido',
              start: bodyStart,
              end: bodyEnd,
              value: text,
            },
          ],
          innerSteps: innerSteps(only).filter((s) => s !== n),
        });
        continue;
      }
    }
    const field = textField(ctx.body, '', [node]);
    push({
      kind: 'text',
      component: null,
      label: 'Texto',
      summary: excerpt(ctx.body.slice(start, end)) || 'Texto',
      start,
      end,
      fields: field ? [field] : [],
      innerSteps: innerSteps(node),
    });
  }
}

interface PasoBuild {
  paso: PasoWrap;
  members: number[];
  complex: boolean;
}

function literalText(body: string, node: MdxNode) {
  const range = node.position;
  const start = range?.start.offset;
  const end = range?.end.offset;
  return start === undefined || end === undefined
    ? undefined
    : body.slice(start, end);
}

const MODEL_CACHE_SIZE = 64;
const modelCache = new Map<string, BlockModel>();

/**
 * Lee los bloques de una lámina; si no puede interpretarla, dice por qué (solo lectura). El
 * resultado se recuerda por texto (la interfaz lo pide en cada cambio): no se debe modificar.
 */
export function extractBlocks(body: string): BlockModel {
  const known = modelCache.get(body);
  if (known) return known;
  const model = readBlocks(body);
  modelCache.set(body, model);
  if (modelCache.size > MODEL_CACHE_SIZE) {
    const oldest = modelCache.keys().next().value;
    if (oldest !== undefined) modelCache.delete(oldest);
  }
  return model;
}

function readBlocks(body: string): BlockModel {
  try {
    const root = nodeSchema.parse(processor.parse(body));
    validateTree(root, false);
    const ctx: Walk = {
      body,
      blocks: [],
      containers: [
        { id: 'root', kind: 'root', label: 'Lámina', end: body.length },
      ],
      occurrences: new Map(),
    };
    walk(ctx, root.children ?? [], 'root', null, 0);
    return { ok: true, blocks: ctx.blocks, containers: ctx.containers };
  } catch (error) {
    return {
      ok: false,
      reason:
        error instanceof Unsupported
          ? error.message
          : `No se pudo leer el MDX: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

// ---------------------------------------------------------------------------------------------
// Operaciones. Cada una devuelve el cuerpo nuevo (releído para comprobar que sigue siendo un
// modelo válido) y, cuando corresponde, el índice del bloque resultante.
// ---------------------------------------------------------------------------------------------

const fail = (reason: string): BlockEdit => ({ ok: false, reason });
const MAX_STEPS = 12;

/** Bloque que representa la mascota de un `Composicion` (solo sus atributos). */
export const isMascotBlock = (block: Block) =>
  block.component === 'Composicion';

const wrapPaso = (n: number, text: string) =>
  `<Paso n={${n}}>\n${text}\n</Paso>`;

function indentOf(body: string, position: number) {
  const lineStart = body.lastIndexOf('\n', position - 1) + 1;
  const lead = body.slice(lineStart, position);
  return /^[ \t]*$/.test(lead) ? lead : '';
}

const indentLines = (text: string, indent: string) =>
  indent
    ? text
        .split('\n')
        .map((line, k) => (k && line ? indent + line : line))
        .join('\n')
    : text;

/** Lo que se mueve, duplica o borra junto con el bloque: su Paso propio, o solo el bloque. */
const unitOf = (block: Block) =>
  block.paso && !block.paso.shared
    ? { start: block.paso.start, end: block.paso.end }
    : { start: block.start, end: block.end };

function finish(
  body: string,
  extra: {
    steps?: number;
    select?: (blocks: Block[]) => number | undefined;
    /** Cuántos bloques debe tener al menos el resultado (agregar uno que se funde con otro no vale). */
    count?: number;
  } = {},
): BlockEdit {
  const model = extractBlocks(body);
  if (!model.ok)
    return fail(`La edición dejó el MDX ilegible: ${model.reason}`);
  if (extra.count !== undefined && model.blocks.length < extra.count)
    return fail(
      'Quedaría pegado al bloque vecino y se fundiría con él (por ejemplo, dos listas seguidas).',
    );
  const select = extra.select?.(model.blocks);
  return {
    ok: true,
    body,
    ...(extra.steps !== undefined ? { steps: extra.steps } : {}),
    ...(select !== undefined ? { select } : {}),
  };
}

function modelOf(
  body: string,
): { blocks: Block[]; containers: Container[] } | string {
  const model = extractBlocks(body);
  return model.ok ? model : model.reason;
}

/**
 * Texto que se agrega tras `at`: una línea en blanco, el bloque y, si lo que sigue está pegado
 * en la línea siguiente y el bloque termina en markdown, otra línea en blanco para que no se
 * funda con ello en un solo párrafo.
 */
/** `source` ya lleva la sangría de sus líneas siguientes; `indent` es la de la primera. */
function after(body: string, at: number, indent: string, source: string) {
  const tight =
    /^[ \t]*\n[ \t]*(?!<\/)\S/.test(body.slice(at)) && !/>\s*$/.test(source);
  return `\n\n${indent}${source}${tight ? '\n' : ''}`;
}

const splice = (body: string, start: number, end: number, text: string) =>
  body.slice(0, start) + text + body.slice(end);

/**
 * Reemplaza el rango de un campo de texto/atributo/plantilla de un bloque. Escribir nunca se
 * rechaza: mientras se teclea el MDX puede quedar a medias (una `{` o un `$$` sin cerrar); la
 * revisión de la lámina avisa y el modelo vuelve a leerse cuando el texto está completo.
 */
export function writeField(
  body: string,
  field: { start: number; end: number },
  value: string,
): BlockEdit {
  return { ok: true, body: splice(body, field.start, field.end, value) };
}

/**
 * Inserta `source` como bloque nuevo: después del bloque `after` y en su paso, o (sin `after`)
 * al final del contenedor. `step` es el paso en que debe aparecer.
 */
export function insertBlock(
  body: string,
  target: { after: number | null; container?: string },
  step: number,
  source: string,
): BlockEdit {
  const model = modelOf(body);
  if (typeof model === 'string') return fail(model);
  const { blocks, containers } = model;
  let ref: Block | undefined;
  let containerId = target.container ?? 'root';
  if (target.after !== null) {
    ref = blocks[target.after];
    if (!ref) return fail('El bloque de referencia no existe.');
    if (isMascotBlock(ref)) containerId = 'composicion';
    else containerId = ref.container;
  }
  if (target.after === null || (ref && isMascotBlock(ref))) {
    const members = blocks.filter(
      (b) => b.container === containerId && !isMascotBlock(b),
    );
    ref = members[members.length - 1];
  }
  const container = containers.find((c) => c.id === containerId);
  if (!container) return fail('El contenedor no existe.');

  let at: number;
  let text: string;
  if (!ref) {
    // Contenedor vacío: va justo antes de su cierre (o al final del cuerpo).
    const content = body.slice(0, container.end).replace(/\s+$/, '');
    at = container.id === 'root' ? content.length : container.end;
    const lead =
      container.id === 'root'
        ? content
          ? '\n\n'
          : '\n'
        : body[at - 1] === '\n'
          ? ''
          : '\n';
    text = `${lead}${step > 0 ? wrapPaso(step, source) : source}\n`;
    if (container.id === 'root')
      return finish(
        splice(body, at, body.length, text),
        selectAfter(at, blocks.length + 1),
      );
    return finish(
      splice(body, at, at, text),
      selectAfter(at, blocks.length + 1),
    );
  }
  const indent = indentOf(
    body,
    ref.paso?.inline
      ? ref.paso.start
      : ref.paso && !ref.paso.shared
        ? ref.paso.start
        : ref.start,
  );
  if (ref.inherited && step !== ref.step)
    return fail(
      `Ese contenedor ya aparece en el paso ${ref.step}: no se puede cambiar el paso por bloque.`,
    );
  const inside =
    step === ref.step &&
    ((ref.paso && !ref.paso.inline) ||
      ref.inherited ||
      (!ref.paso && step === 0));
  if (inside) {
    at = ref.end;
    text = after(body, at, indent, indentLines(source, indent));
  } else {
    at = ref.paso ? ref.paso.end : ref.end;
    text = after(
      body,
      at,
      indent,
      indentLines(step > 0 ? wrapPaso(step, source) : source, indent),
    );
  }
  return finish(splice(body, at, at, text), selectAfter(at, blocks.length + 1));
}

const selectAfter = (at: number, count: number) => ({
  count,
  select: (blocks: Block[]) => blocks.find((b) => b.start > at)?.index,
});

/** Quita un bloque con su Paso si queda vacío, y la línea en blanco que lo separaba del vecino. */
export function removeBlock(body: string, index: number): BlockEdit {
  const model = modelOf(body);
  if (typeof model === 'string') return fail(model);
  const block = model.blocks[index];
  if (!block) return fail('El bloque no existe.');
  if (isMascotBlock(block))
    return fail('La mascota se cambia en sus propiedades.');
  const { start, end } = unitOf(block);
  // ¿Lo precede otro bloque? Entonces se lleva la línea en blanco de antes; si no (va tras una
  // etiqueta de apertura), se lleva la de después.
  let before = start;
  while (before > 0 && isWhitespace(body[before - 1])) before--;
  const hasPrevious = model.blocks.some(
    (b) =>
      b.index !== index &&
      !isMascotBlock(b) &&
      (b.end === before || unitOf(b).end === before || b.paso?.end === before),
  );
  if (hasPrevious) return finish(splice(body, before, end, ''));
  let to = end;
  while (to < body.length && isWhitespace(body[to])) to++;
  return finish(splice(body, start, to, ''));
}

/** Copia un bloque justo después de sí mismo (con su Paso). Mascota y su pose no se duplican. */
export function duplicateBlock(body: string, index: number): BlockEdit {
  const model = modelOf(body);
  if (typeof model === 'string') return fail(model);
  const block = model.blocks[index];
  if (!block) return fail('El bloque no existe.');
  if (isMascotBlock(block) || block.component === 'MascotaProfePina')
    return fail('Solo se permite una mascota por lámina.');
  const { start, end } = unitOf(block);
  const indent = indentOf(body, start);
  return finish(
    splice(body, end, end, after(body, end, indent, body.slice(start, end))),
    selectAfter(end, model.blocks.length + 1),
  );
}

/** Sube (-1) o baja (+1) un bloque dentro de su contenedor, conservando su paso. */
export function moveBlock(
  body: string,
  index: number,
  direction: -1 | 1,
): BlockEdit {
  const model = modelOf(body);
  if (typeof model === 'string') return fail(model);
  const block = model.blocks[index];
  if (!block) return fail('El bloque no existe.');
  if (isMascotBlock(block)) return fail('La mascota no se mueve.');
  const peers = model.blocks.filter(
    (b) => b.container === block.container && !isMascotBlock(b),
  );
  const other = peers[peers.indexOf(block) + direction];
  if (!other) return fail(direction < 0 ? 'Ya está arriba.' : 'Ya está abajo.');
  const sameWrap = block.paso?.shared && other.paso?.start === block.paso.start;
  if (block.paso?.shared && !sameWrap)
    return fail('Está al borde de su paso: muévelo con la línea de pasos.');
  const mine = unitOf(block);
  // Fuera de un Paso compartido, un vecino dentro de uno se salta entero.
  const theirs = sameWrap
    ? { start: other.start, end: other.end }
    : other.paso
      ? { start: other.paso.start, end: other.paso.end }
      : { start: other.start, end: other.end };
  const [first, second] = direction > 0 ? [mine, theirs] : [theirs, mine];
  const next =
    body.slice(0, first.start) +
    body.slice(second.start, second.end) +
    body.slice(first.end, second.start) +
    body.slice(first.start, first.end) +
    body.slice(second.end);
  // Dónde queda el bloque: al principio del hueco si sube; tras el vecino y lo que los separa si baja.
  const unitStart =
    direction > 0
      ? first.start + (theirs.end - theirs.start) + (second.start - first.end)
      : first.start;
  const movedStart = unitStart + (block.start - mine.start);
  return finish(next, {
    select: (blocks) => blocks.find((b) => b.start === movedStart)?.index,
  });
}

/** Ajusta el espacio de una pieza recién desenvuelta para que no se pegue al párrafo vecino. */
function padUnwrapped(body: string, start: number, end: number, text: string) {
  const before = body.slice(0, start);
  const after = body.slice(end);
  const prevLine = before.replace(/[ \t]*$/, '').replace(/\n$/, '');
  const lastLine = prevLine.slice(prevLine.lastIndexOf('\n') + 1);
  const nextLine = after.replace(/^[ \t]*\n/, '').split('\n', 1)[0] ?? '';
  const lead = lastLine.trim() && !lastLine.trimEnd().endsWith('>') ? '\n' : '';
  const trail =
    nextLine.trim() &&
    !nextLine.trimStart().startsWith('<') &&
    !/>\s*$/.test(text)
      ? '\n'
      : '';
  return `${lead}${text}${trail}`;
}

/** Cambia el paso en que aparece un bloque (0 = al abrir la lámina). */
export function setBlockStep(
  body: string,
  index: number,
  n: number,
): BlockEdit {
  if (!Number.isInteger(n) || n < 0 || n > MAX_STEPS)
    return fail('El paso debe estar entre 0 y 12.');
  const model = modelOf(body);
  if (typeof model === 'string') return fail(model);
  const block = model.blocks[index];
  if (!block) return fail('El bloque no existe.');
  if (isMascotBlock(block)) return fail('La mascota no tiene paso propio.');
  if (block.inherited)
    return fail(`Aparece en el paso ${block.step} por su contenedor.`);
  if (block.step === n) return { ok: true, body, select: index };
  const text = body.slice(block.start, block.end);
  if (n > 0 && /<Paso[\s>]/.test(text))
    return fail(
      'Tiene pasos propios en su interior: no puede ir dentro de otro paso.',
    );
  const wrap = block.paso;
  if (!wrap) {
    const indent = indentOf(body, block.start);
    return finish(
      splice(
        body,
        block.start,
        block.end,
        indentLines(wrapPaso(n, text), indent),
      ),
      {
        select: (blocks) => blocks.find((b) => b.start >= block.start)?.index,
      },
    );
  }
  if (!wrap.shared) {
    if (n > 0)
      return finish(splice(body, wrap.nStart, wrap.nEnd, `n={${n}}`), {
        select: () => index,
      });
    return finish(
      splice(
        body,
        wrap.start,
        wrap.end,
        padUnwrapped(body, wrap.start, wrap.end, text),
      ),
      {
        select: (blocks) => blocks.find((b) => b.start >= wrap.start)?.index,
      },
    );
  }
  // Paso compartido: se parte en lo anterior, el bloque y lo posterior.
  const members = model.blocks.filter((b) => b.paso?.start === wrap.start);
  const at = members.indexOf(block);
  const before = members.slice(0, at);
  const after = members.slice(at + 1);
  const first = members[0];
  const last = members[members.length - 1];
  if (!first || !last || members.length < 2)
    return fail('No se pudo partir el paso.');
  const hasContainer = model.blocks.some(
    (b) => b.inherited && b.start > wrap.start && b.end <= wrap.end,
  );
  if (hasContainer)
    return fail('Ese paso envuelve columnas: se cambia desde su contenedor.');
  const pieces: string[] = [];
  if (before.length)
    pieces.push(
      wrapPaso(wrap.n, body.slice(first.start, before[before.length - 1]?.end)),
    );
  const mineStart = pieces.length;
  pieces.push(n > 0 ? wrapPaso(n, text) : text);
  const nextFirst = after[0];
  if (nextFirst)
    pieces.push(wrapPaso(wrap.n, body.slice(nextFirst.start, last.end)));
  const indent = indentOf(body, wrap.start);
  const replaced = indentLines(pieces.join('\n\n'), indent);
  const offsetInside = replaced.indexOf(
    text,
    pieces.slice(0, mineStart).join('\n\n').length,
  );
  return finish(splice(body, wrap.start, wrap.end, replaced), {
    select: (blocks) =>
      blocks.find((b) => b.start >= wrap.start + Math.max(offsetInside, 0))
        ?.index,
  });
}

/** Agrega un paso (sin bloques todavía): solo cambia la cuenta de `steps`. */
export function addStep(body: string, steps: number): BlockEdit {
  if (steps >= MAX_STEPS) return fail('Una lámina admite hasta 12 pasos.');
  return { ok: true, body, steps: steps + 1 };
}

interface StepRef {
  start: number;
  end: number;
  value: number;
  /** `Paso n` (se desenvuelve al llegar a 0) o un atributo con paso. */
  paso: MdxNode | null;
  /** Texto con que se reescribe el valor `value` → `next`. */
  print: (next: number) => string;
}

function collectStepRefs(body: string): StepRef[] {
  const root = nodeSchema.parse(processor.parse(body));
  const refs: StepRef[] = [];
  const visit = (node: MdxNode) => {
    if (isJsx(node)) {
      for (const attr of node.attributes ?? []) {
        const start = attr.position?.start.offset;
        const end = attr.position?.end.offset;
        if (!attr.name || start === undefined || end === undefined) continue;
        if (node.name === 'Paso' && attr.name === 'n') {
          const value = intOf(attr);
          if (value !== null)
            refs.push({
              start,
              end,
              value,
              paso: node,
              print: (k) => `n={${k}}`,
            });
          continue;
        }
        if (!attr.name.startsWith('paso')) continue;
        const raw = body.slice(start, end);
        const eq = raw.indexOf('=');
        if (eq < 0) continue;
        const valueStart = start + eq + 1;
        const numbers = [...raw.slice(eq + 1).matchAll(/\d+/g)];
        for (const match of numbers) {
          const from = valueStart + (match.index ?? 0);
          refs.push({
            start: from,
            end: from + match[0].length,
            value: Number(match[0]),
            paso: null,
            print: String,
          });
        }
      }
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  return refs;
}

/**
 * Quita el paso `n`: sus bloques pasan al paso anterior y los pasos mayores se renumeran
 * (`<Paso n>` y atributos `paso…`).
 */
export function removeStep(body: string, n: number, steps: number): BlockEdit {
  if (n < 1 || n > steps) return fail('Ese paso no existe.');
  const model = modelOf(body);
  if (typeof model === 'string') return fail(model);
  let next = body;
  if (n === 1) {
    // Lo del paso 1 pasa a verse al abrir: sus `<Paso n={1}>` se desenvuelven. Un componente
    // que se revela con `paso={1}` no tiene paso anterior al que ir.
    if (collectStepRefs(body).some((ref) => ref.value === 1 && !ref.paso))
      return fail(
        'Un componente de la lámina se revela en el paso 1 y no puede aparecer al abrir.',
      );
    for (let guard = 0; guard < 500; guard++) {
      const root = nodeSchema.parse(processor.parse(next));
      const target = lastPasoWith(root, 1);
      if (!target) break;
      next = unwrapPaso(next, target);
    }
  }
  const edits = collectStepRefs(next).flatMap((ref) => {
    if (ref.value > n)
      return [
        { start: ref.start, end: ref.end, text: ref.print(ref.value - 1) },
      ];
    if (ref.value === n && n > 1)
      return [{ start: ref.start, end: ref.end, text: ref.print(n - 1) }];
    return [];
  });
  return finish(applyEdits(next, edits), { steps: steps - 1 });
}

/** Quita las etiquetas de un `<Paso>` y deja su contenido en su lugar. */
function unwrapPaso(body: string, node: MdxNode) {
  const { start, end } = offsets(node);
  const content = node.children ?? [];
  const first = content[0];
  const last = content[content.length - 1];
  if (!first || !last) return splice(body, start, end, '');
  const inner = body.slice(offsets(first).start, offsets(last).end);
  return splice(
    body,
    start,
    end,
    node.type === 'mdxJsxTextElement'
      ? inner
      : padUnwrapped(body, start, end, inner),
  );
}

function lastPasoWith(node: MdxNode, n: number): MdxNode | null {
  let found: MdxNode | null = null;
  const visit = (current: MdxNode) => {
    if (
      isJsx(current) &&
      current.name === 'Paso' &&
      intOf(current.attributes?.find((a) => a.name === 'n')) === n
    )
      found = current;
    for (const child of current.children ?? []) visit(child);
  };
  visit(node);
  return found;
}

function applyEdits(
  body: string,
  edits: { start: number; end: number; text: string }[],
) {
  return [...edits]
    .sort((a, b) => b.start - a.start)
    .reduce((acc, e) => splice(acc, e.start, e.end, e.text), body);
}

/** Pasos que usa el cuerpo (de `<Paso n>` y `paso…`), para comparar con `steps` del encabezado. */
export function usedSteps(body: string): number[] {
  return [...new Set(collectStepRefs(body).map((r) => r.value))].sort(
    (a, b) => a - b,
  );
}

/** Identificadores de actividad de los `PreguntaPAES` de la lámina, sin repetir. */
export function questionIds(blocks: readonly Block[]): string[] {
  const ids = blocks.flatMap((block) =>
    block.fields.flatMap((field) => {
      if (field.kind !== 'params' || field.component !== 'PreguntaPAES')
        return [];
      const id = field.attrs.id?.value;
      return typeof id === 'string' ? [id] : [];
    }),
  );
  return [...new Set(ids)];
}

/**
 * Encuentra el bloque al que se refería un comentario: el que tiene su resumen en la misma
 * posición o, si cambió de lugar, el primero con ese resumen. Null si ya no existe.
 */
export function findBlockByRef(
  blocks: readonly Block[],
  ref: { index: number; label: string },
): Block | null {
  const same = blocks[ref.index];
  if (same && same.summary === ref.label) return same;
  return blocks.find((block) => block.summary === ref.label) ?? null;
}
