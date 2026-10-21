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

/** Diseños con esqueleto en blanco para «Nueva lámina». */
export type BlankLayout = 'portada' | 'concepto' | 'dos-columnas' | 'resolucion' | 'ejercicio';

interface BlankSpec {
  phase: EditedSlide['phase'];
  title: string;
  steps: number;
  body: string;
}

const BLANKS: Record<BlankLayout, BlankSpec> = {
  portada: {
    phase: 'inicio',
    title: 'Portada nueva',
    steps: 0,
    body: `
<Objetivo titulo="Objetivo de la clase">
Escribe aquí lo que el curso podrá hacer al terminar la clase.
</Objetivo>
`,
  },
  concepto: {
    phase: 'desarrollo',
    title: 'Concepto nuevo',
    steps: 0,
    body: `
<Definicion titulo="Idea central">
Escribe la definición. Usa $x$ para las fórmulas y **negrita** para lo importante.
</Definicion>
`,
  },
  'dos-columnas': {
    phase: 'desarrollo',
    title: 'Dos columnas nuevas',
    steps: 0,
    body: `
<Columnas>
<div>
<Tarjeta titulo="Primera idea">
Escribe el contenido de la columna izquierda.
</Tarjeta>
</div>
<div>
<Tarjeta titulo="Segunda idea">
Escribe el contenido de la columna derecha.
</Tarjeta>
</div>
</Columnas>
`,
  },
  resolucion: {
    phase: 'desarrollo',
    title: 'Resolución nueva',
    steps: 2,
    body: `
<Tarjeta titulo="Enunciado">
Escribe el problema que se va a resolver.
</Tarjeta>

<Paso n={1}>
<Tarjeta titulo="Desarrollo">
Escribe el primer paso de la resolución.
</Tarjeta>
</Paso>

<Paso n={2}>
<Tarjeta titulo="Resultado">
Escribe la respuesta y cómo se comprueba.
</Tarjeta>
</Paso>
`,
  },
  ejercicio: {
    phase: 'practica',
    title: 'Ejercicio nuevo',
    steps: 1,
    body: `
<PracticaIndividual titulo="Individual · 2 minutos">
Escribe la consigna del ejercicio.
</PracticaIndividual>

<Paso n={1}>
<Comprobacion titulo="Respuesta">
Escribe la respuesta esperada.
</Comprobacion>
</Paso>
`,
  },
};

/** Lámina en blanco con el esqueleto del diseño elegido; pasa `checkSlideSource` tal cual. */
export function blankSlide(layout: BlankLayout, id: string, title?: string): EditedSlide {
  const spec = BLANKS[layout];
  return {
    id,
    title: title ?? spec.title,
    phase: spec.phase,
    layout,
    steps: spec.steps,
    activities: [],
    body: spec.body,
  };
}
