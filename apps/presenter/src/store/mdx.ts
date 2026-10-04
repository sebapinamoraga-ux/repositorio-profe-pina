import {
  slideSchema,
  type MascotTemplate,
  type Slide,
} from '@aula/content-model';
import { parseFrontmatter } from '@aula/content-model/frontmatter';
import type { EditedSlide } from './schema';

/** Separa frontmatter y cuerpo sin tocar el texto del cuerpo, para poder reconstruir el archivo. */
export function splitSource(text: string): { slide: Slide; body: string } {
  const normalized = text.replaceAll('\r\n', '\n');
  const slide = slideSchema.parse(parseFrontmatter(normalized));
  const lines = normalized.split('\n');
  const end = lines.indexOf('---', 1);
  return { slide, body: lines.slice(end + 1).join('\n') };
}

export function toMdx(slide: EditedSlide | (Slide & { body: string })): string {
  const quote = (text: string) => `'${text.replaceAll("'", "''")}'`;
  return [
    '---',
    `id: ${slide.id}`,
    `title: ${quote(slide.title)}`,
    `phase: ${slide.phase}`,
    `layout: ${slide.layout}`,
    `steps: ${slide.steps}`,
    `activities: [${slide.activities.join(', ')}]`,
    '---',
    slide.body,
  ].join('\n');
}

export function templateBody(template: MascotTemplate) {
  return `\n<Composicion plantilla="${template.id}">\n${template.mdx}\n</Composicion>\n`;
}

export function slideFromTemplate(
  template: MascotTemplate,
  id: string,
  title = template.heading,
): EditedSlide {
  return {
    id,
    title,
    phase: template.phase,
    layout: template.layout === 'portada' ? 'portada' : 'concepto',
    steps: 0,
    activities: [],
    body: templateBody(template),
    origin: null,
  };
}

/** Estructura base: una lámina con mascota por momento de la clase; la portada lleva el título. */
export function skeleton(
  title: string,
  templates: readonly MascotTemplate[],
): EditedSlide[] {
  const phases = ['inicio', 'activacion', 'desarrollo', 'practica', 'cierre'];
  return phases.flatMap((phase, k) => {
    const template = templates.find((t) => t.phase === phase);
    return template
      ? [slideFromTemplate(template, template.id, k === 0 ? title : template.heading)]
      : [];
  });
}

