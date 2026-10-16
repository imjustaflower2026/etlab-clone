import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  // Base public path when served in development or production
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        login: resolve(__dirname, 'login.html'),
        dashboard: resolve(__dirname, 'dashboard.html'),
        gatepass: resolve(__dirname, 'gatepass.html'),
        icons_preview: resolve(__dirname, 'icons_preview.html')
      }
    }
  },
  server: {
    port: 5173,
    open: true
  }
});
