import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: { alias: {
    '@': fileURLToPath(new URL('./apps/web/src', import.meta.url)),
    '@huellitas/shared': fileURLToPath(new URL('./packages/shared/src/index.ts', import.meta.url)),
    'react-router-dom': fileURLToPath(new URL('./apps/web/node_modules/react-router-dom', import.meta.url)),
    react: fileURLToPath(new URL('./apps/web/node_modules/react', import.meta.url)),
    'react-dom': fileURLToPath(new URL('./apps/web/node_modules/react-dom', import.meta.url)),
  } },
  esbuild: { jsx: 'automatic' },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    environment: 'node',
    restoreMocks: true,
    unstubGlobals: true,
    coverage: {
      provider: 'v8',
      include: ['packages/shared/src/api/**/*.ts', 'packages/shared/src/utils/**/*.ts',
        'apps/web/src/componentes/ui/SelectorCatalogo/*.tsx', 'apps/web/src/modulos/autenticacion/RutaProtegida.tsx'],
      exclude: ['**/index.ts'],
      reporter: ['text', 'html'],
    },
  },
});
