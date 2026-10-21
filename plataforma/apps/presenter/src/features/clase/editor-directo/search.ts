import { extractBlocks } from '../editor/blocks';

/** Texto sin acentos ni mayúsculas, con el mapa de cada letra a su posición en el original. */
export function fold(text: string) {
  let out = '';
  const map: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const char = text[i] ?? '';
    // El punto de miles no cuenta: «6.700» se encuentra con «6700».
    if (
      char === '.' &&
      /\d/.test(text[i - 1] ?? '') &&
      /\d/.test(text[i + 1] ?? '')
    )
      continue;
    for (const piece of char
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .toLowerCase()) {
      out += piece;
      map.push(i);
    }
  }
  return { text: out, map };
}

export interface SearchHit {
  slideId: string;
  slideIndex: number;
  title: string;
  /** Bloque que contiene la coincidencia; null si es el título. */
  block: number | null;
  blockLabel: string;
  /** Fragmento y rango resaltado dentro de él. */
  snippet: string;
  mark: [number, number];
}

export interface SearchSlide {
  id: string;
  title: string;
  body: string;
}

export const MIN_QUERY = 2;
export const MAX_HITS = 40;
const CONTEXT = 36;

function snippetAt(
  source: string,
  from: number,
  to: number,
): Pick<SearchHit, 'snippet' | 'mark'> {
  const flat = source.replace(/\s+/g, ' ');
  // Los espacios se colapsaron: se vuelve a buscar el trozo en el texto plano.
  const piece = source.slice(from, to).replace(/\s+/g, ' ');
  const at = Math.max(0, flat.indexOf(piece));
  const start = Math.max(0, at - CONTEXT);
  const end = Math.min(flat.length, at + piece.length + CONTEXT);
  const prefix = start > 0 ? '…' : '';
  return {
    snippet: `${prefix}${flat.slice(start, end)}${end < flat.length ? '…' : ''}`,
    mark: [
      prefix.length + at - start,
      prefix.length + at - start + piece.length,
    ],
  };
}

/** Busca en títulos, bloques y fórmulas de las láminas; sin acentos ni mayúsculas. */
export function searchSlides(
  slides: readonly SearchSlide[],
  query: string,
): SearchHit[] {
  const needle = fold(query.trim()).text;
  if (needle.length < MIN_QUERY) return [];
  const hits: SearchHit[] = [];
  const look = (
    slide: SearchSlide,
    slideIndex: number,
    block: number | null,
    blockLabel: string,
    source: string,
  ) => {
    const folded = fold(source);
    const found = folded.text.indexOf(needle);
    if (found < 0) return;
    const from = folded.map[found] ?? 0;
    const to = (folded.map[found + needle.length - 1] ?? from) + 1;
    hits.push({
      slideId: slide.id,
      slideIndex,
      title: slide.title,
      block,
      blockLabel,
      ...snippetAt(source, from, to),
    });
  };
  for (const [slideIndex, slide] of slides.entries()) {
    if (hits.length >= MAX_HITS) break;
    look(slide, slideIndex, null, 'Título', slide.title);
    const model = extractBlocks(slide.body);
    if (!model.ok) {
      look(slide, slideIndex, null, 'Lámina', slide.body);
      continue;
    }
    for (const block of model.blocks) {
      const text = block.fields
        .flatMap((f) =>
          f.kind === 'text' || f.kind === 'attr' ? [f.value] : [],
        )
        .join(' ');
      if (text) look(slide, slideIndex, block.index, block.label, text);
    }
  }
  return hits.slice(0, MAX_HITS);
}
