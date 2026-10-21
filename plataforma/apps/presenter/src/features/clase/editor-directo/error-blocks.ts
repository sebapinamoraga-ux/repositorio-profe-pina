import { toMdx } from '../../../store/mdx';
import type { EditedSlide } from '../../../store/schema';
import type { Block } from '../editor/blocks';

/**
 * Bloque de cada fórmula con error de una lámina. El mensaje de la revisión dice la línea
 * («Fórmula inválida (línea 12): …»); se ubica contando desde el archivo completo de la lámina.
 * Otros errores no traen posición y quedan solo a nivel de lámina.
 */
export function formulaErrorBlocks(
  message: string | null,
  slide: EditedSlide,
  blocks: readonly Block[],
): Map<number, string> {
  const found = new Map<number, string>();
  if (!message) return found;
  const full = toMdx(slide);
  const bodyAt = full.lastIndexOf(slide.body);
  if (bodyAt < 0) return found;
  const lines = full.split('\n');
  for (const part of message.split('\n')) {
    const match = /^Fórmula inválida \(línea (\d+)\): ?(.*)$/.exec(part);
    if (!match) continue;
    const line = Number(match[1]) - 1;
    const lineStart = lines
      .slice(0, line)
      .reduce((sum, text) => sum + text.length + 1, 0);
    const lineEnd = lineStart + (lines[line]?.length ?? 0);
    const offsetStart = lineStart - bodyAt;
    const offsetEnd = lineEnd - bodyAt;
    const block = blocks.find(
      (b) => b.start <= offsetEnd && b.end >= offsetStart,
    );
    if (!block) continue;
    const reason = (match[2] ?? '')
      .replace(/^KaTeX parse error: /, '')
      .slice(0, 80);
    found.set(
      block.index,
      `Fórmula con un error${reason ? `: ${reason}` : ''}`,
    );
  }
  return found;
}
