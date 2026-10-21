import { extractBlocks } from '../editor/blocks';

/** Un número de tres o más cifras de una lámina, con todas las veces que aparece. */
export interface VariantNumber {
  /** Las cifras sin separadores: «6700». */
  digits: string;
  /** Cómo está escrito la primera vez: «6.700». */
  shown: string;
  count: number;
}

interface Occurrence {
  start: number;
  end: number;
  digits: string;
  /** Escrito con puntos de miles. */
  grouped: boolean;
  text: string;
}

/** Máximo de números que ofrece el diálogo. */
export const MAX_VARIANT_NUMBERS = 10;

// «6.700», «15.000.000» o «700» (tres o más cifras seguidas), sin decimales ni parte de otro número.
const NUMBER = /(?<![\d.,])(?:\d{1,3}(?:\.\d{3})+|\d{3,})(?![\d]|[.,]\d)/g;
// Las etiquetas de componentes (`<Paso n={100}>`) no son texto de la lámina.
const TAGS = /<\/?(?:[A-Z][A-Za-z]*|div|span)\b[^<>]*>/g;

/**
 * Los números del texto y las fórmulas de la lámina. No se tocan los atributos, los parámetros
 * de los interactivos ni los identificadores: solo lo que se lee en la lámina.
 */
function occurrences(body: string): Occurrence[] | null {
  const model = extractBlocks(body);
  if (!model.ok) return null;
  const found: Occurrence[] = [];
  for (const block of model.blocks)
    for (const field of block.fields) {
      if (field.kind !== 'text') continue;
      const tags = [...field.value.matchAll(TAGS)].map(
        (m) => [m.index, m.index + m[0].length] as const,
      );
      for (const match of field.value.matchAll(NUMBER)) {
        const at = match.index;
        if (tags.some(([from, to]) => at >= from && at < to)) continue;
        found.push({
          start: field.start + at,
          end: field.start + at + match[0].length,
          digits: match[0].replace(/\./g, ''),
          grouped: match[0].includes('.'),
          text: match[0],
        });
      }
    }
  return found.sort((a, b) => a.start - b.start);
}

/** Números de tres o más cifras de la lámina (hasta diez), con cuántas veces aparecen. */
export function findNumbers(body: string): VariantNumber[] {
  const byDigits = new Map<string, VariantNumber>();
  for (const found of occurrences(body) ?? []) {
    const known = byDigits.get(found.digits);
    if (known) known.count++;
    else
      byDigits.set(found.digits, {
        digits: found.digits,
        shown: found.text,
        count: 1,
      });
  }
  return [...byDigits.values()].slice(0, MAX_VARIANT_NUMBERS);
}

/** Cifras de lo que escribió el docente («6.700», «6700»); null si no es un número entero. */
export function parseTyped(text: string): string | null {
  const clean = text.trim().replace(/[\s.]/g, '');
  return /^\d+$/.test(clean) ? clean : null;
}

const group = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/**
 * Reemplaza cada número por el que se pidió, en todos los lugares donde aparece y sin tocar
 * nada más. Un número escrito con puntos de miles se vuelve a escribir igual.
 */
export function applyVariant(
  body: string,
  replacements: ReadonlyMap<string, string>,
): string {
  const list = occurrences(body) ?? [];
  let out = body;
  for (const found of [...list].reverse()) {
    const next = replacements.get(found.digits);
    if (next === undefined || next === found.digits) continue;
    const text = found.grouped && next.length > 3 ? group(next) : next;
    out = out.slice(0, found.start) + text + out.slice(found.end);
  }
  return out;
}
