import { createProcessor } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import {
  PHASE_OF_MOMENT,
  lessonFormat,
  planningCalendar,
  type Lesson,
  type Planning,
  type Slide,
  type VideoMoment,
} from './index.ts';
import { INTERACTIVE_SPECS, parseLiteral, type ParamValue } from './interactive-params.ts';

/**
 * Reglas de las clases de video (docs/plan-diapositivas-video.md §4.3). Durante el piloto
 * son avisos: no bloquean la publicación y sirven para calibrar los umbrales.
 */

/** Palabras de prosa visibles a la vez en una lámina de video, sin fórmulas ni rótulos de figuras. */
export const VIDEO_MAX_WORDS = 25;
/** Láminas de un video conceptual. */
export const VIDEO_SLIDES = { min: 8, max: 18 } as const;
/** Bloques Recuerda por video. */
export const VIDEO_MAX_RECUERDA = 2;

/** Componentes que cuentan como el objeto visual de una lámina. */
const VISUALS = new Set([
  ...Object.keys(INTERACTIVE_SPECS).filter(
    (name) => name !== 'PreguntaPAES' && name !== 'MascotaProfePina',
  ),
  'Formula',
]);
const MASCOTS = new Set(['MascotaProfePina', 'Composicion']);

/** Lo que las reglas de video necesitan saber del cuerpo de una lámina. */
export interface VideoSlideStats {
  /** Palabras de prosa, sin fórmulas. */
  words: number;
  definiciones: number;
  /** Clases que nombra cada Recuerda. */
  recuerda: string[];
  mascots: number;
  /** Tiene una figura, un interactivo o una fórmula central. */
  visual: boolean;
}

interface Node {
  type: string;
  name?: string | null;
  value?: unknown;
  attributes?: { name?: unknown; value?: unknown }[];
  children?: Node[];
}

const isNode = (value: unknown): value is Node =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  typeof value.type === 'string';

const processor = createProcessor({ remarkPlugins: [remarkFrontmatter, remarkMath] });

const countWords = (text: string) =>
  text.split(/\s+/).filter((token) => /[\p{L}\p{N}]/u.test(token)).length;

/** Lee el árbol de la lámina sin compilarla, para que el navegador pueda revisar todas. */
export function videoSlideStats(source: string): VideoSlideStats {
  const stats: VideoSlideStats = {
    words: 0,
    definiciones: 0,
    recuerda: [],
    mascots: 0,
    visual: false,
  };
  const visit = (node: Node) => {
    if (node.type === 'yaml' || node.type === 'inlineMath') return;
    if (node.type === 'math') {
      stats.visual = true;
      return;
    }
    if (node.type === 'text' && typeof node.value === 'string')
      stats.words += countWords(node.value);
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const name = node.name ?? '';
      if (name === 'Definicion') stats.definiciones++;
      if (MASCOTS.has(name)) stats.mascots++;
      if (VISUALS.has(name)) stats.visual = true;
      if (name === 'Recuerda') {
        const clase = node.attributes?.find((attr) => attr.name === 'clase')?.value;
        if (typeof clase === 'string') stats.recuerda.push(clase);
      }
    }
    for (const child of node.children ?? []) if (isNode(child)) visit(child);
  };
  const tree: unknown = processor.parse(source);
  if (isNode(tree)) visit(tree);
  return stats;
}

/** Una figura o interactivo de una lámina, con sus atributos literales. */
export interface SlideFigure {
  componente: string;
  props: Record<string, ParamValue>;
  /** Paso del bloque Paso que la contiene, si lo hay. */
  enPaso?: number;
}

/**
 * Figuras e interactivos de una lámina, en orden, para que el video los dibuje con los
 * mismos componentes. Un atributo que no es literal hace fallar la lectura.
 */
