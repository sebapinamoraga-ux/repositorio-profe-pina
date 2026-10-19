import { copyFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { readContentBundle } from '../packages/content-model/src/read-content';

/** Copia a dist/pdf solo los PDF de clases publicadas; los borradores quedan fuera del sitio. */
await mkdir('dist/pdf', { recursive: true });
let copied = 0;
for (const { meta: lesson } of (await readContentBundle()).lessons) {
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
