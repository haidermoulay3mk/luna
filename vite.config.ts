// Built with help from Claude (Anthropic).
// Online build: `npm run build` → dist/ (deploy to GitHub Pages or Vercel).
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative paths so the build works on any host path (GitHub Pages subfolder, etc.).
  base: './',
  build: {
    outDir: 'dist',
    // three.js is most of the bundle (~1 MB, ~290 KB gzipped). Expected, so no warning below that.
    chunkSizeWarningLimit: 1500,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    // The full UI playthrough takes several seconds on slow or busy machines.
    testTimeout: 60000,
  },
});
