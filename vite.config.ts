import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  build: { outDir: '../dist', emptyOutDir: true },
  server: {
    port: 5174, // v2: свои порты, чтобы работать рядом со старой версией
    host: true, // чтобы открыть с телефона в той же Wi-Fi сети
    proxy: { '/api': 'http://localhost:3001' },
  },
});
