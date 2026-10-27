import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usarPaleta } from '@/temas';

/** Icono provisional: se reemplaza por el set de línea de 24px del sistema. */
function IconoTab({ simbolo, color }: { simbolo: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{simbolo}</Text>;
}

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
          tabBarIcon: ({ color }) => <IconoTab simbolo="⌂" color={color} />,
        }}
      />
      <Tabs.Screen
        name="solicitudes"
        options={{
          title: 'Solicitudes',
          tabBarIcon: ({ color }) => <IconoTab simbolo="☰" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reportar"
        options={{
          title: 'Reportar',
          tabBarIcon: ({ color }) => <IconoTab simbolo="◉" color={color} />,
        }}
      />
      <Tabs.Screen
        name="perfil"
        options={{
          title: 'Perfil',
          tabBarIcon: ({ color }) => <IconoTab simbolo="◯" color={color} />,
        }}
      />
    </Tabs>
  );
}
