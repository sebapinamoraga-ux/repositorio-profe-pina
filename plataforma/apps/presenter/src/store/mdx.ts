import type { MascotTemplate } from '@aula/content-model';
import type { EditedSlide } from './schema';

export { splitSource, toMdx } from '@aula/content-model/frontmatter';

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
