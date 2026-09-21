import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import {
  mascotGallerySchema,
  mascotTemplateMdx,
  lessonSchema,
} from '../packages/content-model/src/index';
import { parse, stringify } from 'yaml';
const index = process.argv.indexOf('--id');
const id = process.argv[index + 1];
if (index < 0 || !id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
  throw new Error('Usa --id identificador-en-minusculas');
const templateIndex = process.argv.indexOf('--plantilla');
const gallery = mascotGallerySchema.parse(
  JSON.parse(
    await readFile(resolve('content/galleries/mascot-presence.json'), 'utf8'),
  ),
);
const selected =
  templateIndex < 0
    ? undefined
    : gallery.templates.find(
        (template) => template.id === process.argv[templateIndex + 1],
      );
if (templateIndex >= 0 && !selected)
  throw new Error(
    'Plantilla desconocida. Consulta los identificadores en la galería de mascotas.',
  );
const target = resolve('content/lessons/m1/algebra', id);
let exists = false;
try {
  await access(target);
  exists = true;
} catch {
  /* La carpeta aún no existe. */
}
if (exists) throw new Error('Ya existe una clase con ese identificador.');
await mkdir(join(target, 'slides'), { recursive: true });
for (const [source, dest] of [
  ['lesson.yaml', 'lesson.yaml'],
  ['portada.mdx', 'slides/portada.mdx'],
]) {
  if (!source || !dest) continue;
  let content = (
    await readFile(resolve('templates', source), 'utf8')
  ).replaceAll('LESSON_ID', id);
  if (source === 'lesson.yaml' && selected) {
    const lesson = lessonSchema.parse(parse(content));
    lesson.slides.push(`${selected.id}.mdx`);
    content = stringify(lesson);
  }
  await writeFile(join(target, dest), content, 'utf8');
}
if (selected)
  await writeFile(
    join(target, 'slides', `${selected.id}.mdx`),
    mascotTemplateMdx(selected),
    'utf8',
  );
console.log(`Clase creada como borrador: ${target}`);
