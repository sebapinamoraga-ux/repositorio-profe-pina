import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import type { Planning } from '@aula/content-model';
import { parseContentFiles } from '@aula/content-model/content-files';
import { checkContentFiles } from '@aula/content-model/check-content';
import { readContentFiles } from '@aula/content-model/read-content';
import { mascotGallery } from '../app/gallery';
import { skeleton, slideFromTemplate } from '../store/mdx';
import {
  currentLesson,
  currentLessonIn,
  entriesIn,
  formatPlanDate,
  libraryOf,
  planningReducer,
  todayLessonIn,
  UNPLANNED_UNIT,
  unitsIn,
  type LibraryEntry,
} from './library';
import { migrateLegacy } from './migrate-v1';
import {
  copyLesson,
  createLesson,
  createLibrary,
  editableRepaso,
  editableSlides,
  findLesson,
  planningWrites,
  removeLessonFiles,
  writePlanning,
  writeLesson,
  writeRepaso,
  writeSlides,
  type FileWrite,
} from './ops';

const disk = await readContentFiles();
const bundle = parseContentFiles(disk);

function apply(
  files: ReadonlyMap<string, string>,
  writes: readonly FileWrite[],
) {
  const next = new Map(files);
  for (const write of writes)
    if (write.text === null) next.delete(write.path);
    else next.set(write.path, write.text);
  return next;
}

const NL = '\n';

const PLAN: Planning = {
  units: [
    {
      id: 'u1',
      title: 'Uno',
      lessons: [{ id: 'a' }, { id: 'b', title: 'Por preparar' }],
    },
    { id: 'u2', title: 'Dos', lessons: [{ id: 'c' }] },
  ],
};

describe('planificación', () => {
  it('mueve clases dentro y entre unidades, y quita unidades moviendo sus clases', () => {
    let plan = planningReducer(PLAN, {
      type: 'moveLesson',
      id: 'b',
      delta: -1,
    });
    expect(plan.units[0]?.lessons.map((l) => l.id)).toEqual(['b', 'a']);
    plan = planningReducer(plan, {
      type: 'setLessonUnit',
      id: 'a',
      unitId: 'u2',
    });
    expect(plan.units[1]?.lessons.map((l) => l.id)).toEqual(['c', 'a']);
    plan = planningReducer(plan, {
      type: 'removeUnit',
      id: 'u1',
      targetId: 'u2',
    });
    expect(plan.units.map((u) => u.id)).toEqual(['u2']);
    expect(plan.units[0]?.lessons.map((l) => l.id)).toEqual(['c', 'a', 'b']);
  });

  it('una clase sin planificar entra a una unidad al moverla', () => {
    const plan = planningReducer(PLAN, {
      type: 'setLessonUnit',
      id: 'z',
      unitId: 'u2',
    });
    expect(plan.units[1]?.lessons.map((l) => l.id)).toEqual(['c', 'z']);
  });

  it('las clases del repositorio sin planificar quedan en «Sin unidad»', () => {
    const files = new Map(
      [...disk].filter(([path]) => !path.startsWith('content/planning/')),
    );
    files.set('content/planning/m1-2027.yaml', 'units: []\n');
    const library = libraryOf(parseContentFiles(files));
    expect(library.units).toEqual([UNPLANNED_UNIT]);
    expect(library.entries.length).toBe(bundle.lessons.length);
  });

  it('la biblioteca del repositorio sigue la planificación y deduce el estado', () => {
    const library = libraryOf(bundle);
    const sistemas = library.entries.find((e) => e.id === 'sistemas-2x2');
    expect(sistemas).toMatchObject({
      status: 'lista',
      repoStatus: 'published',
    });
    expect(library.units.some((u) => u.id === UNPLANNED_UNIT.id)).toBe(false);
  });
});

