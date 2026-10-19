/**
 * Guía pedagógica de una clase (`guia.md`, junto a `clase.yaml`): la intención que las láminas
 * deben servir. Se escribe en Markdown con una sección `##` por apartado, en este orden.
 */
export const GUIDE_SECTIONS = [
  {
    title: 'Propósito',
    hint: 'Qué debe poder hacer el estudiante al salir de la clase.',
  },
  {
    title: 'Evidencia',
    hint: 'En qué lámina o actividad se ve que lo logró.',
  },
  {
    title: 'Punto de partida',
    hint: 'Conocimientos previos y cómo se activan.',
  },
  {
    title: 'Secuencia',
    hint: 'Por qué este orden: un párrafo por tramo.',
  },
  {
    title: 'Errores esperados',
    hint: 'Qué errores se anticipan y en qué lámina se abordan.',
  },
  {
    title: 'Decisiones',
    hint: 'Fecha · decisión · motivo.',
  },
  {
    title: 'Después de la clase',
    hint: 'Qué ajustar la próxima vez, sin datos de cursos ni estudiantes.',
  },
] as const;

export type GuideSectionTitle = (typeof GUIDE_SECTIONS)[number]['title'];

/** Apartados que una clase publicada no puede dejar vacíos. */
export const REQUIRED_GUIDE_SECTIONS: readonly GuideSectionTitle[] = [
  'Propósito',
  'Evidencia',
  'Errores esperados',
];

/** Texto que deja la plantilla en un apartado sin escribir; cuenta como vacío. */
export const GUIDE_PENDING = '_Por completar._';

export interface Guide {
  /** Título de la clase (la línea `# …`). */
  title: string;
  /** Texto de cada apartado, sin el encabezado y sin espacios al borde. */
  sections: Map<string, string>;
}

/** Lee una guía: título y apartados `##`. Lo que no esté bajo un apartado se ignora. */
export function parseGuide(text: string): Guide {
  const sections = new Map<string, string>();
  let title = '';
  let current: string | null = null;
  let lines: string[] = [];
  const close = () => {
    if (current !== null) sections.set(current, lines.join('\n').trim());
  };
  for (const line of text.replaceAll('\r\n', '\n').split('\n')) {
    const h1 = /^# (.+)$/.exec(line);
    const h2 = /^## (.+)$/.exec(line);
    if (h1 && !title && current === null) title = h1[1]?.trim() ?? '';
    else if (h2) {
      close();
      current = h2[1]?.trim() ?? '';
      lines = [];
    } else if (current !== null) lines.push(line);
  }
  close();
  return { title, sections };
}

const isBlank = (text: string | undefined) =>
  !text || !text.replaceAll(GUIDE_PENDING, '').trim();

/** Escribe una guía con los apartados en el orden canónico; los vacíos quedan «Por completar». */
export function formatGuide(guide: Guide): string {
  const known = new Set<string>(GUIDE_SECTIONS.map((section) => section.title));
  const extra = [...guide.sections.keys()].filter((title) => !known.has(title));
  const blocks = [
    ...GUIDE_SECTIONS.map((section) => section.title),
    ...extra,
  ].map((title) => {
    const body = guide.sections.get(title);
    return `## ${title}\n\n${isBlank(body) ? GUIDE_PENDING : body}`;
  });
  return `# ${guide.title}\n\n${blocks.join('\n\n')}\n`;
}

/** Guía nueva: cada apartado por completar, con lo que ya dice la clase cuando lo hay. */
export function guideTemplate(input: {
  title: string;
  objectives?: readonly string[];
  prerequisites?: readonly string[];
}): string {
  const list = (items: readonly string[] | undefined) =>
    items?.length ? items.map((item) => `- ${item}`).join('\n') : '';
  return formatGuide({
    title: input.title,
    sections: new Map([
      ['Propósito', list(input.objectives)],
      ['Punto de partida', list(input.prerequisites)],
    ]),
  });
}

/** Apartados obligatorios vacíos o ausentes. */
export function missingGuideSections(text: string): GuideSectionTitle[] {
  const { sections } = parseGuide(text);
  return REQUIRED_GUIDE_SECTIONS.filter((title) =>
    isBlank(sections.get(title)),
  );
}

/** ¿Está vacío este apartado (o solo dice «Por completar»)? */
export const isGuideSectionBlank = isBlank;
