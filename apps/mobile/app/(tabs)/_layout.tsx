import { Tabs } from 'expo-router';
import { Text, type ColorValue } from 'react-native';
import { usarPaleta } from '@/temas';

/** Icono provisional: se reemplaza por el set de línea de 24px del sistema. */
function IconoTab({ simbolo, color }: { simbolo: string; color: ColorValue }) {
  return <Text style={{ color, fontSize: 18 }}>{simbolo}</Text>;
}

export default function LayoutTabs() {
  const paleta = usarPaleta();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: paleta.brandStrong,
        tabBarInactiveTintColor: paleta.inkMuted,
        tabBarStyle: {
          backgroundColor: paleta.surface100,
          borderTopColor: paleta.border,
          height: 64,
          paddingBottom: 8,
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
