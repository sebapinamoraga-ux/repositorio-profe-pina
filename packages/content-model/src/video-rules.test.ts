import { describe, expect, it } from 'vitest';
import { checkSlideSource } from './check-source';
import { splitSource, toMdx } from './frontmatter';
import { lessonSchema, slideSchema, type Lesson, type Planning, type Slide } from './index';
import {
  slideFigures,
  videoLessonWarnings,
  videoSlideStats,
  type VideoSlide,
} from './video-rules';

const context = { templateIds: new Set<string>(), activityIds: new Set<string>() };
const source = (frontmatter: Partial<Slide>, body: string) =>
  toMdx({
    ...slideSchema.parse({
      id: 'a',
      title: 'A',
      phase: 'desarrollo',
      layout: 'escena',
      steps: 0,
      ...frontmatter,
    }),
    body: `\n${body}\n`,
  });

describe('frontmatter de video', () => {
  it('escribe el momento después de la fase y lo vuelve a leer igual', () => {
    const text = source({ momento: 'climax', steps: 0 }, 'Texto.');
    expect(text).toContain('phase: desarrollo\nmomento: climax\nlayout: escena');
    const { slide, body } = splitSource(text);
    expect(slide.momento).toBe('climax');
    expect(toMdx({ ...slide, body })).toBe(text);
  });
  it('sin momento, la forma canónica de aula no cambia', () => {
    expect(source({ layout: 'concepto' }, 'Texto.')).not.toContain('momento');
  });
});

describe('Recuerda y pasos de las figuras', () => {
  it('Recuerda exige la clase y el título literales', async () => {
    const ok = await checkSlideSource(
      source({}, '<Recuerda clase="m1-primos" titulo="Números primos">Texto.</Recuerda>'),
      context,
    );
    expect(ok.error).toBeNull();
    const sinTitulo = await checkSlideSource(
      source({}, '<Recuerda clase="m1-primos">Texto.</Recuerda>'),
      context,
    );
    expect(sinTitulo.error).toContain('titulo');
  });
  it('cuenta los pasos de cada recta y del destacado de LineasMultiplos', async () => {
    const figura = (pasos: string) =>
      source(
        { steps: 3 },
        `<LineasMultiplos numeros={[4, 6]} hasta={24} pasosNumeros={${pasos}} pasoComunes={3} descripcion="D" />`,
      );
    expect((await checkSlideSource(figura('[1, 2]'), context)).error).toBeNull();
    expect((await checkSlideSource(figura('[1]'), context)).error).toContain('un paso por cada');
    expect((await checkSlideSource(figura('[1, 4]'), context)).error).toContain('fuera de 1..3');
  });
  it('BarrasDivision con intentos exige el paso del trozo final', async () => {
    const barras = (extra: string) =>
      source(
        { steps: 2 },
        `<BarrasDivision longitudes={[12, 18]} trozo={6} intentos={[4]} pasosIntentos={[1]} ${extra} descripcion="D" />`,
      );
    expect((await checkSlideSource(barras('pasoTrozo={2}'), context)).error).toBeNull();
    expect((await checkSlideSource(barras(''), context)).error).toContain('pasoTrozo');
  });
});

describe('estadísticas de una lámina de video', () => {
  it('cuenta palabras de prosa sin fórmulas ni frontmatter', () => {
    const stats = videoSlideStats(
      source(
        { momento: 'desarrollo' },
        'Dos palabras $12+18=30$.\n\n$$\n72=2^3\\cdot 3^2\n$$\n\n<Definicion titulo="X">Tres palabras aquí.</Definicion>',
      ),
    );
    expect(stats.words).toBe(5);
    expect(stats.definiciones).toBe(1);
    expect(stats.visual).toBe(true);
  });
  it('reconoce figuras, mascotas y los Recuerda', () => {
    const stats = videoSlideStats(
      source(
        {},
        '<Recuerda clase="m1-primos" titulo="P">Hola.</Recuerda>\n\n<ArbolFactores n={72} descripcion="D" />\n\n<Composicion plantilla="x">Hola.</Composicion>',
      ),
    );
    expect(stats.recuerda).toEqual(['m1-primos']);
    expect(stats.visual).toBe(true);
    expect(stats.mascots).toBe(1);
  });
});

