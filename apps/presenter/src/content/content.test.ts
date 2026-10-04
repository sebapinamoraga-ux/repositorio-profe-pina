import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { Planning } from '@aula/content-model';
import { parseContentFiles } from '@aula/content-model/content-files';
import { checkContentFiles } from '@aula/content-model/check-content';
import { readContentFiles } from '@aula/content-model/read-content';
import { resolve } from 'node:path';
import { mascotGallery } from '../app/gallery';
import { skeleton } from '../store/mdx';
import { libraryOf, planningReducer, UNPLANNED_UNIT } from './library';
import { migrateLegacy } from './migrate-v1';
import {
  createLesson,
  editableSlides,
  findLesson,
  planningWrites,
  removeLessonFiles,
  writeLesson,
  writeSlides,
  type FileWrite,
} from './ops';

const disk = await readContentFiles(resolve('.'));
const bundle = parseContentFiles(disk);

function apply(files: ReadonlyMap<string, string>, writes: readonly FileWrite[]) {
  const next = new Map(files);
  for (const write of writes)
    if (write.text === null) next.delete(write.path);
    else next.set(write.path, write.text);
  return next;
}

const PLAN: Planning = {
  units: [
    { id: 'u1', title: 'Uno', lessons: [{ id: 'a' }, { id: 'b', title: 'Por preparar' }] },
    { id: 'u2', title: 'Dos', lessons: [{ id: 'c' }] },
  ],
};

describe('planificación', () => {
  it('mueve clases dentro y entre unidades, y quita unidades moviendo sus clases', () => {
    let plan = planningReducer(PLAN, { type: 'moveLesson', id: 'b', delta: -1 });
    expect(plan.units[0]?.lessons.map((l) => l.id)).toEqual(['b', 'a']);
    plan = planningReducer(plan, { type: 'setLessonUnit', id: 'a', unitId: 'u2' });
    expect(plan.units[1]?.lessons.map((l) => l.id)).toEqual(['c', 'a']);
    plan = planningReducer(plan, { type: 'removeUnit', id: 'u1', targetId: 'u2' });
    expect(plan.units.map((u) => u.id)).toEqual(['u2']);
    expect(plan.units[0]?.lessons.map((l) => l.id)).toEqual(['c', 'a', 'b']);
  });

  it('una clase sin planificar entra a una unidad al moverla', () => {
    const plan = planningReducer(PLAN, { type: 'setLessonUnit', id: 'z', unitId: 'u2' });
    expect(plan.units[1]?.lessons.map((l) => l.id)).toEqual(['c', 'z']);
  });

  it('las clases del repositorio sin planificar quedan en «Sin unidad»', () => {
    const files = new Map(disk);
    files.set('content/planning/m1-2027.yaml', 'units: []\n');
    const library = libraryOf(parseContentFiles(files));
    expect(library.units).toEqual([UNPLANNED_UNIT]);
    expect(library.entries.length).toBe(bundle.lessons.length);
  });

  it('la biblioteca del repositorio sigue la planificación y deduce el estado', () => {
    const library = libraryOf(bundle);
    const sistemas = library.entries.find((e) => e.id === 'sistemas-2x2');
    expect(sistemas).toMatchObject({ status: 'lista', repoStatus: 'published' });
    expect(library.units.some((u) => u.id === UNPLANNED_UNIT.id)).toBe(false);
  });
});

