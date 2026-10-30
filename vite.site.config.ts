import { defineConfig } from 'vite';
import { resolve } from 'path';
import { readFileSync } from 'fs';

const pkg = JSON.parse(readFileSync(resolve(import.meta.dirname, 'package.json'), 'utf8'));

// Landing page script (GitHub Pages, docs/). The rest of docs/ is static and hand-written.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: 'docs/assets',
    emptyOutDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'site/demo.ts'),
      name: 'ChatSweepSite',
      formats: ['iife'],
      fileName: () => 'site.js',
    },
  },
});
