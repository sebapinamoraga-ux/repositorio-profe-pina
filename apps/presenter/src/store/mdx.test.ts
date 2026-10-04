import { describe, expect, it } from 'vitest';
import { resolve } from 'node:path';
import { parseContentFiles } from '@aula/content-model/content-files';
import { readContentFiles } from '@aula/content-model/read-content';
import { mascotGallery } from '../app/gallery';
import { skeleton, splitSource, toMdx } from './mdx';

/** El contenido del repositorio, leído como lo lee el build. */
const buildBundle = parseContentFiles(await readContentFiles(resolve('.')));

describe('MDX de las láminas', () => {
  it('separar y volver a escribir reproduce cada archivo del repositorio', () => {
    const files = buildBundle.lessons.flatMap((lesson) => lesson.slides);
    expect(files.length).toBeGreaterThan(20);
    for (const { text } of files) {
      const { slide, body } = splitSource(text);
      expect(toMdx({ ...slide, body })).toBe(text);
    }
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
});
