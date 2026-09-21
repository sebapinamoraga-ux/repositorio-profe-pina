import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import mdx from '@mdx-js/rollup';
import frontmatter from 'remark-frontmatter';
import mdxFrontmatter from 'remark-mdx-frontmatter';
import math from 'remark-math';
import katex from 'rehype-katex';
import { resolve } from 'node:path';
import { contentPlugin } from './content-plugin.ts';
export default defineConfig({
  root: resolve('apps/presenter'),
  base: process.env.BASE_PATH || '/',
  plugins: [
    contentPlugin(),
    mdx({
      remarkPlugins: [frontmatter, mdxFrontmatter, math],
      rehypePlugins: [
        [katex, { strict: 'error', throwOnError: true, trust: false }],
      ],
    }),
    react(),
    tailwind(),
  ],
  server: { fs: { allow: [resolve('.')] }, port: 5173 },
  build: { outDir: resolve(process.env.AULA_OUT_DIR || 'dist'), emptyOutDir: true },
});
