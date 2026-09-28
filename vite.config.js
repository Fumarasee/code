import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the built site works from any sub-path (GitHub Pages, a folder, etc.)
  base: './',
  server: {
    open: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
