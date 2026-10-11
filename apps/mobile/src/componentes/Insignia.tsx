import { StyleSheet, Text, View } from 'react-native';
import type { DescriptorEstado } from '@huellitas/shared';
import { colorInsignia, espaciado, radios, usarTema } from '@/temas';

/** El estado siempre lleva su texto: el color nunca viaja solo. */
export function Insignia({ estado }: { readonly estado: DescriptorEstado }) {
  // Del contexto, no de useColorScheme: si el usuario forzo un tema, la
  // insignia tiene que seguirlo igual que el resto de la pantalla.
  const { tema } = usarTema();
  const { fondo, texto } = colorInsignia(estado.tono, tema);

  return (
    <View style={[estilos.contenedor, { backgroundColor: fondo }]}>
      <Text style={[estilos.texto, { color: texto }]}>{estado.etiqueta}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    height: 28,
    paddingHorizontal: espaciado.s3,
    borderRadius: radios.pill,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  texto: {
    fontSize: 12,
    fontWeight: '600',
  },
});
