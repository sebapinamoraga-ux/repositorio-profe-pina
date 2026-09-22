import katex from 'katex';
import { describe, expect, it } from 'vitest';
import { katexOptions, katexTrust } from './katex-trust';

describe('extensiones pedagógicas de KaTeX', () => {
  it.each([1, 2, 3, 4])('autoriza el tono de asociación %s', (tone) => {
    expect(katexTrust({ command: '\\htmlClass', class: `asoc-${tone}` })).toBe(
      true,
    );
  });

  it('rechaza clases y extensiones fuera de la lista reservada', () => {
    expect(() =>
      katexTrust({ command: '\\htmlClass', class: 'asoc-5' }),
    ).toThrow('no autorizada');
    expect(() =>
      katexTrust({ command: '\\href', url: 'https://example.com' }),
    ).toThrow('no autorizada');
  });

  it('renderiza solo la clase pedagógica permitida', () => {
    expect(
      katex.renderToString('\\htmlClass{asoc-1}{2x}', katexOptions),
    ).toContain('asoc-1');
    expect(() =>
      katex.renderToString('\\htmlClass{otra}{2x}', katexOptions),
    ).toThrow('no autorizada');
    expect(() =>
      katex.renderToString('\\macroInexistente', katexOptions),
    ).toThrow();
  });
});
