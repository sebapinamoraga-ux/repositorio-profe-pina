import { describe, expect, it } from 'vitest';
import { checkSlideSource } from '@aula/content-model/check-source';
import { parseContentFiles } from '@aula/content-model/content-files';
import { readContentFiles } from '@aula/content-model/read-content';
import { toMdx } from '../../../store/mdx';
import {
  addStep,
  duplicateBlock,
  extractBlocks,
  insertBlock,
  isMascotBlock,
  moveBlock,
  removeBlock,
  removeStep,
  setBlockStep,
  usedSteps,
  writeField,
  type Block,
  type BlockEdit,
} from './blocks';
import { extractFields } from './mdx-fields';

/** El contenido del repositorio, leído como lo lee el build (clase y repaso). */
const bundle = parseContentFiles(await readContentFiles());
const everySlide = bundle.lessons.flatMap((lesson) => [
  ...lesson.slides,
  ...(lesson.repaso ?? []),
]);

function blocksOf(body: string) {
  const model = extractBlocks(body);
  if (!model.ok) throw new Error(model.reason);
  return model;
}
function applied(edit: BlockEdit) {
  if (!edit.ok) throw new Error(edit.reason);
  return edit;
}

const templateIds = new Set(bundle.gallery?.templates.map((t) => t.id) ?? []);
const activityIds = new Set(Object.keys(bundle.activities));
async function problemOf(
  slide: (typeof everySlide)[number]['slide'],
  body: string,
) {
  const { error } = await checkSlideSource(toMdx({ ...slide, body }), {
    templateIds,
    activityIds,
  });
  return error;
}
const lines = (...parts: string[]) => parts.join('\n');

