import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProveedorSesion } from '@/lib/sesion';
import { ProveedorTema, usarTema } from '@/temas';

const clienteQuery = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export default function LayoutRaiz() {
  // ProveedorTema va por fuera: la barra de estado y el Stack toman sus
  // colores del tema, asi que tienen que leerlo desde dentro.
  return (
    <ProveedorTema>
      <SafeAreaProvider>
        <QueryClientProvider client={clienteQuery}>
          <ProveedorSesion>
            <Navegacion />
          </ProveedorSesion>
        </QueryClientProvider>
      </SafeAreaProvider>
    </ProveedorTema>
  );
}

function Navegacion() {
  const { tema, paleta } = usarTema();

  return (
    <>
      <StatusBar style={tema === 'oscuro' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: paleta.surface100 },
          headerTintColor: paleta.ink,
          headerTitleStyle: { fontWeight: '700' },
          contentStyle: { backgroundColor: paleta.surface100 },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="mascota/[id]" options={{ title: 'Mascota' }} />
      </Stack>
    </>
  );
}
