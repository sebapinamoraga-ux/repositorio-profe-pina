import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';
import {
  mascotTemplateMdx,
  lessonSchema,
} from '../packages/content-model/src/index';
import {
  GALLERY_PATH,
  SHARED_DIR,
  courseDir,
  lessonDirIn,
} from '../packages/content-model/src/content-files';
import { guideTemplate } from '../packages/content-model/src/guide';
import { parse, stringify } from 'yaml';
import {
  readContentBundle,
  repoPath,
} from '../packages/content-model/src/read-content';
const option = (name: string) => {
  const at = process.argv.indexOf(name);
  return at < 0 ? undefined : process.argv[at + 1];
};
const id = option('--id');
if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
  throw new Error('Usa --id identificador-en-minusculas');
/** Biblioteca en cuya carpeta se crea la clase (por defecto, el curso de 3° medio). */
const libraryId = option('--curso') ?? 'm1-2027';
const bundle = await readContentBundle();
if (!bundle.gallery) throw new Error(`Falta ${GALLERY_PATH}.`);
const library = bundle.plannings.find((item) => item.id === libraryId);
if (!library)
  console.warn(
    `No existe la biblioteca ${libraryId}: la clase se crea en ${courseDir(libraryId)}.`,
  );
const templateId = option('--plantilla');
const selected =
  templateId === undefined
    ? undefined
    : bundle.gallery.templates.find((template) => template.id === templateId);
if (templateId !== undefined && !selected)
  throw new Error(
    'Plantilla desconocida. Consulta los identificadores en la galería de mascotas.',
  );
const target = repoPath(lessonDirIn(library?.dir ?? courseDir(libraryId), id));
let exists = false;
try {
  await access(target);
  exists = true;
} catch {
  /* La carpeta aún no existe. */
}
if (exists) throw new Error('Ya existe una clase con ese identificador.');
await mkdir(join(target, 'laminas'), { recursive: true });
const read = (file: string) =>
  readFile(repoPath(SHARED_DIR, 'plantillas', file), 'utf8').then((text) =>
    text.replaceAll('LESSON_ID', id),
  );
const lesson = lessonSchema.parse(parse(await read('clase.yaml')));
let manifest = await read('clase.yaml');
if (selected) {
  lesson.slides.push(`${selected.id}.mdx`);
  manifest = stringify(lesson);
}
await writeFile(join(target, 'clase.yaml'), manifest, 'utf8');
await writeFile(join(target, 'guia.md'), guideTemplate(lesson), 'utf8');
await writeFile(
  join(target, 'laminas', 'portada.mdx'),
  await read('portada.mdx'),
  'utf8',
);
if (selected)
  await writeFile(
    join(target, 'laminas', `${selected.id}.mdx`),
    mascotTemplateMdx(selected),
    'utf8',
  );
console.log(`Clase creada como borrador: ${target}`);
