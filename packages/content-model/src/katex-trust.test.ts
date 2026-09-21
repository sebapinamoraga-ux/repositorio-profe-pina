import { expect, it } from 'vitest';
import katex from 'katex';
import { katexOptions, katexTrust } from './katex-trust';

it('permite \\htmlClass con las clases de asociación 1 a 5', () => {
  for (const n of [1, 2, 3, 4, 5])
    expect(katexTrust({ command: '\\htmlClass', class: `asoc-${n}` })).toBe(
      true,
    );
});
it('rechaza cualquier otra clase o comando de confianza', () => {
  for (const context of [
    { command: '\\htmlClass', class: 'asoc-6' },
    { command: '\\htmlClass', class: 'otra' },
    { command: '\\htmlClass' },
    { command: '\\htmlId', class: 'asoc-1' },
    { command: '\\href' },
    { command: '\\url' },
    { command: '\\htmlStyle' },
  ])
    expect(() => katexTrust(context)).toThrow('no permitido');
});
it('KaTeX aplica la clase de asociación y rechaza el resto', () => {
  expect(
    katex.renderToString('\\htmlClass{asoc-2}{3y}', katexOptions),
  ).toContain('asoc-2');
  expect(() =>
    katex.renderToString('\\htmlClass{peligro}{3y}', katexOptions),
  ).toThrow('no permitido');
  expect(() =>
    katex.renderToString('\\href{https://ejemplo.cl}{x}', katexOptions),
  ).toThrow('no permitido');
});
it('mantiene el modo estricto para lo demás', () => {
  expect(() =>
    katex.renderToString('\\macroinexistente{x}', katexOptions),
  ).toThrow();
});
