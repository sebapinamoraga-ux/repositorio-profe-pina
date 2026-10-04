import {
  isMap,
  isScalar,
  isSeq,
  parseDocument,
  stringify,
  type Document,
} from 'yaml';

/** Orden de claves de los archivos que el editor crea o completa. */
export const LESSON_KEYS = [
  'id',
  'title',
  'subject',
  'axis',
  'duration',
  'prerequisites',
  'objectives',
  'skills',
  'curriculum',
  'status',
  'tramos',
  'slides',
] as const;
export const ACTIVITY_KEYS = [
  'id',
  'type',
  'prompt',
  'answer',
  'solution',
  'skills',
  'source',
  'model',
  'options',
] as const;

const OPTIONS = {
  lineWidth: 0,
  flowCollectionPadding: false,
  singleQuote: true,
} as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function keyOf(node: unknown): string {
  return isScalar(node) ? String(node.value) : String(node);
}

function patchNode(
  doc: Document,
  node: unknown,
  value: unknown,
  order: readonly string[],
): unknown {
  if (isRecord(value)) {
    if (!isMap(node)) return doc.createNode(value);
    for (const pair of [...node.items]) {
      const key = keyOf(pair.key);
      if (value[key] === undefined) node.delete(pair.key);
    }
    for (const [key, next] of Object.entries(value)) {
      if (next === undefined) continue;
      const pair = node.items.find((item) => keyOf(item.key) === key);
      if (pair) {
        pair.value = patchNode(doc, pair.value, next, []);
        continue;
      }
      // Una clave nueva va en su lugar según el orden del esquema, o al final.
      const rank = order.indexOf(key);
      let at = node.items.length;
      if (rank >= 0)
        for (let k = 0; k < node.items.length; k++) {
          const other = order.indexOf(keyOf(node.items[k]?.key));
          if (other > rank) {
            at = k;
            break;
          }
        }
      node.items.splice(at, 0, doc.createPair(key, next));
    }
    return node;
  }
  if (Array.isArray(value)) {
    if (!isSeq(node)) return doc.createNode(value);
    node.items = value.map((item, k) => patchNode(doc, node.items[k], item, []));
    return node;
  }
  if (isScalar(node)) {
    if (node.value !== value) node.value = value;
    return node;
  }
  return doc.createNode(value);
}

/**
 * Escribe `next` sobre el YAML original conservando orden de claves, comentarios y estilo
 * de cada valor; así un cambio de un campo se ve como una línea en el historial.
 */
export function patchYaml(
  original: string,
  next: unknown,
  order: readonly string[] = [],
): string {
  const doc = parseDocument(original);
  doc.contents = patchNode(doc, doc.contents, next, order) as typeof doc.contents;
  const text = doc.toString(OPTIONS);
  return text.endsWith('\n') ? text : `${text}\n`;
}

/** YAML nuevo con las claves en el orden del esquema. */
export function stringifyYaml(
  value: Record<string, unknown>,
  order: readonly string[] = [],
): string {
  const rank = (key: string) => {
    const k = order.indexOf(key);
    return k < 0 ? order.length : k;
  };
  const sorted = Object.fromEntries(
    Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => rank(a) - rank(b)),
  );
  return stringify(sorted, OPTIONS);
}