export function slideFigures(source: string): SlideFigure[] {
  const figures: SlideFigure[] = [];
  const visit = (node: Node, enPaso: number | undefined) => {
    let paso = enPaso;
    if (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') {
      const name = node.name ?? '';
      if (name === 'Paso') {
        const n = parseLiteral(node.attributes?.find((attr) => attr.name === 'n')?.value);
        if (typeof n === 'number') paso = n;
      }
      if (VISUALS.has(name) && name !== 'Formula') {
        const props: Record<string, ParamValue> = {};
        for (const attr of node.attributes ?? []) {
          if (typeof attr.name !== 'string') continue;
          const value = parseLiteral(attr.value);
          if (value === null)
            throw new Error(`${name}: el atributo ${attr.name} no es literal.`);
          props[attr.name] = value;
        }
        figures.push({ componente: name, props, ...(paso ? { enPaso: paso } : {}) });
      }
    }
    for (const child of node.children ?? []) if (isNode(child)) visit(child, paso);
  };
  const tree: unknown = processor.parse(source);
  if (isNode(tree)) visit(tree, undefined);
  return figures;
}

export interface VideoSlide {
  slide: Slide;
  text: string;
}

/** Un video de práctica lleva `-practica-` en su identificador, como en el canal. */
export const isPracticeVideo = (id: string) => id.includes('-practica-');

/** Ubicación de una clase en las bibliotecas: archivo, posición y fecha. */
interface Placement {
  planning: string;
  index: number;
  date?: string;
}

function placements(plannings: readonly { id: string; planning: Planning }[]) {
  const found = new Map<string, Placement>();
  for (const { id, planning } of plannings) {
    let index = 0;
    for (const unit of planning.units)
      for (const lesson of unit.lessons)
        found.set(lesson.id, {
          planning: id,
          index: index++,
          ...(lesson.date ? { date: lesson.date } : {}),
        });
  }
  return found;
}

/**
 * Avisos de una clase de video. En una clase de aula solo avisa si usa algo propio del video.
 */
