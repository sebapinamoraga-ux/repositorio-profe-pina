import { parse } from 'yaml';
import { slideSchema, type Slide } from './index.ts';

export function parseFrontmatter(text: string): unknown {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  if (lines[0] !== '---') throw new Error('Falta frontmatter');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('Frontmatter sin cierre');
  return parse(lines.slice(1, end).join('\n'));
}

/** Separa frontmatter y cuerpo sin tocar el texto del cuerpo, para poder reconstruir el archivo. */
export function splitSource(text: string): { slide: Slide; body: string } {
  const normalized = text.replaceAll('\r\n', '\n');
  const slide = slideSchema.parse(parseFrontmatter(normalized));
  const lines = normalized.split('\n');
  const end = lines.indexOf('---', 1);
  return { slide, body: lines.slice(end + 1).join('\n') };
}

/** Archivo MDX canónico de una lámina: content:check exige que el repositorio use esta forma. */
export function toMdx(slide: Slide & { body: string }): string {
  const quote = (text: string) => `'${text.replaceAll("'", "''")}'`;
  return [
    '---',
    `id: ${slide.id}`,
    `title: ${quote(slide.title)}`,
    `phase: ${slide.phase}`,
    `layout: ${slide.layout}`,
    `steps: ${slide.steps}`,
    `activities: [${slide.activities.join(', ')}]`,
    '---',
    slide.body,
  ].join('\n');
}
