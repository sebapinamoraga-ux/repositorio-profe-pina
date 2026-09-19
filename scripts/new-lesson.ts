import { mkdir, readFile, writeFile, access } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const index = process.argv.indexOf('--id');
const id = process.argv[index + 1];
if (index < 0 || !id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id))
  throw new Error('Usa --id identificador-en-minusculas');
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
  const content = (
    await readFile(resolve('templates', source), 'utf8')
  ).replaceAll('LESSON_ID', id);
  await writeFile(join(target, dest), content, 'utf8');
}
console.log(`Clase creada como borrador: ${target}`);
