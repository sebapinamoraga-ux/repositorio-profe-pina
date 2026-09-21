import { copyFile, mkdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parse } from 'yaml';
import { lessonSchema } from '../packages/content-model/src/index';
import { walk } from './content-check';

/** Copia a dist/pdf solo los PDF de clases publicadas; los borradores quedan fuera del sitio. */
await mkdir('dist/pdf', { recursive: true });
let copied = 0;
for (const file of await walk(resolve('content/lessons'))) {
  if (!file.endsWith('lesson.yaml')) continue;
  const lesson = lessonSchema.parse(parse(await readFile(file, 'utf8')));
  if (lesson.status !== 'published') {
    console.log(`Se omite el PDF de ${lesson.id}: la clase está en borrador.`);
    continue;
  }
  for (const extension of ['pdf', 'json']) {
    const source = `output/pdf/${lesson.id}.${extension}`;
    if (!existsSync(source)) throw new Error(`Falta ${source}.`);
    await copyFile(source, `dist/pdf/${lesson.id}.${extension}`);
  }
  copied++;
}
console.log(`PDF publicados en dist/pdf: ${copied}.`);
