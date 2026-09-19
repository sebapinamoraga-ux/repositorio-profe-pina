import { parse } from 'yaml';
export function parseFrontmatter(text: string): unknown {
  const lines = text.replaceAll('\r\n', '\n').split('\n');
  if (lines[0] !== '---') throw new Error('Falta frontmatter');
  const end = lines.indexOf('---', 1);
  if (end < 0) throw new Error('Frontmatter sin cierre');
  return parse(lines.slice(1, end).join('\n'));
}
