import { describe, expect, it } from 'vitest';
import { lessonSources } from 'virtual:aula-sources';
import { splitSource } from '../store/mdx';
import { extractFields, spliceField } from './mdx-fields';
import { makeZip, readZip } from './zip';

const bodies = Object.values(lessonSources)
  .flat()
  .map(({ text }) => splitSource(text).body);

describe('campos editables del MDX', () => {
  it('cada rango corresponde exactamente a su valor en todas las láminas del repositorio', () => {
    for (const body of bodies) {
      for (const field of extractFields(body)) {
        if (field.kind === 'fixed') continue;
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
  it('los componentes con parámetros fijos no se editan como texto', () => {
    const fields = extractFields(
      '\n<MascotaProfePina pose={45} nivel="marca" ubicacion="lateral-derecha" alt="Hola" />\n',
    );
    expect(fields).toEqual([
      { kind: 'fixed', group: 'Mascota', label: 'Mascota', value: 'Pose 45 · Marca' },
    ]);
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
