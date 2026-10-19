import { defineConfig } from 'vitest/config';
import { contentPlugin } from './apps/presenter/content-plugin.ts';
import { repoRoot } from './packages/content-model/src/read-content.ts';
export default defineConfig({
  plugins: [contentPlugin()],
  // El contenido está fuera de plataforma/.
  server: { fs: { allow: [repoRoot()] } },
  test: {
    include: [
      'packages/**/*.test.ts',
      'apps/**/*.test.ts',
      'scripts/**/*.test.ts',
      'tests/**/*.test.tsx',
    ],
    environment: 'jsdom',
  },
});