describe('modelo de bloques', () => {
  it('lee las láminas del repositorio: rangos ordenados, campos dentro de su bloque', () => {
    expect(everySlide.length).toBeGreaterThan(240);
    for (const { slide, body } of everySlide) {
      const { blocks } = blocksOf(body);
      let last = -1;
      for (const block of blocks) {
        const where = `${slide.id} #${block.index} ${block.label}`;
        expect(block.index, where).toBe(blocks.indexOf(block));
        expect(block.start, where).toBeGreaterThanOrEqual(last);
        expect(block.end, where).toBeGreaterThanOrEqual(block.start);
        last = block.start;
        expect(block.summary.length, where).toBeLessThanOrEqual(40);
        if (block.paso) {
          expect(block.paso.start, where).toBeLessThanOrEqual(block.start);
          expect(block.paso.end, where).toBeGreaterThanOrEqual(block.end);
          expect(block.step, where).toBe(block.paso.n);
          expect(body.slice(block.paso.nStart, block.paso.nEnd), where).toMatch(
            /^n=/,
          );
        }
        for (const field of block.fields)
          if (
            field.kind === 'text' ||
            field.kind === 'attr' ||
            field.kind === 'template'
          ) {
            expect(field.start, where).toBeGreaterThanOrEqual(block.start);
            expect(field.end, where).toBeLessThanOrEqual(block.end);
            expect(body.slice(field.start, field.end), where).toBe(field.value);
          }
      }
    }
  });

  it('cada atributo editable de extractFields pertenece a un bloque', () => {
    for (const { slide, body } of everySlide) {
      const { blocks } = blocksOf(body);
      for (const field of extractFields(body)) {
        if (field.kind !== 'attr' && field.kind !== 'template') continue;
        expect(
          blocks.some((b) =>
            b.fields.some(
              (f) =>
                'start' in f && f.start === field.start && f.end === field.end,
            ),
          ),
          `${slide.id}: ${field.label}`,
        ).toBe(true);
      }
    }
  });

  it('distingue contenedores, pasos y bloques en una lámina de columnas', () => {
    const body = lines(
      '',
      '<Columnas>',
      '<div>',
      '<Definicion titulo="Ceros">',
      'Texto.',
      '</Definicion>',
      '',
      '<Paso n={1}>',
      '**Ejemplo:** $f(x)=0$.',
      '</Paso>',
      '</div>',
      '<Paso n={1}>',
      '<GraficoFuncion tipo="afin" m={2} n={1} />',
      '</Paso>',
      '</Columnas>',
      '',
    );
    const { blocks, containers } = blocksOf(body);
    expect(containers.map((c) => c.id)).toEqual([
      'root',
      'columnas/0',
      'columnas/1',
    ]);
    expect(
      blocks.map((b) => [b.label, b.step, b.container, b.paso?.shared]),
    ).toEqual([
      ['Definición', 0, 'columnas/0', undefined],
      ['Texto', 1, 'columnas/0', false],
      ['Gráfico', 1, 'columnas/1', false],
    ]);
    expect(blocks[0]?.summary).toBe('Ceros');
    expect(blocks[1]?.kind).toBe('text');
    expect(blocks[2]?.kind).toBe('fixed');
  });

  it('un párrafo que solo contiene un Paso en línea es texto con ese paso', () => {
    const body = '\n<Paso n={2}>Hola **mundo**</Paso>\n\nOtro.\n';
    const { blocks } = blocksOf(body);
    expect(blocks[0]).toMatchObject({
      kind: 'text',
      step: 2,
      summary: 'Hola mundo',
    });
    expect(blocks[0]?.paso?.inline).toBe(true);
    expect(body.slice(blocks[0]?.start, blocks[0]?.end)).toBe('Hola **mundo**');
    expect(applied(setBlockStep(body, 0, 1)).body).toBe(
      '\n<Paso n={1}>Hola **mundo**</Paso>\n\nOtro.\n',
    );
    expect(applied(setBlockStep(body, 0, 0)).body).toBe(
      '\nHola **mundo**\n\nOtro.\n',
    );
  });

  it('los atributos de Composicion forman un bloque fijo «Mascota» y el contenido va aparte', () => {
    const body =
      '\n<Composicion plantilla="sutil-metacognicion" nota="Hola">\nTexto.\n</Composicion>\n';
    const { blocks, containers } = blocksOf(body);
    expect(blocks.map((b) => [b.label, b.container])).toEqual([
      ['Mascota', 'root'],
      ['Texto', 'composicion'],
    ]);
    expect(blocks[0] && isMascotBlock(blocks[0])).toBe(true);
    expect(blocks[0]?.fields.map((f) => f.label)).toEqual([
      'Plantilla de mascota',
      'Nota de la mascota',
    ]);
    expect(containers.map((c) => c.id)).toEqual(['root', 'composicion']);
    expect(removeBlock(body, 0).ok).toBe(false);
    expect(moveBlock(body, 0, 1).ok).toBe(false);
  });

  it('las láminas que no entiende quedan en solo lectura con el motivo', () => {
    const cases: [string, RegExp][] = [
      [
        '<Paso n={1}>\n<Paso n={2}>\nx\n</Paso>\n</Paso>\n',
        /dentro de otro Paso/,
      ],
      ['Vale {1 + 1} puntos.\n', /expresión/],
      ['{props.x}\n', /expresión/],
      ['import x from "y"\n\nHola\n', /import/],
      ['<Paso n={k}>\nHola\n</Paso>\n', /numérico literal/],
      ['<Tarjeta titulo="x"\n', /No se pudo leer/],
    ];
    for (const [body, reason] of cases) {
      const model = extractBlocks(body);
      expect(model.ok, body).toBe(false);
      if (!model.ok) expect(model.reason, body).toMatch(reason);
    }
  });
});

