import { Tabs } from 'expo-router';
import { House, List, CircleAlert, UserRound, type LucideIcon } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import { BarraPestanas } from '@/componentes/BarraPestanas';
import { BotonTema } from '@/componentes/BotonTema';
import { espaciado, usarPaleta } from '@/temas';

/**
 * Titulo de cada pestana con el icono de su seccion en un cuadro verde
 * suave, igual que el encabezado de la web en celular.
 */
function TituloSeccion({ icono: Icono, titulo }: { readonly icono: LucideIcon; readonly titulo: string }) {
  const paleta = usarPaleta();
  return (
    <View style={estilos.titulo} accessibilityRole="header">
      <View style={[estilos.chip, { backgroundColor: paleta.brandTint }]}>
        <Icono size={18} strokeWidth={1.75} color={paleta.brandStrong} />
      </View>
      <Text numberOfLines={1} style={[estilos.texto, { color: paleta.ink }]}>{titulo}</Text>
    </View>
  );
}

const PESTANAS: readonly { nombre: string; titulo: string; icono: LucideIcon }[] = [
  { nombre: 'catalogo', titulo: 'Inicio', icono: House },
  { nombre: 'solicitudes', titulo: 'Solicitudes', icono: List },
  { nombre: 'reportar', titulo: 'Reportar', icono: CircleAlert },
  { nombre: 'perfil', titulo: 'Perfil', icono: UserRound },
];

export default function LayoutPrincipal() {
  const paleta = usarPaleta();

  return (
    <Tabs
      tabBar={(props) => <BarraPestanas {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: paleta.surface100 },
        // El fondo por defecto de la navegacion es gris claro y se asomaba
        // como una linea entre el encabezado, el contenido y la barra.
        sceneStyle: { backgroundColor: paleta.surface100 },
        // Sin linea bajo el titulo: lo separa el espacio, como en la web.
        headerShadowVisible: false,
        headerTitleAlign: 'left',
        headerTintColor: paleta.ink,
        // El tema a la vista en todas las pestañas, como en la web (que lo
        // lleva junto a la cuenta en el menu), no solo en el login.
        headerRight: () => (
          <View style={estilos.derecha}>
            <BotonTema />
          </View>
        ),
      }}
    >
      {PESTANAS.map(({ nombre, titulo, icono: Icono }) => (
        <Tabs.Screen
          key={nombre}
          name={nombre}
          options={{
            title: titulo,
            headerTitle: () => <TituloSeccion icono={Icono} titulo={titulo} />,
            tabBarIcon: ({ color, focused }) => (
              <Icono size={focused ? 22 : 23} strokeWidth={focused ? 2 : 1.8} color={typeof color === 'string' ? color : paleta.ink} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

const estilos = StyleSheet.create({
  titulo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  derecha: { paddingRight: espaciado.s4 },
  chip: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  texto: { fontSize: 20, fontWeight: '700', letterSpacing: -0.2, flexShrink: 1 },
});
