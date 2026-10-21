import { describe, expect, it } from 'vitest';
import { parseContentFiles } from '@aula/content-model/content-files';
import { readContentFiles } from '@aula/content-model/read-content';
import { extractBlocks } from '../editor/blocks';
import { applyFormulaFix, checkFormulas, findFormulas } from './formula-check';

describe('revisión local de fórmulas', () => {
  it('encuentra fórmulas en línea y centradas, y no confunde \\$ con una fórmula', () => {
    const text = 'Cuesta \\$2.000 y $x+1$ vale $$\n\\frac{a}{b}\n$$ listo.';
    const spans = findFormulas(text);
    expect(spans.map((s) => s.tex)).toEqual(['x+1', '\n\\frac{a}{b}\n']);
    expect(spans.map((s) => s.display)).toEqual([false, true]);
  });

  it('sin errores no avisa', () => {
    expect(checkFormulas('Vale $x^2+1$ y $\\frac{1}{2}$.')).toEqual([]);
    expect(checkFormulas('ax+by=c', { raw: true })).toEqual([]);
  });

  it('un comando mal escrito ofrece la corrección comprobada', () => {
    const text = 'Entonces $x=1 \\Rightarow y=2$ siempre.';
    const [issue] = checkFormulas(text);
    expect(issue?.message).toBe('Comando desconocido: \\Rightarow');
    expect(issue?.fragment.bad).toBe('\\Rightarow');
    expect(issue?.fix?.label).toBe('\\Rightarrow');
    expect(applyFormulaFix(text, issue as NonNullable<typeof issue>)).toBe(
      'Entonces $x=1 \\Rightarrow y=2$ siempre.',
    );
  });

  it('una llave sin cerrar o de más se explica y se corrige solo si compila', () => {
    const [open] = checkFormulas('$\\frac{1}{2$');
    expect(open?.message).toMatch(/Falta cerrar/);
    expect(open?.fix?.replacement).toBe('\\frac{1}{2}');
    const [extra] = checkFormulas('$x+1}$');
    expect(extra?.message).toBe('Hay una llave } de más.');
    expect(extra?.fix?.replacement).toBe('x+1');
    const [unknown] = checkFormulas('$\\zzzzzz$');
    expect(unknown?.fix).toBeUndefined();
  });

  it('las fórmulas de las láminas del repositorio no dan errores', async () => {
    const bundle = parseContentFiles(await readContentFiles());
    for (const lesson of bundle.lessons)
      for (const { slide, body } of [
        ...lesson.slides,
        ...(lesson.repaso ?? []),
      ]) {
        const model = extractBlocks(body);
        if (!model.ok) continue;
        for (const block of model.blocks)
          for (const field of block.fields) {
            if (field.kind !== 'text') continue;
            const issues = checkFormulas(field.value, {
              raw: block.kind === 'formula',
            });
            expect(
              issues.map((i) => i.message),
              `${slide.id} #${block.index}`,
            ).toEqual([]);
          }
      }
  });
});
