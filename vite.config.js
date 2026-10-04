import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative base so the built site works from any sub-path (GitHub Pages, a folder, etc.)
  base: './',
  // React support for .jsx files (with Fast Refresh in dev). See src/react/island.js.
  plugins: [react()],
  server: {
    open: true,
  },
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 900,
  },
});
