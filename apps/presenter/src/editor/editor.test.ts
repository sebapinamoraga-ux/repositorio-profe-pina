import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { parseContentFiles } from '@aula/content-model/content-files';
import { readContentFiles } from '@aula/content-model/read-content';
import { INTERACTIVE_SPECS } from '@aula/content-model/interactive-params';
import { extractFields, setParam, spliceField } from './mdx-fields';
import { makeZip, readZip } from './zip';

/** El contenido del repositorio, leído como lo lee el build. */
const buildBundle = parseContentFiles(await readContentFiles(resolve('.')));

const bodies = buildBundle.lessons.flatMap((lesson) =>
  lesson.slides.map((slide) => slide.body),
);

describe('campos editables del MDX', () => {
  it('cada rango corresponde exactamente a su valor en todas las láminas del repositorio', () => {
    for (const body of bodies) {
      for (const field of extractFields(body)) {
        if (field.kind === 'fixed' || field.kind === 'params') continue;
        expect(body.slice(field.start, field.end)).toBe(field.value);
        expect(spliceField(body, field, field.value)).toBe(body);
      }
    }
  });
  it('editar un título solo cambia ese atributo', () => {
    const body = '\n<Objetivo titulo="Objetivo de clase">\n  Texto con $x+y=3$.\n</Objetivo>\n';
    const fields = extractFields(body);
    const title = fields.find((f) => f.kind === 'attr');
    const text = fields.find((f) => f.kind === 'text');
    if (title?.kind !== 'attr' || text?.kind !== 'text') throw new Error('Faltan campos');
    expect(title).toMatchObject({ group: 'Objetivo', label: 'Título' });
    expect(text.value).toBe('Texto con $x+y=3$.');
    expect(spliceField(body, title, 'Meta de hoy')).toBe(
      '\n<Objetivo titulo="Meta de hoy">\n  Texto con $x+y=3$.\n</Objetivo>\n',
    );
  });
  it('la mascota y los interactivos se editan como parámetros', () => {
    const body =
      '\n<MascotaProfePina pose={45} nivel="marca" ubicacion="lateral-derecha" alt="Hola" />\n';
    const [field] = extractFields(body);
    if (field?.kind !== 'params') throw new Error('Se esperaba un formulario de parámetros');
    expect(field.component).toBe('MascotaProfePina');
    expect(field.attrs.pose?.value).toBe(45);
    expect(setParam(body, field, 'pose', 46)).toBe(body.replace('{45}', '{46}'));
    expect(setParam(body, field, 'alt', 'Dice "hola"')).toContain(`alt={'Dice "hola"'}`);
  });

  it('todos los interactivos del repositorio se leen como parámetros y se reescriben igual', () => {
    let seen = 0;
    for (const body of bodies)
      for (const field of extractFields(body)) {
        if (field.kind === 'fixed')
          expect(INTERACTIVE_SPECS[field.label] ?? null, field.value).toBeNull();
        if (field.kind !== 'params') continue;
        seen++;
        for (const [name, attr] of Object.entries(field.attrs))
          expect(setParam(body, field, name, attr.value), `${field.component}.${name}`).toBe(body);
      }
    expect(seen).toBeGreaterThan(20);
  });

  it('agrega y quita atributos sin tocar el resto', () => {
    const body = '\n<GraficoFuncion tipo="afin" m={2} n={1} />\n';
    const [field] = extractFields(body);
    if (field?.kind !== 'params') throw new Error('Faltan parámetros');
    const added = setParam(body, field, 'puntosX', [0, 1]);
    expect(added).toBe('\n<GraficoFuncion tipo="afin" m={2} n={1} puntosX={[0, 1]} />\n');
    const [again] = extractFields(added);
    if (again?.kind !== 'params') throw new Error('Faltan parámetros');
    expect(setParam(added, again, 'm', undefined)).toBe(
      '\n<GraficoFuncion tipo="afin" n={1} puntosX={[0, 1]} />\n',
    );
  });
});

describe('ZIP de exportación', () => {
  it('conserva rutas y textos en UTF-8', () => {
    const files = [
      { path: 'clase/lesson.yaml', text: 'title: Función lineal\n' },
      { path: 'clase/slides/portada.mdx', text: '---\nid: portada\n---\n¿Qué es?\n' },
    ];
    const zip = makeZip(files);
    expect([...zip.slice(0, 4)]).toEqual([0x50, 0x4b, 0x03, 0x04]);
    expect(readZip(zip)).toEqual(files);
  });
});
