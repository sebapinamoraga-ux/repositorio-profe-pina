import katex from 'katex';
import { katexOptions } from '@aula/content-model';

/** Una fórmula dentro de un texto: el rango del TeX, sin sus delimitadores `$`. */
export interface FormulaSpan {
  start: number;
  end: number;
  tex: string;
  display: boolean;
}

export interface FormulaIssue {
  span: FormulaSpan;
  /** Qué falló, en español. */
  message: string;
  /** El TeX partido en lo anterior, la parte errónea y lo posterior. */
  fragment: { before: string; bad: string; after: string };
  /** Una corrección que se comprobó que compila. */
  fix?: { label: string; replacement: string };
}

/** Comandos de uso habitual en las clases, para sugerir cuando uno está mal escrito. */
const COMMANDS = [
  'Rightarrow',
  'Leftarrow',
  'Leftrightarrow',
  'rightarrow',
  'leftarrow',
  'leftrightarrow',
  'frac',
  'dfrac',
  'sqrt',
  'cdot',
  'times',
  'div',
  'pm',
  'leq',
  'geq',
  'neq',
  'approx',
  'infty',
  'text',
  'textbf',
  'begin',
  'end',
  'hline',
  'left',
  'right',
  'ldots',
  'cdots',
  'quad',
  'qquad',
  'Delta',
  'delta',
  'alpha',
  'beta',
  'gamma',
  'pi',
  'theta',
  'lambda',
  'sum',
  'in',
  'notin',
  'cup',
  'cap',
  'subset',
  'mathbb',
  'mathrm',
  'overline',
  'underline',
  'ne',
  'le',
  'ge',
  'to',
  'boxed',
  'cancel',
  'color',
  'ce',
  'log',
  'sin',
  'cos',
  'tan',
  'lim',
  'vec',
  'hat',
  'bar',
];

function distance(a: string, b: string) {
  const row = Array.from({ length: b.length + 1 }, (_, k) => k);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0] ?? 0;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j] ?? 0;
      row[j] = Math.min(
        (row[j] ?? 0) + 1,
        (row[j - 1] ?? 0) + 1,
        previous + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      previous = current;
    }
  }
  return row[b.length] ?? 0;
}

/** Encuentra los `$…$` y `$$…$$` de un texto; `\$` es un peso, no una fórmula. */
export function findFormulas(text: string): FormulaSpan[] {
  const spans: FormulaSpan[] = [];
  let i = 0;
  while (i < text.length) {
    const char = text[i];
    if (char === '\\') {
      i += 2;
      continue;
    }
    if (char !== '$') {
      i++;
      continue;
    }
    const display = text.startsWith('$$', i);
    const open = display ? 2 : 1;
    let j = i + open;
    let close = -1;
    while (j < text.length) {
      if (text[j] === '\\') {
        j += 2;
        continue;
      }
      if (!display && text[j] === '\n' && text[j + 1] === '\n') break;
      if (display ? text.startsWith('$$', j) : text[j] === '$') {
        close = j;
        break;
      }
      j++;
    }
    if (close < 0) break;
    const tex = text.slice(i + open, close);
    if (tex.trim()) spans.push({ start: i + open, end: close, tex, display });
    i = close + open;
  }
  return spans;
}

function parseError(tex: string, display: boolean) {
  try {
    katex.renderToString(tex, { ...katexOptions, displayMode: display });
    return null;
  } catch (error) {
    if (!(error instanceof Error))
      return { message: String(error), position: 0, length: 1 };
    const info = error as Error & { position?: unknown; length?: unknown };
    return {
      message: error.message,
      position: typeof info.position === 'number' ? info.position : 0,
      length: typeof info.length === 'number' ? info.length : 1,
    };
  }
}

const compiles = (tex: string, display: boolean) =>
  parseError(tex, display) === null;

function describe(raw: string) {
  const clean = raw
    .replace(/^KaTeX parse error: /, '')
    .replace(/ at position \d+:[\s\S]*$/, '');
  const unknown = /^Undefined control sequence: (\\\S+)/.exec(clean);
  if (unknown)
    return {
      message: `Comando desconocido: ${unknown[1]}`,
      command: unknown[1] ?? null,
    };
  if (
    /Expected '\}', got 'EOF'|Unexpected end of input|Expected group after/.test(
      clean,
    )
  )
    return {
      message: 'Falta cerrar una llave o completar un argumento.',
      command: null,
    };
  if (/Expected 'EOF', got '\}'/.test(clean))
    return { message: 'Hay una llave } de más.', command: null };
  return { message: clean, command: null };
}

/** Revisa cada fórmula de un texto. Con `raw`, todo el texto es TeX (el de un bloque de fórmula). */
export function checkFormulas(
  text: string,
  options: { raw?: boolean } = {},
): FormulaIssue[] {
  const spans = options.raw
    ? text.trim()
      ? [{ start: 0, end: text.length, tex: text, display: true }]
      : []
    : findFormulas(text);
  const issues: FormulaIssue[] = [];
  for (const span of spans) {
    const error = parseError(span.tex, span.display);
    if (!error) continue;
    const { message, command } = describe(error.message);
    const position = Math.min(error.position, span.tex.length);
    const length = Math.max(1, command ? command.length : error.length);
    const issue: FormulaIssue = {
      span,
      message,
      fragment: {
        before: span.tex.slice(0, position),
        bad: span.tex.slice(position, position + length),
        after: span.tex.slice(position + length),
      },
    };
    // Solo se ofrece lo que se comprobó que compila.
    if (command) {
      const wrong = command.slice(1);
      const best = COMMANDS.map((name) => ({ name, d: distance(wrong, name) }))
        .filter(({ d }) => d > 0 && d <= 2)
        .sort((a, b) => a.d - b.d)[0];
      if (best) {
        const at = span.tex.indexOf(command, Math.max(0, position - 1));
        if (at >= 0) {
          const replacement = `${span.tex.slice(0, at)}\\${best.name}${span.tex.slice(at + command.length)}`;
          if (compiles(replacement, span.display))
            issue.fix = { label: `\\${best.name}`, replacement };
        }
      }
    } else if (message.startsWith('Falta cerrar')) {
      const replacement = `${span.tex}}`;
      if (compiles(replacement, span.display))
        issue.fix = { label: 'cerrar la llave', replacement };
    } else if (message.startsWith('Hay una llave')) {
      const at = span.tex.lastIndexOf('}', position);
      if (at >= 0) {
        const replacement = span.tex.slice(0, at) + span.tex.slice(at + 1);
        if (compiles(replacement, span.display))
          issue.fix = { label: 'quitar la llave', replacement };
      }
    }
    issues.push(issue);
  }
  return issues;
}

/** Aplica la corrección de un error al texto del que salió. */
export function applyFormulaFix(text: string, issue: FormulaIssue): string {
  if (!issue.fix) return text;
  return (
    text.slice(0, issue.span.start) +
    issue.fix.replacement +
    text.slice(issue.span.end)
  );
}
