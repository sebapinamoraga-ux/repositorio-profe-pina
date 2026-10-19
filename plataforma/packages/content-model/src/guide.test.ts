import { describe, expect, it } from 'vitest';
import {
  GUIDE_PENDING,
  formatGuide,
  guideTemplate,
  missingGuideSections,
  parseGuide,
} from './guide.ts';
import { checkContentFiles } from './check-content.ts';
import { readContentFiles } from './read-content.ts';

describe('guía pedagógica', () => {
  it('la plantilla trae los objetivos y deja por completar lo obligatorio', () => {
    const text = guideTemplate({
      title: 'Clase',
      objectives: ['Resolver sistemas.'],
      prerequisites: [],
    });
    expect(parseGuide(text).sections.get('Propósito')).toBe(
      '- Resolver sistemas.',
    );
    expect(parseGuide(text).sections.get('Evidencia')).toBe(GUIDE_PENDING);
    expect(missingGuideSections(text)).toEqual([
      'Evidencia',
      'Errores esperados',
    ]);
  });

  it('leer y volver a escribir una guía no la cambia', () => {
    const text = guideTemplate({ title: 'Clase', objectives: ['Uno.'] });
    expect(formatGuide(parseGuide(text))).toBe(text);
  });

  it('conserva los apartados propios al final', () => {
    const guide = parseGuide('# C\n\n## Notas\n\nAlgo propio.\n');
    expect(formatGuide(guide)).toMatch(
      /## Después de la clase\n\n_Por completar._\n\n## Notas\n\nAlgo propio.\n$/,
    );
  });
});

describe('organización por curso', async () => {
  const disk = await readContentFiles();
  const dir = 'contenido/cursos/competencia-matematica-3m/clases/sistemas-2x2';
  const only = (path: string) =>
    path.includes('sistemas-2x2') || path.endsWith('curso.yaml');

  it('una clase publicada con la guía por completar no pasa', async () => {
    const files = new Map(disk);
    files.set(`${dir}/guia.md`, guideTemplate({ title: 'Sistemas' }));
    const { problems } = await checkContentFiles(files, {
      shouldCompile: () => false,
    });
    expect(problems).toContainEqual({
      path: `${dir}/guia.md`,
      message: 'Completa en la guía: Propósito, Evidencia, Errores esperados.',
    });
  });

  it('la carpeta de una clase se llama como su identificador', async () => {
    const files = new Map(
      [...disk].map(([path, text]) => [
        path.replace('/clases/sistemas-2x2/', '/clases/sistemas/'),
        text,
      ]),
    );
    const { problems } = await checkContentFiles(files, {
      shouldCompile: () => false,
    });
    expect(problems.map((p) => p.message)).toContain(
      'La carpeta de la clase debe llamarse como su identificador (sistemas-2x2).',
    );
  });

  it('una clase vive en la carpeta del curso que la planifica', async () => {
    const files = new Map(
      [...disk].map(([path, text]) => [
        path.replace(
          'competencia-matematica-3m/clases/sistemas-2x2/',
          'otro/clases/sistemas-2x2/',
        ),
        text,
      ]),
    );
    const { problems } = await checkContentFiles(files, {
      shouldCompile: only,
    });
    expect(
      problems.some((p) =>
        p.message.startsWith('La biblioteca m1-2027 planifica esta clase'),
      ),
    ).toBe(true);
  });
});
