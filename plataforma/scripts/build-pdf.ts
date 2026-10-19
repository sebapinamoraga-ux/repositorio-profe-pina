import { resolve } from 'node:path';
import { build } from 'vite';
import { checkContent } from './content-check';
import { PDF_BUILD_DIR } from './build-dirs';

await checkContent();
process.env.AULA_INCLUDE_DRAFTS = '1';
process.env.AULA_OUT_DIR = PDF_BUILD_DIR;
await build({ configFile: resolve('apps/presenter/vite.config.ts') });
