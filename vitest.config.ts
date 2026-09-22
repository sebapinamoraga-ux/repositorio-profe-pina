import { defineConfig } from 'vitest/config';
import { contentPlugin } from './apps/presenter/content-plugin.ts';
export default defineConfig({
  plugins: [contentPlugin()],
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
