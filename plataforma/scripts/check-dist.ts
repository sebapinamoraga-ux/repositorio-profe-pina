import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { walk } from './content-check';
import { readContentBundle } from '../packages/content-model/src/read-content';

/** Falla si el sitio público contiene el manifiesto de una clase en borrador. */
const outDir = resolve(process.argv[2] ?? 'dist');
const drafts = (await readContentBundle()).lessons
  .map((lesson) => lesson.meta)
  .filter((lesson) => lesson.status === 'draft');
const leaks: string[] = [];
for (const file of await walk(outDir)) {
  if (!/\.(?:js|html|json|css)$/.test(file)) continue;
  const text = await readFile(file, 'utf8');
  for (const draft of drafts)
    if (text.includes(`"${draft.id}"`) || text.includes(draft.title))
      leaks.push(`${file}: contiene la clase en borrador ${draft.id}`);
}
if (leaks.length) {
  console.error(leaks.join('\n'));
  process.exitCode = 1;
} else {
  console.log(
    `Sitio público sin borradores (${drafts.length} clase(s) en borrador excluidas).`,
  );
}