describe('operaciones sobre archivos', () => {
  it('cambiar el título de una lámina solo reescribe su archivo', () => {
    const lesson = findLesson(bundle, 'sistemas-2x2');
    if (!lesson) throw new Error('Falta la clase base');
    const slides = editableSlides(lesson);
    const first = slides[0];
    if (!first) throw new Error('Sin láminas');
    const writes = writeSlides(bundle, 'sistemas-2x2', [
      { ...first, title: 'Nuevo título' },
      ...slides.slice(1),
    ]);
    const changed = writes.filter((w) => disk.get(w.path) !== w.text);
    expect(changed.map((w) => w.path)).toEqual([`${lesson.dir}/slides/${first.id}.mdx`]);
  });

  it('quitar una lámina borra su archivo y la saca de lesson.yaml', () => {
    const lesson = findLesson(bundle, 'sistemas-2x2');
    if (!lesson) throw new Error('Falta la clase base');
    const slides = editableSlides(lesson);
    const files = apply(disk, writeSlides(bundle, 'sistemas-2x2', slides.slice(1)));
    const meta = parse(files.get(lesson.path) ?? '') as { slides: string[] };
    expect(meta.slides).toHaveLength(slides.length - 1);
    expect(files.has(`${lesson.dir}/slides/${slides[0]?.id}.mdx`)).toBe(false);
  });

  it('cambiar un campo de lesson.yaml cambia una sola línea', () => {
    const lesson = findLesson(bundle, 'sistemas-2x2');
    if (!lesson) throw new Error('Falta la clase base');
    const [write] = writeLesson(bundle, 'sistemas-2x2', { title: 'Sistemas 2×2' });
    const before = lesson.text.split('\n');
    const after = (write?.text ?? '').split('\n');
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, k) => line !== before[k])).toEqual(['title: Sistemas 2×2']);
  });

  it('una clase nueva pasa content:check y aparece en la planificación', async () => {
    const files = apply(disk, [
      ...createLesson(bundle, {
        id: 'clase-de-prueba',
        title: 'Clase de prueba',
        objective: 'Probar la creación desde la app.',
        slides: skeleton('Clase de prueba', mascotGallery.templates),
      }),
      ...planningWrites(bundle, disk, {
        type: 'addLesson',
        unitId: 'u2',
        lesson: { id: 'clase-de-prueba' },
      }),
    ]);
    const result = await checkContentFiles(files, {
      shouldCompile: (path) => path.includes('clase-de-prueba'),
    });
    expect(result.problems).toEqual([]);
    const library = libraryOf(result.bundle);
    expect(library.entries.find((e) => e.id === 'clase-de-prueba')).toMatchObject({
      unitId: 'u2',
      status: 'en-preparacion',
      repoStatus: 'draft',
    });
    const removed = parseContentFiles(
      apply(files, removeLessonFiles(result.bundle, files, 'clase-de-prueba')),
    );
    expect(findLesson(removed, 'clase-de-prueba')).toBeUndefined();
  });

  it('las ediciones de la etapa A se traen como cambios', () => {
    const lesson = findLesson(bundle, 'sistemas-2x2');
    if (!lesson) throw new Error('Falta la clase base');
    const slides = editableSlides(lesson);
    const writes = migrateLegacy(
      {
        units: [{ id: 'u9', title: 'Creadas aquí' }],
        library: [
          {
            id: 'sistemas-2x2',
            unitId: 'u3',
            title: '',
            objective: '',
            duration: 80,
            status: 'lista',
          },
          {
            id: 'solo-planificada',
            unitId: 'u9',
            title: 'Idea para después',
            objective: 'Algo',
            duration: 80,
            status: 'por-preparar',
            local: true,
          },
        ],
        edits: {
          'sistemas-2x2': slides.map((s, k) => (k === 0 ? { ...s, title: 'Editado' } : s)),
        },
      },
      bundle,
      disk,
    );
    const changed = writes.filter((w) => disk.get(w.path) !== w.text).map((w) => w.path);
    expect(changed).toContain(`${lesson.dir}/slides/${slides[0]?.id}.mdx`);
    const next = parseContentFiles(apply(disk, writes));
    const library = libraryOf(next);
    expect(library.units.map((u) => u.id)).toContain('u9');
    expect(library.entries.find((e) => e.id === 'solo-planificada')).toMatchObject({
      title: 'Idea para después',
      status: 'por-preparar',
    });
  });
});