export function videoLessonWarnings(
  lesson: Lesson,
  slides: readonly VideoSlide[],
  plannings: readonly { id: string; planning: Planning }[],
): { slide?: string; message: string }[] {
  const warnings: { slide?: string; message: string }[] = [];
  const warn = (message: string, slide?: string) =>
    warnings.push(slide ? { slide, message } : { message });

  if (lessonFormat(lesson) === 'aula') {
    for (const { slide } of slides) {
      if (slide.momento)
        warn('`momento` es solo para clases de video (`formato: video` en lesson.yaml).', slide.id);
      if (slide.layout === 'escena')
        warn('El diseño escena es solo para clases de video.', slide.id);
    }
    if (lesson.gancho || lesson.previos)
      warn('`gancho` y `previos` son solo para clases de video.');
    return warnings;
  }

  const practice = isPracticeVideo(lesson.id);
  const moments = slides.map(({ slide }) => slide.momento);
  const count = (moment: VideoMoment) => moments.filter((m) => m === moment).length;
  if (moments[0] !== 'gancho') warn('La primera lámina de un video es el gancho (`momento: gancho`).');
  if (moments.at(-1) !== 'cierre') warn('La última lámina de un video es el cierre (`momento: cierre`).');
  if (!practice) {
    if (!lesson.gancho) warn('Un video conceptual declara su pregunta central en `gancho`.');
    if (count('climax') !== 1)
      warn(`Un video conceptual tiene exactamente un clímax; tiene ${count('climax')}.`);
    if (count('pausa') + count('prediccion') === 0)
      warn('Un video conceptual tiene al menos una pausa o una predicción.');
    if (slides.length < VIDEO_SLIDES.min || slides.length > VIDEO_SLIDES.max)
      warn(
        `Un video conceptual tiene entre ${VIDEO_SLIDES.min} y ${VIDEO_SLIDES.max} láminas; tiene ${slides.length}. Si son más, conviene dividirlo.`,
      );
  }
  moments.slice(0, 2).forEach((moment, index) => {
    if (moment === 'utilidad')
      warn('La utilidad PAES no va al inicio del video.', slides[index]?.slide.id);
  });

  const previos = new Set(
    (lesson.previos ?? []).flatMap((previo) => ('clase' in previo ? [previo.clase] : [])),
  );
  const where = placements(plannings);
  const here = where.get(lesson.id);
  for (const clase of previos) {
    const there = where.get(clase);
    if (!there) {
      warn(`La clase previa ${clase} no está en ninguna biblioteca.`);
      continue;
    }
    if (!here) continue;
    if (there.planning !== here.planning)
      warn(`La clase previa ${clase} está en otra biblioteca (${there.planning}).`);
    // Con las dos fechas manda la publicación (las unidades no van en orden de fecha);
    // si solo la previa tiene fecha, este video aún no se programa y no hay con qué comparar.
    else if (here.date && there.date) {
      if (there.date >= here.date)
        warn(`La clase previa ${clase} se publica el ${there.date}, no antes que este video.`);
    } else if (!there.date && there.index >= here.index)
      warn(`La clase previa ${clase} va después de este video en la biblioteca.`);
  }

  let recuerdas = 0;
  for (const { slide, text } of slides) {
    const stats = videoSlideStats(text);
    const moment = slide.momento;
    if (!moment) warn('Cada lámina de video declara su `momento`.', slide.id);
    else if (PHASE_OF_MOMENT[moment] !== slide.phase)
      warn(
        `El momento ${moment} corresponde a la fase ${PHASE_OF_MOMENT[moment]}, no a ${slide.phase}.`,
        slide.id,
      );
    if (slide.layout === 'portada')
      warn('Un video no abre con portada: el gancho reemplaza al título y al objetivo.', slide.id);
    if (stats.words > VIDEO_MAX_WORDS)
      warn(
        `Tiene ${stats.words} palabras de prosa en pantalla (máximo ${VIDEO_MAX_WORDS}): lo que se dice no se escribe.`,
        slide.id,
      );
    if (stats.definiciones > 1) warn('Más de una definición en la lámina.', slide.id);
    if (stats.definiciones > 0 && moment === 'gancho')
      warn('El gancho no lleva definiciones: primero el caso, después lo formal.', slide.id);
    if ((moment === 'desarrollo' || moment === 'climax') && !stats.visual)
      warn('Una lámina de desarrollo o clímax tiene una figura, un interactivo o una fórmula central.', slide.id);
    if (stats.mascots > 0 && moment !== 'gancho' && moment !== 'cierre')
      warn('En video, la mascota la pone el motor de video; la lámina solo la declara en el gancho o el cierre.', slide.id);
    recuerdas += stats.recuerda.length;
    for (const clase of stats.recuerda)
      if (!previos.has(clase))
        warn(`Recuerda nombra ${clase}, que no está en \`previos\` de lesson.yaml.`, slide.id);
  }
  if (recuerdas > VIDEO_MAX_RECUERDA)
    warn(
      `Tiene ${recuerdas} bloques Recuerda (máximo ${VIDEO_MAX_RECUERDA}): el video está lejos en la cadena o es demasiado grande.`,
    );
  return warnings;
}

/** Aviso de una biblioteca de publicación (el canal) que planifica clases de aula. */
export function publicationPlanningWarnings(
  plannings: readonly { id: string; path: string; planning: Planning }[],
  lessons: ReadonlyMap<string, Lesson>,
): { path: string; message: string }[] {
  const warnings: { path: string; message: string }[] = [];
  for (const { path, planning } of plannings) {
    if (planningCalendar(planning) !== 'publicacion') continue;
    for (const unit of planning.units)
      for (const planned of unit.lessons) {
        const lesson = lessons.get(planned.id);
        if (lesson && lessonFormat(lesson) === 'aula')
          warnings.push({
            path,
            message: `La biblioteca es de publicación y ${planned.id} es una clase de aula: conviene rehacerla con \`formato: video\`.`,
          });
      }
  }
  return warnings;
}
