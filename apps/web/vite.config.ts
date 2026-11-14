import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // loadEnv lee tambien las variables SIN prefijo VITE_, que a proposito
  // no llegan al navegador: el token del tunel se queda en este servidor.
  const directorioWeb = fileURLToPath(new URL('.', import.meta.url));
  const env = loadEnv(mode, directorioWeb, '');
  const destinoApi = env.URL_API_TUNEL || 'https://localhost:7296';
  const tokenTunel = env.TUNEL_TOKEN;

  return {
    envDir: directorioWeb,
    plugins: [react()],
    resolve: {
      // La web usa React 18; Expo usa React 19 en el mismo monorepo.
      dedupe: ['react', 'react-dom'],
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
            // Diagnóstico de desarrollo: muestra el backend real sin exponer el token.
            proxy.on('proxyRes', respuesta => {
              respuesta.headers['x-huellitas-api-target'] = new URL(destinoApi).origin;
            });
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
