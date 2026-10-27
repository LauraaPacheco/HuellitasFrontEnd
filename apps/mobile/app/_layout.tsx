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
          // iOS pone de texto del boton atras el titulo de la pantalla
          // anterior. Como principal va sin encabezado ni titulo, caia al
          // nombre de la carpeta y se leia "principal". 'minimal' deja solo
          // la flecha. Ojo: expo-router 57 trae su propia copia de
          // react-navigation con la API v7, asi que headerBackTitleVisible
          // (la de v6) no existe aqui aunque el paquete v6 este instalado.
          headerBackButtonDisplayMode: 'minimal',
        }}
      >
        <Stack.Screen name="principal" options={{ headerShown: false, title: 'Huellitas' }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="restablecer-contrasena" options={{ title: 'Nueva contraseña' }} />
        <Stack.Screen name="seguridad-cuenta" options={{ title: 'Seguridad de la cuenta' }} />
        <Stack.Screen name="datos-personales" options={{ title: 'Datos personales' }} />
        <Stack.Screen name="perfil-adoptante" options={{ title: 'Perfil de adoptante' }} />
        <Stack.Screen name="registro" options={{ title: 'Crear cuenta' }} />
        <Stack.Screen name="confirmar" options={{ title: 'Confirmar correo' }} />
        <Stack.Screen
          name="olvide-contrasena"
          options={{ title: 'Recuperar contraseña' }}
        />
        <Stack.Screen name="refugio/[refugioId]" options={{ title: 'Perfil del refugio' }} />
        <Stack.Screen name="postular/[mascotaId]" options={{ title: 'Solicitud de adopción' }} />
        <Stack.Screen name="mascota/[mascotaId]" options={{ title: 'Mascota' }} />
      </Stack>
    </>
  );
}
