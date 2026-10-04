import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { LESSON_KEYS, patchYaml, stringifyYaml } from './yaml-patch';

async function yamlFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? yamlFiles(join(dir, entry.name))
          : Promise.resolve(entry.name.endsWith('.yaml') ? [join(dir, entry.name)] : []),
      ),
    )
  ).flat();
}

describe('patchYaml', () => {
  it('reescribir cada YAML del repositorio con su propio valor no cambia ningún byte', async () => {
    const files = await yamlFiles(resolve('content'));
    expect(files.length).toBeGreaterThan(5);
    for (const file of files) {
      const text = (await readFile(file, 'utf8')).replaceAll('\r\n', '\n');
      expect(patchYaml(text, parse(text)), file).toBe(text);
    }
  });

  it('cambiar un campo cambia una sola línea y conserva comentarios y estilo', () => {
    const text = [
      '# Comentario',
      'id: x',
      'title: Antes',
      'skills: [Modelar, Representar]',
      'status: draft',
      '',
    ].join('\n');
    const value = parse(text) as Record<string, unknown>;
    const next = patchYaml(text, { ...value, title: 'Después: con dos puntos' });
    expect(next).toBe(
      [
        '# Comentario',
        'id: x',
        "title: 'Después: con dos puntos'",
        'skills: [Modelar, Representar]',
        'status: draft',
        '',
      ].join('\n'),
    );
  });

  it('agrega claves nuevas en el orden del esquema y quita las ausentes', () => {
    const text = 'id: x\ntitle: T\nstatus: draft\nslides: [a.mdx]\n';
    const next = patchYaml(
      text,
      { id: 'x', title: 'T', duration: 80, slides: ['a.mdx', 'b.mdx'] },
      LESSON_KEYS,
    );
    expect(next).toBe('id: x\ntitle: T\nduration: 80\nslides: [a.mdx, b.mdx]\n');
  });

  it('stringifyYaml ordena las claves', () => {
    expect(stringifyYaml({ title: 'T', id: 'x' }, LESSON_KEYS)).toBe('id: x\ntitle: T\n');
  });
});
