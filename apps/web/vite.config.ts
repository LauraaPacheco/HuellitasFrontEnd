import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@huellitas/shared': fileURLToPath(
        new URL('../../packages/shared/src/index.ts', import.meta.url),
      ),
    },
  },
  server: {
    port: 5173,
    proxy: {
      // Evita problemas de CORS en desarrollo: /api va al backend de .NET.
      '/api': {
        target: process.env.VITE_URL_API ?? 'https://localhost:7296',
        changeOrigin: true,
        secure: false,
      },
    },
  },
});
