/** Clases de color de asociación que las fórmulas pueden usar con \htmlClass{asoc-N}{...}. */
export const associationClass = /^asoc-[1-5]$/;

/**
 * Política de confianza de KaTeX: solo \htmlClass con clases de asociación.
 * KaTeX deja sin aplicar los comandos no confiables sin avisar, así que aquí se lanza un
 * error para que content:check los detecte.
 */
export function katexTrust(context: {
  command: string;
  class?: string;
}): boolean {
  if (
    context.command === '\\htmlClass' &&
    associationClass.test(context.class ?? '')
  )
    return true;
  throw new Error(
    `Comando de KaTeX no permitido: ${context.command}${context.class ? ` con la clase «${context.class}»` : ''}. Solo se admite \\htmlClass con asoc-1 a asoc-5.`,
  );
}

/** Modo estricto salvo por la extensión HTML, que \htmlClass necesita y katexTrust restringe. */
export function katexStrict(errorCode: string): 'error' | 'ignore' {
  return errorCode === 'htmlExtension' ? 'ignore' : 'error';
}

/** Opciones de KaTeX compartidas por la compilación, content:check y las pruebas. */
export const katexOptions = {
  throwOnError: true,
  strict: katexStrict,
  trust: katexTrust,
} as const;
