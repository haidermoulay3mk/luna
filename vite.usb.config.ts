// Built with help from Claude (Anthropic).
// USB build: `npm run build:usb` → dist-usb/index.html, one file with every script,
// style and font inlined, so it opens from file:// with no network.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  build: {
    outDir: 'dist-usb',
    emptyOutDir: true,
  },
});