describe('operaciones sobre bloques', () => {
  const body = lines(
    '',
    '<Definicion titulo="A">',
    'Uno.',
    '</Definicion>',
    '',
    '<Paso n={1}>',
    'Dos.',
    '',
    '$$',
    'x=1',
    '$$',
    '</Paso>',
    '',
    '<Paso n={2}>',
    '<Tarjeta titulo="T">',
    'Tres.',
    '</Tarjeta>',
    '</Paso>',
    '',
  );

  it('escribe un campo sin tocar lo demás', () => {
    const { blocks } = blocksOf(body);
    const field = blocks[0]?.fields[0];
    if (field?.kind !== 'attr') throw new Error('Falta el título');
    expect(applied(writeField(body, field, 'Nuevo')).body).toBe(
      body.replace('"A"', '"Nuevo"'),
    );
    const tex = blocks[2]?.fields[0];
    if (tex?.kind !== 'text') throw new Error('Falta la fórmula');
    expect(tex.value).toBe('x=1');
    expect(applied(writeField(body, tex, 'x=2')).body).toBe(
      body.replace('x=1', 'x=2'),
    );
  });

  it('inserta después del bloque y en su paso', () => {
    const inside = applied(insertBlock(body, { after: 1 }, 1, 'Nuevo.'));
    expect(inside.body).toBe(body.replace('Dos.\n', 'Dos.\n\nNuevo.\n'));
    expect(inside.select).toBe(2);
    const wrapped = applied(insertBlock(body, { after: 0 }, 2, 'Nuevo.'));
    expect(wrapped.body).toContain(
      '</Definicion>\n\n<Paso n={2}>\nNuevo.\n</Paso>\n\n<Paso n={1}>',
    );
    const end = applied(insertBlock(body, { after: null }, 0, 'Final.'));
    expect(end.body).toBe(`${body}\nFinal.\n`);
    expect(blocksOf(end.body).blocks.at(-1)?.summary).toBe('Final.');
  });

  it('inserta en una lámina vacía y en una columna vacía', () => {
    expect(applied(insertBlock('\n', { after: null }, 0, 'Hola.')).body).toBe(
      '\nHola.\n',
    );
    expect(applied(insertBlock('', { after: null }, 1, 'Hola.')).body).toBe(
      '\n<Paso n={1}>\nHola.\n</Paso>\n',
    );
    const empty = '\n<Columnas>\n<div>\n</div>\n</Columnas>\n';
    expect(
      applied(
        insertBlock(
          empty,
          { after: null, container: 'columnas/0' },
          0,
          'Hola.',
        ),
      ).body,
    ).toBe('\n<Columnas>\n<div>\nHola.\n</div>\n</Columnas>\n');
  });

  it('quita el bloque con su Paso y la línea en blanco vecina', () => {
    expect(applied(removeBlock(body, 3)).body).toBe(
      lines(
        '',
        '<Definicion titulo="A">',
        'Uno.',
        '</Definicion>',
        '',
        '<Paso n={1}>',
        'Dos.',
        '',
        '$$',
        'x=1',
        '$$',
        '</Paso>',
        '',
      ),
    );
    // De un Paso compartido sale solo el bloque; el Paso sigue.
    expect(applied(removeBlock(body, 2)).body).toContain(
      '<Paso n={1}>\nDos.\n</Paso>',
    );
    expect(applied(removeBlock(body, 1)).body).toContain(
      '<Paso n={1}>\n$$\nx=1\n$$\n</Paso>',
    );
    expect(
      applied(removeBlock(body, 0)).body.startsWith('\n<Paso n={1}>'),
    ).toBe(true);
  });

  it('mueve conservando el paso y salta Pasos compartidos enteros', () => {
    const down = applied(moveBlock(body, 0, 1));
    expect(down.body.startsWith('\n<Paso n={1}>\nDos.')).toBe(true);
    expect(down.body).toContain(
      '</Paso>\n\n<Definicion titulo="A">\nUno.\n</Definicion>\n\n<Paso n={2}>',
    );
    expect(down.select).toBe(2);
    expect(applied(moveBlock(down.body, 2, -1)).body).toBe(body);
    // Dentro de un Paso compartido, los bloques se intercambian sin cambiar de paso.
    expect(applied(moveBlock(body, 1, 1)).body).toContain(
      '<Paso n={1}>\n$$\nx=1\n$$\n\nDos.\n</Paso>',
    );
    // En el borde de su Paso compartido no sale de él.
    expect(moveBlock(body, 2, 1).ok).toBe(false);
    expect(moveBlock(body, 0, -1).ok).toBe(false);
  });

  it('cambia el paso: solo n, envuelve, desenvuelve o parte el Paso compartido', () => {
    expect(applied(setBlockStep(body, 3, 1)).body).toBe(
      body.replace('<Paso n={2}>', '<Paso n={1}>'),
    );
    const wrapped = applied(setBlockStep(body, 0, 2));
    expect(
      wrapped.body.startsWith(
        '\n<Paso n={2}>\n<Definicion titulo="A">\nUno.\n</Definicion>\n</Paso>\n',
      ),
    ).toBe(true);
    expect(applied(setBlockStep(wrapped.body, 0, 0)).body).toBe(body);
    expect(
      applied(setBlockStep(body, 3, 0)).body.endsWith(
        '\n<Tarjeta titulo="T">\nTres.\n</Tarjeta>\n',
      ),
    ).toBe(true);
    const split = applied(setBlockStep(body, 2, 0));
    expect(split.body).toContain(
      '<Paso n={1}>\nDos.\n</Paso>\n\n$$\nx=1\n$$\n\n<Paso n={2}>',
    );
    expect(blocksOf(split.body).blocks.map((b) => b.step)).toEqual([
      0, 1, 0, 2,
    ]);
    expect(applied(setBlockStep(body, 0, 0)).body).toBe(body);
    expect(setBlockStep(body, 0, 13).ok).toBe(false);
  });

  it('agrega y quita pasos renumerando los siguientes', () => {
    expect(applied(addStep(body, 2))).toMatchObject({ body, steps: 3 });
    expect(addStep(body, 12).ok).toBe(false);
    const two = applied(removeStep(body, 2, 2));
    expect(two.steps).toBe(1);
    expect(blocksOf(two.body).blocks.map((b) => b.step)).toEqual([0, 1, 1, 1]);
    const one = applied(removeStep(body, 1, 2));
    expect(one.steps).toBe(1);
    expect(one.body).toBe(
      lines(
        '',
        '<Definicion titulo="A">',
        'Uno.',
        '</Definicion>',
        '',
        'Dos.',
        '',
        '$$',
        'x=1',
        '$$',
        '',
        '<Paso n={1}>',
        '<Tarjeta titulo="T">',
        'Tres.',
        '</Tarjeta>',
        '</Paso>',
        '',
      ),
    );
    expect(usedSteps(body)).toEqual([1, 2]);
  });

  it('renumera también los atributos paso de los componentes', () => {
    const table = lines(
      '',
      '<TablaLectura encabezados="a|b|c">',
      '<FilaLectura nombre="x" rasgo="y" paso={2} />',
      '<FilaLectura nombre="z" rasgo="w" paso={3} />',
      '</TablaLectura>',
      '',
    );
    expect(applied(removeStep(table, 2, 3)).body).toBe(
      table.replace('paso={2}', 'paso={1}').replace('paso={3}', 'paso={2}'),
    );
    expect(removeStep(table.replace('paso={2}', 'paso={1}'), 1, 3).ok).toBe(
      false,
    );
  });

  it('no duplica una mascota', () => {
    const mascot =
      '\n<MascotaProfePina pose={45} nivel="marca" ubicacion="lateral-derecha" alt="Hola" />\n';
    expect(duplicateBlock(mascot, 0).ok).toBe(false);
  });
});

