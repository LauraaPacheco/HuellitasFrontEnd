import { Tabs } from 'expo-router';
import { House, List, CircleAlert, UserRound } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usarPaleta } from '@/temas';

export default function LayoutPrincipal() {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: paleta.brandStrong,
        tabBarInactiveTintColor: paleta.inkMuted,
        tabBarStyle: {
          backgroundColor: paleta.surface100,
          borderTopColor: paleta.border,
          // Un alto fijo tapaba el indicador de inicio en los iPhone sin
          // boton: la barra tiene que crecer con el margen de abajo.
          height: 56 + margenes.bottom,
          paddingBottom: Math.max(margenes.bottom, 8),
        },
        headerStyle: { backgroundColor: paleta.surface100 },
        headerTintColor: paleta.ink,
      }}
    >
      <Tabs.Screen
        name="catalogo"
        options={{
          title: 'Inicio',
          tabBarIcon: ({ color }) => <House size={23} strokeWidth={1.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => <List size={23} strokeWidth={1.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="reportar"
        options={{
          title: 'Reportar',
          tabBarIcon: ({ color }) => <CircleAlert size={23} strokeWidth={1.8} color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <UserRound size={23} strokeWidth={1.8} color={color} />,
        }}
      />
    </Tabs>
  );
}
