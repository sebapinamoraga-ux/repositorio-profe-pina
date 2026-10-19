import { compile } from '@mdx-js/mdx';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMdxFrontmatter from 'remark-mdx-frontmatter';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { katexOptions } from './katex-trust';
import { parseFrontmatter } from './frontmatter';
import { slideSchema, type Slide } from './index';
import { validateMdxTree } from './validate-mdx';

/** rehype-katex registra fórmulas inválidas como mensajes; convertirlos en fallos evita publicarlas. */
export async function compileChecked(
  source: string,
  validate: (tree: unknown) => void,
) {
  const file = await compile(source, {
    remarkPlugins: [
      remarkFrontmatter,
      () => (tree: unknown) => validate(tree),
      remarkMdxFrontmatter,
      remarkMath,
    ],
    rehypePlugins: [[rehypeKatex, katexOptions]],
  });
  const formulas = file.messages.filter(
    (message) => message.source === 'rehype-katex',
  );
  if (formulas.length)
    throw new Error(
      formulas
        .map(
          (message) =>
            `Fórmula inválida${message.line ? ` (línea ${message.line})` : ''}: ${message.cause instanceof Error ? message.cause.message : message.reason}`,
        )
        .join('\n'),
    );
}

/** Reglas de texto que content:check aplica antes de compilar. */
export function checkSourceLines(text: string) {
  for (const line of text.split('\n'))
    if (line.includes('$$') && line.trim() !== '$$')
      throw new Error('Coloca cada delimitador $$ en su propia línea.');
}

export interface SlideCheckContext {
  templateIds: ReadonlySet<string>;
  activityIds: ReadonlySet<string>;
}

/**
 * Las mismas comprobaciones que content:check hace con cada archivo de diapositiva.
 * Devuelve el primer error como mensaje (content:check se detiene en él) o null.
 */
export async function checkSlideSource(
  text: string,
  context: SlideCheckContext,
): Promise<{ slide: Slide | null; error: string | null }> {
  let slide: Slide | null = null;
  try {
    checkSourceLines(text);
    slide = slideSchema.parse(parseFrontmatter(text));
    for (const ref of slide.activities)
      if (!context.activityIds.has(ref))
        throw new Error(`Actividad desconocida ${ref}`);
    const parsed = slide;
    await compileChecked(text, (tree) =>
      validateMdxTree(tree, parsed, context.templateIds),
    );
    return { slide, error: null };
  } catch (error) {
    return {
      slide,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