/**
 * Quitar lo agregado deja el MDX igual byte a byte; la excepción es cuando se agregó una línea
 * en blanco de más para no fundir un párrafo con la línea pegada que lo seguía: entonces solo
 * cambia el espacio entre bloques.
 */
function expectUndone(actual: string, original: string, where: string) {
  if (actual === original) return;
  const squash = (text: string) => text.replace(/\n{2,}/g, '\n');
  expect(squash(actual), where).toBe(squash(original));
  const summary = (text: string) =>
    blocksOf(text).blocks.map((b) => [b.summary, b.step]);
  expect(summary(actual), where).toEqual(summary(original));
}

describe('operaciones sobre las láminas del repositorio', () => {
  /** Hasta tres bloques por lámina (primero, del medio y último) que no son la mascota. */
  const picks = (blocks: Block[]) => {
    const own = blocks.filter((b) => !isMascotBlock(b));
    return [
      ...new Set([
        own[0],
        own[Math.floor(own.length / 2)],
        own[own.length - 1],
      ]),
    ].flatMap((b) => (b ? [b] : []));
  };

  it('cada operación seguida de su inversa devuelve el MDX byte a byte, sin tocar el resto', () => {
    let checked = 0;
    for (const { slide, body } of everySlide) {
      const { blocks } = blocksOf(body);
      for (const block of picks(blocks)) {
        const where = `${slide.id} #${block.index} ${block.label}`;
        const unit =
          block.paso && !block.paso.shared
            ? { start: block.paso.start, end: block.paso.end }
            : { start: block.start, end: block.end };

        // Duplicar y quitar la copia.
        if (block.component !== 'MascotaProfePina') {
          const dup = duplicateBlock(body, block.index);
          if (!dup.ok) {
            // Una lista copiada justo después de sí misma se fundiría con la original.
            expect(dup.reason, where).toMatch(/fundiría/);
            expect(body.slice(block.start, block.end), where).toMatch(
              /^(\d+\.|[-*]) /,
            );
          } else {
            expect(dup.body.slice(0, unit.end), where).toBe(
              body.slice(0, unit.end),
            );
            expect(dup.body.endsWith(body.slice(unit.end)), where).toBe(true);
            expectUndone(
              applied(removeBlock(dup.body, dup.select ?? -1)).body,
              body,
              where,
            );
          }
        }

        // Insertar un bloque nuevo a continuación (en su paso) y quitarlo.
        const inserted = applied(
          insertBlock(body, { after: block.index }, block.step, 'Nuevo $x$.'),
        );
        expect(inserted.body.slice(0, block.end), where).toBe(
          body.slice(0, block.end),
        );
        expectUndone(
          applied(removeBlock(inserted.body, inserted.select ?? -1)).body,
          body,
          where,
        );

        // Mover y volver.
        for (const direction of [1, -1] as const) {
          const moved = moveBlock(body, block.index, direction);
          if (!moved.ok) continue;
          expect(blocksOf(moved.body).blocks.length, where).toBe(blocks.length);
          expect(
            applied(
              moveBlock(
                moved.body,
                moved.select ?? -1,
                direction === 1 ? -1 : 1,
              ),
            ).body,
            where,
          ).toBe(body);
        }

        // Cambiar de paso y volver (cuando el Paso es propio del bloque).
        if (!block.inherited && !block.paso?.shared && slide.steps > 0) {
          const other = block.step === 0 || block.step === 1 ? slide.steps : 1;
          if (other !== block.step) {
            const stepped = setBlockStep(body, block.index, other);
            // Un bloque con `<Paso>` propios no puede ir dentro de otro paso.
            if (!stepped.ok) {
              expect(body.slice(block.start, block.end), where).toMatch(
                /<Paso[\s>]/,
              );
              expect(stepped.reason, where).toMatch(/pasos propios/);
            } else
              expect(
                applied(
                  setBlockStep(stepped.body, stepped.select ?? -1, block.step),
                ).body,
                where,
              ).toBe(body);
          }
        }

        // Escribir un campo y restaurarlo.
        const field = block.fields.find(
          (f) => f.kind === 'text' || f.kind === 'attr',
        );
        if (field && (field.kind === 'text' || field.kind === 'attr')) {
          const edited = applied(writeField(body, field, `${field.value}!`));
          expect(edited.body.slice(0, field.start), where).toBe(
            body.slice(0, field.start),
          );
          const range = {
            start: field.start,
            end: field.start + field.value.length + 1,
          };
          expect(
            applied(writeField(edited.body, range, field.value)).body,
            where,
          ).toBe(body);
        }
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(500);
  }, 120_000);

  it('lo que producen las operaciones pasa las reglas de content:check', async () => {
    for (const { slide, body } of everySlide) {
      const first = picks(blocksOf(body).blocks)[0];
      if (!first) continue;
      const where = `${slide.id} #${first.index} ${first.label}`;
      expect(await problemOf(slide, body), `${slide.id} original`).toBeNull();
      const results: [string, BlockEdit][] = [
        [
          'insertar',
          insertBlock(body, { after: first.index }, first.step, 'Nuevo $x$.'),
        ],
        ['mover', moveBlock(body, first.index, 1)],
      ];
      if (first.component !== 'MascotaProfePina')
        results.push(['duplicar', duplicateBlock(body, first.index)]);
      for (const [name, edit] of results) {
        if (!edit.ok) continue;
        expect(
          await problemOf(slide, edit.body),
          `${where}: ${name}`,
        ).toBeNull();
      }
      if (!first.inherited && slide.steps > 0) {
        const edit = setBlockStep(body, first.index, slide.steps);
        if (edit.ok) {
          // Solo puede fallar porque el bloque era el único de su paso.
          const problem = await problemOf(slide, edit.body);
          if (problem)
            expect(problem, where).toMatch(/El paso \d+ no está definido/);
        }
      }
    }
  }, 120_000);
});
