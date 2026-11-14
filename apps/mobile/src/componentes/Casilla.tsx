import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * Casilla para aceptar algo (politica, compromiso). Como en la web: un
 * interruptor se lee como un ajuste, no como un acuerdo. El recuadro se
 * pone verde al marcarla.
 */
export function Casilla({
  marcada,
  alCambiar,
  texto,
  deshabilitado = false,
}: {
  readonly marcada: boolean;
  readonly alCambiar: (marcada: boolean) => void;
  readonly texto: string;
  readonly deshabilitado?: boolean;
}) {
  const paleta = usarPaleta();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcada, disabled: deshabilitado }}
      accessibilityLabel={texto}
      disabled={deshabilitado}
      onPress={() => alCambiar(!marcada)}
      style={({ pressed }) => [
        estilos.caja,
        {
          borderColor: marcada ? paleta.brand : paleta.border,
          backgroundColor: marcada ? paleta.brandTint : pressed ? paleta.surface200 : 'transparent',
          opacity: deshabilitado ? 0.6 : 1,
        },
      ]}
    >
      <View
        style={[
          estilos.casilla,
          { borderColor: marcada ? paleta.brandStrong : paleta.inkMuted, backgroundColor: marcada ? paleta.brandStrong : 'transparent' },
        ]}
      >
        {marcada && <Check size={16} strokeWidth={3} color={paleta.onBrand} />}
      </View>
      <Text style={[estilos.texto, { color: paleta.ink }]}>{texto}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  caja: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.s3, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md },
  casilla: { width: 22, height: 22, marginTop: 1, borderWidth: 2, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  texto: { flex: 1, fontSize: 14, lineHeight: 21 },
});
