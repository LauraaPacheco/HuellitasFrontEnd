import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { espaciado, usarPaleta } from '@/temas';

interface Props {
  /** Qué se está cargando. Lo lee el lector de pantalla. */
  readonly mensaje?: string;
  /** En línea, para una carga pequeña dentro de un bloque. */
  readonly compacto?: boolean;
}

/**
 * Indicador de carga: el aro en el verde de la marca con el mensaje
 * debajo, centrado en el espacio que tendrá el contenido. Es el mismo
 * criterio de la web: nunca un texto suelto ni un aro sin explicación.
 */
export function EstadoCargando({ mensaje = 'Cargando…', compacto = false }: Props) {
  const paleta = usarPaleta();
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={mensaje}
      style={compacto ? estilos.compacto : estilos.pagina}
    >
      <ActivityIndicator size={compacto ? 'small' : 'large'} color={paleta.brandStrong} />
      <Text style={[compacto ? estilos.textoCompacto : estilos.texto, { color: paleta.inkMuted }]}>{mensaje}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  pagina: { flex: 1, minHeight: 240, alignItems: 'center', justifyContent: 'center', gap: espaciado.s3, padding: espaciado.s6 },
  compacto: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, paddingVertical: espaciado.s2 },
  texto: { fontSize: 15, textAlign: 'center' },
  textoCompacto: { fontSize: 14 },
});
