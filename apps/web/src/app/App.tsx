import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { ProveedorSesion } from '@/modulos/autenticacion/ContextoSesion';
import { ProveedorTema } from '@/temas/ContextoTema';
import { rutas } from './rutas';

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: {
      // Los datos de refugios y mascotas cambian poco durante una sesion.
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function App() {
  return (
    <ProveedorTema>
      <QueryClientProvider client={clienteQuery}>
        <ProveedorSesion>
          <RouterProvider router={rutas} />
        </ProveedorSesion>
      </QueryClientProvider>
    </ProveedorTema>
  );
}
