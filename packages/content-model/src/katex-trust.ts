import type { KatexOptions, StrictFunction, TrustContext } from 'katex';

const associationClass = /^asoc-[1-4]$/;

export function katexTrust(context: TrustContext): boolean {
  if (context.command === '\\htmlClass' && associationClass.test(context.class))
    return true;
  throw new Error(`Extensión HTML de KaTeX no autorizada: ${context.command}.`);
}

export const katexStrict: StrictFunction = (errorCode) =>
  errorCode === 'htmlExtension' ? 'ignore' : 'error';

export const katexOptions: KatexOptions = {
  throwOnError: true,
  strict: katexStrict,
  trust: katexTrust,
};