describe('avisos de una clase de video', () => {
  const lesson = (extra: Partial<Lesson> = {}): Lesson =>
    lessonSchema.parse({
      id: 'm1-video',
      title: 'Video',
      subject: 'm1',
      axis: 'Números',
      duration: 8,
      prerequisites: ['Base'],
      objectives: ['Objetivo'],
      skills: ['Representar'],
      curriculum: ['c'],
      status: 'draft',
      formato: 'video',
      gancho: '¿Pregunta?',
      previos: [{ clase: 'm1-antes', idea: 'Idea' }],
      slides: ['x.mdx'],
      ...extra,
    });
  const slide = (id: string, momento: Slide['momento'], body = 'Texto.', phase?: Slide['phase']): VideoSlide => {
    const fallback: Record<string, Slide['phase']> = {
      gancho: 'inicio',
      climax: 'desarrollo',
      pausa: 'practica',
      cierre: 'cierre',
      desarrollo: 'desarrollo',
    };
    const text = source({ id, momento, phase: phase ?? fallback[momento ?? ''] ?? 'desarrollo' }, body);
    return { slide: splitSource(text).slide, text };
  };
  const visual = '$$\nx\n$$';
  const ordenada = [
    slide('g', 'gancho'),
    ...Array.from({ length: 5 }, (_, k) => slide(`d${k}`, 'desarrollo', visual)),
    slide('c', 'climax', visual),
    slide('p', 'pausa'),
    slide('f', 'cierre'),
  ];
  const plannings: { id: string; planning: Planning }[] = [
    {
      id: 'yt',
      planning: {
        calendario: 'publicacion',
        units: [{ id: 'u', title: 'U', lessons: [{ id: 'm1-antes' }, { id: 'm1-video' }] }],
      },
    },
  ];

  it('un video bien armado no tiene avisos', () => {
    expect(videoLessonWarnings(lesson(), ordenada, plannings)).toEqual([]);
  });
  it('avisa el orden de los momentos, el clímax y la pausa', () => {
    const messages = videoLessonWarnings(
      lesson(),
      [slide('d', 'desarrollo', visual), slide('f', 'cierre')],
      plannings,
    ).map((w) => w.message);
    expect(messages.join('\n')).toMatch(/gancho/);
    expect(messages.join('\n')).toMatch(/exactamente un clímax/);
    expect(messages.join('\n')).toMatch(/pausa o una predicción/);
    expect(messages.join('\n')).toMatch(/entre 8 y 18 láminas/);
  });
  it('avisa la fase que no corresponde, el exceso de texto y la falta de visual', () => {
    const largo = Array.from({ length: 30 }, () => 'palabra').join(' ');
    const warnings = videoLessonWarnings(
      lesson(),
      [slide('g', 'gancho', largo), slide('d', 'desarrollo', 'Solo texto.', 'practica'), ...ordenada.slice(1)],
      plannings,
    );
    expect(warnings).toContainEqual({ slide: 'g', message: expect.stringMatching(/30 palabras/) });
    expect(warnings).toContainEqual({ slide: 'd', message: expect.stringMatching(/fase desarrollo/) });
    expect(warnings).toContainEqual({ slide: 'd', message: expect.stringMatching(/figura/) });
  });
  it('un Recuerda nombra una clase de previos que va antes en la biblioteca', () => {
    const conRecuerda = [
      ...ordenada.slice(0, 2),
      slide('r', 'recuerda', '<Recuerda clase="m1-otra" titulo="Otra">Hola.</Recuerda>', 'activacion'),
      ...ordenada.slice(2),
    ];
    const messages = videoLessonWarnings(
      lesson({ previos: [{ clase: 'm1-despues', idea: 'I' }] }),
      conRecuerda,
      [
        {
          id: 'yt',
          planning: {
            units: [{ id: 'u', title: 'U', lessons: [{ id: 'm1-video' }, { id: 'm1-despues' }] }],
          },
        },
      ],
    ).map((w) => w.message);
    expect(messages).toContain('La clase previa m1-despues va después de este video en la biblioteca.');
    expect(messages).toContain('Recuerda nombra m1-otra, que no está en `previos` de lesson.yaml.');
  });
  it('en una clase de aula solo avisa lo propio del video', () => {
    const aula = lesson({ formato: undefined, gancho: undefined, previos: undefined });
    const text = source({ id: 'a', phase: 'inicio', layout: 'concepto' }, 'Texto.');
    expect(videoLessonWarnings(aula, [{ slide: splitSource(text).slide, text }], [])).toEqual([]);
    // Momento y diseño escena: dos avisos.
    expect(videoLessonWarnings(aula, [slide('g', 'gancho')], [])).toHaveLength(2);
  });
});

describe('figuras de una lámina para el video', () => {
  it('lee cada figura con sus atributos literales y el paso que la contiene', () => {
    const figuras = slideFigures(
      source(
        { steps: 1 },
        [
          `<LineasMultiplos numeros={[4, 6]} hasta={24} rotulos={['a', 'b']} descripcion="D" />`,
          '<Paso n={1}>\n<ArbolFactores n={72} descripcion="E" />\n</Paso>',
          '$$\nx\n$$',
        ].join('\n\n'),
      ),
    );
    expect(figuras).toEqual([
      {
        componente: 'LineasMultiplos',
        props: { numeros: [4, 6], hasta: 24, rotulos: ['a', 'b'], descripcion: 'D' },
      },
      { componente: 'ArbolFactores', props: { n: 72, descripcion: 'E' }, enPaso: 1 },
    ]);
  });
});
