import { describe, expect, it } from 'vitest';
import { checkSlideSource } from '@aula/content-model/check-source';
import { parseContentFiles } from '@aula/content-model/content-files';
import { readContentFiles } from '@aula/content-model/read-content';
import { toMdx } from '../../../store/mdx';
import { applyVariant, findNumbers, parseTyped } from './variant';

describe('variante con otros números', () => {
  const body = [
    '',
    '<Tarjeta titulo="Compra 120">',
    'Cuesta \\$6.700 en total: $4x+y=6.700$ y $x=1.500$, o sea 1500 y 700.',
    '</Tarjeta>',
    '',
    '<Paso n={100}>',
    'Quedan 6.700 pesos y 25 entradas.',
    '</Paso>',
    '',
    '<GraficoFuncion tipo="afin" m={200} n={100} />',
    '',
  ].join('\n');

  it('encuentra los números de tres o más cifras de textos y fórmulas, con su conteo', () => {
    expect(findNumbers(body)).toEqual([
      { digits: '6700', shown: '6.700', count: 3 },
      { digits: '1500', shown: '1.500', count: 2 },
      { digits: '700', shown: '700', count: 1 },
    ]);
    // Ni el título, ni las etiquetas, ni los parámetros de un gráfico, ni los números cortos.
    expect(
      findNumbers(body).some((n) => n.digits === '120' || n.digits === '200'),
    ).toBe(false);
  });

  it('reemplaza en todos los lugares y conserva el estilo de los miles', () => {
    const changed = applyVariant(
      body,
      new Map([
        ['6700', '7200'],
        ['700', '900'],
      ]),
    );
    expect(changed).toContain(
      'Cuesta \\$7.200 en total: $4x+y=7.200$ y $x=1.500$, o sea 1500 y 900.',
    );
    expect(changed).toContain('Quedan 7.200 pesos');
    expect(changed).toContain('<Paso n={100}>');
    expect(changed).toContain('m={200} n={100}');
    expect(applyVariant(body, new Map())).toBe(body);
    expect(applyVariant(body, new Map([['6700', '6700']]))).toBe(body);
  });

  it('interpreta lo que se escribe', () => {
    expect(parseTyped('7.200')).toBe('7200');
    expect(parseTyped(' 900 ')).toBe('900');
    expect(parseTyped('7,5')).toBeNull();
    expect(parseTyped('')).toBeNull();
  });

  it('en las láminas del repositorio, cambiar todos los números sigue pasando content:check', async () => {
    const bundle = parseContentFiles(await readContentFiles());
    const templateIds = new Set(
      bundle.gallery?.templates.map((t) => t.id) ?? [],
    );
    const activityIds = new Set(Object.keys(bundle.activities));
    let withNumbers = 0;
    for (const lesson of bundle.lessons)
      for (const { slide, body: source } of lesson.slides) {
        const numbers = findNumbers(source);
        if (!numbers.length) continue;
        withNumbers++;
        const map = new Map(
          numbers.map((n) => [n.digits, String(Number(n.digits) + 111)]),
        );
        const next = applyVariant(source, map);
        expect(next, slide.id).not.toBe(source);
        const { error } = await checkSlideSource(
          toMdx({ ...slide, body: next }),
          { templateIds, activityIds },
        );
        expect(error, slide.id).toBeNull();
        // Y al revés vuelve a lo original.
        const back = new Map(
          numbers.map((n) => [String(Number(n.digits) + 111), n.digits]),
        );
        expect(applyVariant(next, back), slide.id).toBe(source);
      }
    expect(withNumbers).toBeGreaterThan(30);
  }, 120_000);
});