describe('fecha planificada', () => {
  const entry = (id: string, date: string | null): LibraryEntry => ({
    id,
    libraryId: 'm1-2027',
    unitId: 'u1',
    title: id,
    objective: '',
    duration: 80,
    status: 'lista',
    repoStatus: 'published',
    date,
  });
  const plan = [
    entry('a', '2026-09-26'),
    entry('b', '2026-10-17'),
    entry('c', null),
    entry('d', '2026-10-24'),
  ];

  it('la clase actual es la de hoy, si no la próxima, y sin fechas por delante la última abierta', () => {
    expect(currentLesson(plan, '2026-10-17', 'c')).toEqual({
      id: 'b',
      reason: 'hoy',
      date: '2026-10-17',
    });
    expect(currentLesson(plan, '2026-10-12', 'c')).toEqual({
      id: 'b',
      reason: 'proxima',
      date: '2026-10-17',
    });
    expect(currentLesson(plan, '2026-10-18', 'a')).toMatchObject({
      id: 'd',
      reason: 'proxima',
    });
    expect(currentLesson(plan, '2026-12-01', 'c')).toEqual({
      id: 'c',
      reason: 'ultima',
      date: null,
    });
    expect(currentLesson([], '2026-12-01', 'c')).toBeNull();
  });

  it('la clase actual de un curso sale de su biblioteca y, sin ella, de todas', () => {
    const canal = { ...entry('e', '2026-10-31'), libraryId: 'canal' };
    const library = { libraries: [], units: [], entries: [...plan, canal] };
    expect(currentLessonIn(library, 'canal', '2026-10-12', 'c')).toMatchObject({
      id: 'e',
      reason: 'proxima',
    });
    expect(currentLessonIn(library, 'canal', '2026-12-01', 'c')).toMatchObject({
      id: 'e',
      reason: 'ultima',
    });
    expect(currentLessonIn(library, null, '2026-10-12', 'c')).toMatchObject({
      id: 'b',
    });
    expect(
      currentLessonIn(library, 'no-existe', '2026-10-12', 'c'),
    ).toMatchObject({ id: 'b' });
  });

  it('las fechas de publicación del canal no son la clase del día de los cursos', () => {
    const info = (id: string, calendario: 'clases' | 'publicacion') => ({
      id,
      title: id,
      path: `content/planning/${id}.yaml`,
      calendario,
    });
    const curso = plan.map((item) => ({ ...item, libraryId: 'curso' }));
    const video = { ...entry('v', '2026-10-20'), libraryId: 'canal' };
    const library = {
      libraries: [info('curso', 'clases'), info('canal', 'publicacion')],
      units: [],
      entries: [...curso, video],
    };
    // Entre dos clases del curso hay un video: la tarjeta global sigue con la clase del 24.
    expect(currentLessonIn(library, null, '2026-10-18', 'c')).toMatchObject({
      id: 'd',
      reason: 'proxima',
    });
    expect(todayLessonIn(library, 'curso', '2026-10-18', 'c')).toMatchObject({
      id: 'd',
    });
    expect(todayLessonIn(library, null, '2026-10-20', 'c')).toMatchObject({
      id: 'd',
      reason: 'proxima',
    });
    // Sin clases por delante no aparece el video: queda la última clase abierta.
    expect(todayLessonIn(library, null, '2026-10-25', 'v')).toMatchObject({
      id: 'a',
      reason: 'ultima',
    });
    // Con el canal abierto, la tarjeta muestra su próxima publicación.
    expect(todayLessonIn(library, 'canal', '2026-10-18', 'c')).toMatchObject({
      id: 'v',
      reason: 'proxima',
    });
    // Un curso vinculado al canal lo eligió a propósito: ve sus fechas.
    expect(currentLessonIn(library, 'canal', '2026-10-18', 'c')).toMatchObject({
      id: 'v',
    });
  });

  it('las bibliotecas del canal del repositorio son de publicación y la del curso, de clases', () => {
    const library = libraryOf(bundle);
    const calendars = new Map(
      library.libraries.map((item) => [item.id, item.calendario]),
    );
    expect(calendars.get('m1-2027')).toBe('clases');
    for (const id of ['yt-m1', 'yt-m2', 'yt-fisica', 'yt-ia', 'yt-canal'])
      expect(calendars.get(id)).toBe('publicacion');
    // El 2026-11-05 el curso no tiene más clases y el canal sí tiene videos por delante.
    const current = todayLessonIn(
      library,
      null,
      '2026-11-05',
      'funcion-cuadratica-2',
    );
    expect(current).toMatchObject({
      id: 'funcion-cuadratica-2',
      reason: 'ultima',
    });
    expect(todayLessonIn(library, 'yt-m1', '2026-11-05', '')).toMatchObject({
      reason: 'proxima',
    });
  });

  it('marcar una biblioteca de publicación escribe una línea canónica y pasa content:check', async () => {
    const path = 'content/planning/m1-2027.yaml';
    const before = disk.get(path) ?? '';
    const [write] = planningWrites(bundle, disk, 'm1-2027', {
      type: 'addUnit',
      id: 'u-extra',
      title: 'Extra',
    });
    expect(write?.text).not.toMatch(/^calendario:/m);
    const canal = writePlanning(bundle, disk, 'm1-2027', {
      ...(bundle.plannings.find((item) => item.id === 'm1-2027')?.planning ?? {
        units: [],
      }),
      calendario: 'publicacion',
    });
    const after = canal[0]?.text ?? '';
    const added = after
      .split(NL)
      .filter((line) => !before.split(NL).includes(line));
    expect(added).toEqual(['calendario: publicacion']);
    expect(after.indexOf('calendario:')).toBeGreaterThan(
      after.indexOf('title:'),
    );
    expect(after.indexOf('calendario:')).toBeLessThan(after.indexOf('units:'));
    const files = apply(disk, canal);
    // Editar la planificación conserva el calendario.
    const [kept] = planningWrites(parseContentFiles(files), files, 'm1-2027', {
      type: 'addUnit',
      id: 'u-extra',
      title: 'Extra',
    });
    expect(kept?.text).toContain('calendario: publicacion');
    const result = await checkContentFiles(files, {
      shouldCompile: () => false,
    });
    expect(result.problems).toEqual([]);
    const bad = new Map(files);
    bad.set(
      path,
      after.replace('calendario: publicacion', 'calendario: canal'),
    );
    expect(
      (await checkContentFiles(bad, { shouldCompile: () => false })).problems,
    ).not.toEqual([]);
  });

  it('se escribe en la planificación como una línea y se borra al vaciarla', () => {
    const path = 'content/planning/m1-2027.yaml';
    const before = disk.get(path) ?? '';
    const [write] = planningWrites(bundle, disk, 'm1-2027', {
      type: 'updateLesson',
      id: 'funcion-cuadratica-2',
      patch: { date: '2026-10-31' },
    });
    const after = write?.text ?? '';
    const added = after
      .split(NL)
      .filter((line) => !before.split(NL).includes(line));
    expect(added).toEqual(['        date: 2026-10-31']);
    const files = apply(disk, write ? [write] : []);
    expect(
      libraryOf(parseContentFiles(files)).entries.find(
        (e) => e.id === 'funcion-cuadratica-2',
      )?.date,
    ).toBe('2026-10-31');
    const [cleared] = planningWrites(
      parseContentFiles(files),
      files,
      'm1-2027',
      {
        type: 'updateLesson',
        id: 'funcion-cuadratica-2',
        patch: { date: undefined },
      },
    );
    expect(cleared?.text).not.toContain('2026-10-31');
  });

  it('se muestra con el día de la semana, sin correrse por la zona horaria', () => {
    expect(formatPlanDate('2026-10-17', 'long', 2026)).toBe(
      'sábado, 17 de octubre',
    );
  });

  it('la fecha lleva el año solo fuera del año en curso', () => {
    expect(formatPlanDate('2026-10-17', 'short', 2026)).toBe('sáb, 17 oct');
    expect(formatPlanDate('2027-03-03', 'short', 2026)).toBe('mié, 3 mar 2027');
    expect(formatPlanDate('2027-03-03', 'long', 2026)).toBe(
      'miércoles, 3 de marzo de 2027',
    );
  });
});

