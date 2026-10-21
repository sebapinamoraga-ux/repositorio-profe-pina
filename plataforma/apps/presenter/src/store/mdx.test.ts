import { describe, expect, it } from 'vitest';
import { parseContentFiles } from '@aula/content-model/content-files';
import { readContentFiles } from '@aula/content-model/read-content';
import { mascotGallery } from '../app/gallery';
import { checkSlideSource } from '@aula/content-model/check-source';
import { extractBlocks } from '../features/clase/editor/blocks';
import { blankSlide, skeleton, splitSource, toMdx, type BlankLayout } from './mdx';

/** El contenido del repositorio, leído como lo lee el build. */
const buildBundle = parseContentFiles(await readContentFiles());

describe('MDX de las láminas', () => {
  it('separar y volver a escribir reproduce cada archivo del repositorio', () => {
    const files = buildBundle.lessons.flatMap((lesson) => lesson.slides);
    expect(files.length).toBeGreaterThan(20);
    for (const { text } of files) {
      const { slide, body } = splitSource(text);
      expect(toMdx({ ...slide, body })).toBe(text);
    }
  });
  it('las notas del orador viajan en el frontmatter y se reproducen igual', () => {
    const base = blankSlide('concepto', 'notas-prueba', 'Con notas');
    const notas = 'Preguntar: ¿por qué?\n"Cuidado" con el signo.';
    const text = toMdx({ ...base, notas });
    const parsed = splitSource(text);
    expect(parsed.slide.notas).toBe(notas);
    expect(toMdx({ ...parsed.slide, body: parsed.body })).toBe(text);
    expect(toMdx({ ...base, notas: '  ' })).not.toContain('notas:');
  });
  it('la estructura base tiene una lámina por momento y la portada lleva el título', () => {
    const slides = skeleton('Dominio y recorrido', mascotGallery.templates);
    expect(slides.map((s) => s.phase)).toEqual([
      'inicio',
      'activacion',
      'desarrollo',
      'practica',
      'cierre',
    ]);
    expect(slides[0]?.title).toBe('Dominio y recorrido');
    expect(new Set(slides.map((s) => s.id)).size).toBe(5);
  });
  it('cada lámina en blanco pasa content:check y se lee como bloques', async () => {
    const layouts: BlankLayout[] = ['portada', 'concepto', 'dos-columnas', 'resolucion', 'ejercicio'];
    const context = {
      templateIds: new Set(mascotGallery.templates.map((t) => t.id)),
      activityIds: new Set<string>(),
    };
    for (const layout of layouts) {
      const slide = blankSlide(layout, `nueva-${layout}`);
      expect(slide.layout).toBe(layout);
      const text = toMdx(slide);
      const { error } = await checkSlideSource(text, context);
      expect(error, layout).toBeNull();
      const { slide: parsed, body } = splitSource(text);
      expect(toMdx({ ...parsed, body }), layout).toBe(text);
      const model = extractBlocks(slide.body);
      expect(model.ok, layout).toBe(true);
      if (model.ok) {
        expect(model.blocks.length, layout).toBeGreaterThan(0);
        // Cada paso declarado tiene al menos un bloque que lo muestra.
        const shown = new Set(model.blocks.map((b) => b.step));
        for (let n = 1; n <= slide.steps; n++) expect(shown.has(n), `${layout} paso ${n}`).toBe(true);
      }
    }
    expect(blankSlide('resolucion', 'r').steps).toBe(2);
    expect(blankSlide('portada', 'p', 'Mi clase').title).toBe('Mi clase');
  });
});
