import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // loadEnv lee tambien las variables SIN prefijo VITE_, que a proposito
  // no llegan al navegador: el token del tunel se queda en este servidor.
  const env = loadEnv(mode, process.cwd(), '');
  const destinoApi = env.URL_API_TUNEL || 'https://localhost:7296';
  const tokenTunel = env.TUNEL_TOKEN;

  return {
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
        /**
         * El navegador pide a /api de su mismo origen y Vite reenvia al
         * backend. No es cosmetico: el backend no tiene CORS configurado,
         * asi que una llamada directa desde el navegador la bloquearia el
         * propio navegador antes de salir.
         */
        '/api': {
          target: destinoApi,
          changeOrigin: true,
          secure: false,
          configure: (proxy) => {
            proxy.on('proxyReq', (peticion) => {
              // El tunel de desarrollo pide su propia cabecera, que no
              // tiene nada que ver con la sesion del usuario.
              if (tokenTunel) {
                peticion.setHeader('X-Tunnel-Authorization', `tunnel ${tokenTunel}`);
              }
            });
          },
        },
      },
    },
  };
});