describe('láminas de repaso', () => {
  const REPASO = [
    'explorar-a-c',
    'comprueba-apertura',
    'explorar-b',
    'comprueba-b-vertice',
  ];

  it('se leen aparte de las de la clase', () => {
    const lesson = findLesson(bundle, 'funcion-cuadratica-2');
    if (!lesson) throw new Error('Falta la clase base');
    expect(lesson.repaso.map((file) => file.slide.id)).toEqual(REPASO);
    const ids = new Set(lesson.slides.map((file) => file.slide.id));
    expect(REPASO.filter((id) => ids.has(id))).toEqual([]);
  });

  it('editar las láminas de la clase conserva el repaso', () => {
    const lesson = findLesson(bundle, 'funcion-cuadratica-2');
    if (!lesson) throw new Error('Falta la clase base');
    const files = apply(
      disk,
      writeSlides(
        bundle,
        'funcion-cuadratica-2',
        editableSlides(lesson).slice(1),
      ),
    );
    const meta = parse(files.get(lesson.path) ?? '') as { repaso: string[] };
    expect(meta.repaso).toEqual(REPASO.map((id) => `${id}.mdx`));
    for (const id of REPASO)
      expect(files.has(`${lesson.dir}/slides/${id}.mdx`)).toBe(true);
  });

  it('una lámina en la clase y en el repaso no pasa content:check', async () => {
    const lesson = findLesson(bundle, 'funcion-cuadratica-2');
    if (!lesson) throw new Error('Falta la clase base');
    const files = new Map(disk);
    files.set(lesson.path, `${lesson.text}  - apertura.mdx\n`);
    const result = await checkContentFiles(files, {
      shouldCompile: () => false,
    });
    expect(result.problems.map((p) => p.message)).toContain(
      'Archivo de diapositiva repetido (en slides o repaso).',
    );
  });
});

