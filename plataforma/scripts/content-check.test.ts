import { expect, it } from 'vitest';
import { compileChecked } from './content-check';

it('rechaza una fórmula KaTeX inválida aunque el plugin solo emita un mensaje', async () => {
  await expect(
    compileChecked('$\\macroinexistente{x}$', () => {}),
  ).rejects.toThrow('Fórmula inválida');
});

it('acepta una fórmula KaTeX válida', async () => {
  await expect(compileChecked('$2x+3y=5$', () => {})).resolves.toBeUndefined();
});
