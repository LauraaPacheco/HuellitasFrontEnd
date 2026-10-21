import { Pressable, StyleSheet, Text, View } from 'react-native';
import { espaciado, radios, usarPaleta } from '@/temas';

interface Props<T extends string | number | boolean> {
  etiqueta: string;
  opciones: readonly { valor: T; etiqueta: string }[];
  valor: T | null;
  alCambiar: (valor: T) => void;
  error?: string;
  deshabilitado?: boolean;
}

export function OpcionesPerfil<T extends string | number | boolean>({ etiqueta, opciones, valor, alCambiar, error, deshabilitado }: Props<T>) {
  const paleta = usarPaleta();
  return (
    <View style={{ gap: espaciado.s2 }}>
      <Text style={{ color: paleta.ink, fontSize: 14, fontWeight: '600' }}>{etiqueta}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={etiqueta} style={estilos.opciones}>
        {opciones.map(opcion => {
          const elegida = opcion.valor === valor;
          return (
            <Pressable key={String(opcion.valor)} accessibilityRole="radio"
              accessibilityState={{ checked: elegida, disabled: deshabilitado }}
              accessibilityLabel={`${etiqueta}: ${opcion.etiqueta}`}
              disabled={deshabilitado} onPress={() => alCambiar(opcion.valor)}
              style={[estilos.opcion, { borderColor: elegida ? paleta.brandStrong : paleta.border,
                backgroundColor: elegida ? paleta.brandTint : paleta.surface100 }]}>
              <Text style={{ color: paleta.ink, fontSize: 15 }}>
                {elegida ? '● ' : '○ '}{opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
    </View>
  );
}
const estilos = StyleSheet.create({
  opciones: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s2 },
  opcion: { minHeight: 44, justifyContent: 'center', paddingHorizontal: espaciado.s4, borderWidth: 1, borderRadius: radios.sm },
});