describe('edición del repaso desde la app', () => {
  const ID = 'funcion-cuadratica-2';
  const lesson = findLesson(bundle, ID);
  if (!lesson) throw new Error('Falta la clase base');
  const repaso = editableRepaso(lesson);
  const meta = (files: ReadonlyMap<string, string>) =>
    parse(files.get(lesson.path) ?? '') as {
      slides: string[];
      tramos: unknown;
      repaso?: string[];
    };
  const slidePathOf = (id: string) => `${lesson.dir}/slides/${id}.mdx`;
  const check = (files: ReadonlyMap<string, string>) =>
    checkContentFiles(files, {
      shouldCompile: (path) => path.startsWith(`${lesson.dir}/`),
    });

  it('cambiar el título de una lámina de repaso solo reescribe su archivo', () => {
    const [first, ...rest] = repaso;
    if (!first) throw new Error('Sin repaso');
    const writes = writeRepaso(bundle, ID, [
      { ...first, title: 'Título de prueba del repaso' },
      ...rest,
    ]);
    const changed = writes.filter((w) => disk.get(w.path) !== w.text);
    expect(changed.map((w) => w.path)).toEqual([slidePathOf(first.id)]);
  });

  it('reordenar, quitar y agregar láminas cambia solo `repaso` y pasa content:check', async () => {
    const [a, b, c, d] = repaso;
    const template = mascotGallery.templates[0];
    if (!a || !b || !c || !d || !template)
      throw new Error('Faltan datos de prueba');
    const nueva = slideFromTemplate(template, 'repaso-extra');
    const files = apply(disk, writeRepaso(bundle, ID, [c, a, nueva, d]));
    const before = meta(disk);
    const after = meta(files);
    expect(after.repaso).toEqual(
      [c.id, a.id, 'repaso-extra', d.id].map((id) => `${id}.mdx`),
    );
    expect(after.slides).toEqual(before.slides);
    expect(after.tramos).toEqual(before.tramos);
    expect(files.has(slidePathOf(b.id))).toBe(false);
    expect(files.has(slidePathOf('repaso-extra'))).toBe(true);
    const result = await check(files);
    expect(result.problems).toEqual([]);
    expect(
      findLesson(result.bundle, ID)?.repaso.map((f) => f.slide.id),
    ).toEqual([c.id, a.id, 'repaso-extra', d.id]);
  });

  it('quitar todo el repaso borra la clave y sus archivos, sin tocar la clase', async () => {
    const files = apply(disk, writeRepaso(bundle, ID, []));
    expect(meta(files)).not.toHaveProperty('repaso');
    expect((files.get(lesson.path) ?? '').split('\n')).toEqual(
      lesson.text
        .split('\n')
        .filter((line) => !/^repaso:|^ {2}- (explorar|comprueba)-/.test(line)),
    );
    for (const slide of repaso)
      expect(files.has(slidePathOf(slide.id))).toBe(false);
    for (const file of lesson.meta.slides)
      expect(files.has(`${lesson.dir}/slides/${file}`)).toBe(true);
    expect((await check(files)).problems).toEqual([]);
  });

  it('agregar un repaso a una clase sin él lo escribe al final de lesson.yaml', async () => {
    const sistemas = findLesson(bundle, 'sistemas-2x2');
    const template = mascotGallery.templates[0];
    if (!sistemas || !template) throw new Error('Falta la clase base');
    expect(sistemas.meta.repaso).toBeUndefined();
    const files = apply(
      disk,
      writeRepaso(bundle, 'sistemas-2x2', [
        slideFromTemplate(template, 'para-explorar'),
      ]),
    );
    const text = files.get(sistemas.path) ?? '';
    expect(text.startsWith(sistemas.text.trimEnd())).toBe(true);
    expect(text.endsWith('repaso:\n  - para-explorar.mdx\n')).toBe(true);
    const result = await checkContentFiles(files, {
      shouldCompile: (path) => path.includes('para-explorar'),
    });
    expect(result.problems).toEqual([]);
  });

  it('una lámina de repaso con el ID de una de la clase no pasa content:check', async () => {
    const [first, ...rest] = repaso;
    if (!first) throw new Error('Sin repaso');
    const files = apply(
      disk,
      writeRepaso(bundle, ID, [{ ...first, id: 'apertura' }, ...rest]),
    );
    const result = await check(files);
    expect(result.problems.map((p) => p.message)).toContain(
      'Archivo de diapositiva repetido (en slides o repaso).',
    );
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
    expect(changed.map((w) => w.path)).toEqual([
      `${lesson.dir}/slides/${first.id}.mdx`,
    ]);
  });

  it('quitar una lámina borra su archivo y la saca de lesson.yaml', () => {
    const lesson = findLesson(bundle, 'sistemas-2x2');
    if (!lesson) throw new Error('Falta la clase base');
    const slides = editableSlides(lesson);
    const files = apply(
      disk,
      writeSlides(bundle, 'sistemas-2x2', slides.slice(1)),
    );
    const meta = parse(files.get(lesson.path) ?? '') as { slides: string[] };
    expect(meta.slides).toHaveLength(slides.length - 1);
    expect(files.has(`${lesson.dir}/slides/${slides[0]?.id}.mdx`)).toBe(false);
  });

  it('cambiar un campo de lesson.yaml cambia una sola línea', () => {
    const lesson = findLesson(bundle, 'sistemas-2x2');
    if (!lesson) throw new Error('Falta la clase base');
    const [write] = writeLesson(bundle, 'sistemas-2x2', {
      title: 'Sistemas 2×2',
    });
    const before = lesson.text.split('\n');
    const after = (write?.text ?? '').split('\n');
    expect(after).toHaveLength(before.length);
    expect(after.filter((line, k) => line !== before[k])).toEqual([
      'title: Sistemas 2×2',
    ]);
  });

  it('una clase nueva pasa content:check y aparece en la planificación', async () => {
    const files = apply(disk, [
      ...createLesson(bundle, {
        id: 'clase-de-prueba',
        title: 'Clase de prueba',
        objective: 'Probar la creación desde la app.',
        slides: skeleton('Clase de prueba', mascotGallery.templates),
      }),
      ...planningWrites(bundle, disk, 'm1-2027', {
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
    expect(
      library.entries.find((e) => e.id === 'clase-de-prueba'),
    ).toMatchObject({
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
          'sistemas-2x2': slides.map((s, k) =>
            k === 0 ? { ...s, title: 'Editado' } : s,
          ),
        },
      },
      bundle,
      disk,
    );
    const changed = writes
      .filter((w) => disk.get(w.path) !== w.text)
      .map((w) => w.path);
    expect(changed).toContain(`${lesson.dir}/slides/${slides[0]?.id}.mdx`);
    const next = parseContentFiles(apply(disk, writes));
    const library = libraryOf(next);
    expect(library.units.map((u) => u.id)).toContain('u9');
    expect(
      library.entries.find((e) => e.id === 'solo-planificada'),
    ).toMatchObject({
      title: 'Idea para después',
      status: 'por-preparar',
    });
  });
});

describe('varias bibliotecas', () => {
  const youtube = createLibrary(bundle, disk, 'Canal de YouTube');
  const withYoutube = apply(disk, youtube.writes);

  it('cada archivo de content/planning es una biblioteca con su título', () => {
    expect(youtube.id).toBe('canal-de-youtube');
    const library = libraryOf(parseContentFiles(withYoutube));
    expect(library.libraries.map((item) => item.title)).toContain(
      'Canal de YouTube',
    );
    expect(
      unitsIn(library, youtube.id).every(
        (unit) => unit.libraryId !== 'm1-2027',
      ),
    ).toBe(true);
    expect(entriesIn(library, youtube.id)).toEqual([]);
  });

  it('una clase en dos bibliotecas no pasa la lectura del contenido', () => {
    const files = apply(
      withYoutube,
      planningWrites(
        parseContentFiles(withYoutube),
        withYoutube,
        youtube.id,
        { type: 'addUnit', id: 'u1', title: 'Funciones' },
        { type: 'addLesson', unitId: 'u1', lesson: { id: 'sistemas-2x2' } },
      ),
    );
    expect(
      parseContentFiles(files)
        .problems.map((p) => p.message)
        .join('\n'),
    ).toContain('ya está en la biblioteca');
  });

  it('las fechas solo chocan dentro de una misma biblioteca', () => {
    const files = apply(
      withYoutube,
      planningWrites(
        parseContentFiles(withYoutube),
        withYoutube,
        youtube.id,
        { type: 'addUnit', id: 'u1', title: 'Funciones' },
        {
          type: 'addLesson',
          unitId: 'u1',
          lesson: { id: 'otra', title: 'Otra', date: '2026-10-17' },
        },
      ),
    );
    expect(parseContentFiles(files).problems).toEqual([]);
  });

  it('copiar una clase a otra biblioteca lleva láminas y repaso, y pasa content:check', async () => {
    const source = findLesson(bundle, 'funcion-lineal-afin-2-cuadratica-1');
    const youtubeBundle = parseContentFiles(withYoutube);
    const copy = copyLesson(youtubeBundle, withYoutube, {
      id: 'funcion-lineal-afin-2-cuadratica-1',
      title: source?.meta.title ?? '',
      objective: source?.meta.objectives[0] ?? '',
      unitTitle: 'Funciones',
      libraryId: youtube.id,
      taken: new Set(bundle.lessons.map((lesson) => lesson.meta.id)),
    });
    expect(copy.id).toBe('funcion-lineal-afin-2-cuadratica-1-canal-de-youtube');
    const files = apply(withYoutube, copy.writes);
    const result = await checkContentFiles(files, {
      shouldCompile: (path) => path.includes(copy.id),
    });
    expect(result.problems).toEqual([]);
    const copied = findLesson(result.bundle, copy.id);
    expect(copied?.slides.length).toBe(source?.slides.length);
    expect(copied?.repaso.length).toBe(source?.repaso.length);
    const library = libraryOf(result.bundle);
    expect(library.entries.find((e) => e.id === copy.id)).toMatchObject({
      libraryId: youtube.id,
      status: 'en-preparacion',
    });
    expect(unitsIn(library, youtube.id).map((unit) => unit.title)).toContain(
      'Funciones',
    );
    // La original sigue en su biblioteca, sin cambios.
    expect(
      library.entries.find((e) => e.id === 'funcion-lineal-afin-2-cuadratica-1')
        ?.libraryId,
    ).toBe('m1-2027');
  });

  it('el título se conserva al editar la planificación', () => {
    const next = planningReducer(
      { title: 'Canal', units: [] },
      { type: 'addUnit', id: 'u1', title: 'Funciones' },
    );
    expect(next.title).toBe('Canal');
  });
});
