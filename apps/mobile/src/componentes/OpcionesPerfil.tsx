import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { espaciado, radios, usarPaleta } from '@/temas';

interface Props<T extends string | number | boolean> {
  etiqueta: string;
  opciones: readonly { valor: T; etiqueta: string; icono?: LucideIcon }[];
  valor: T | null;
  alCambiar: (valor: T) => void;
  error?: string;
  deshabilitado?: boolean;
  /** Icono encima del texto: para etiquetas largas como "Apartamento". */
  apiladas?: boolean;
}

/**
 * Elegir una opcion entre pocas. Segmentos del mismo ancho, como los
 * filtros del catalogo: la elegida en verde suave con borde verde.
 */
export function OpcionesPerfil<T extends string | number | boolean>({ etiqueta, opciones, valor, alCambiar, error, deshabilitado, apiladas = false }: Props<T>) {
  const paleta = usarPaleta();
  return (
    <View style={{ gap: espaciado.s2 }}>
      <Text style={[estilos.etiqueta, { color: paleta.ink }]}>{etiqueta}</Text>
      <View
        accessibilityRole="radiogroup"
        accessibilityLabel={etiqueta}
        style={[estilos.grupo, { backgroundColor: paleta.surface100, borderColor: error ? paleta.danger : paleta.border }]}
      >
        {opciones.map((opcion) => {
          const elegida = opcion.valor === valor;
          const Icono = opcion.icono;
          return (
            <Pressable
              key={String(opcion.valor)}
              accessibilityRole="radio"
              accessibilityState={{ checked: elegida, disabled: deshabilitado }}
              accessibilityLabel={`${etiqueta}: ${opcion.etiqueta}`}
              disabled={deshabilitado}
              onPress={() => alCambiar(opcion.valor)}
              style={({ pressed }) => [
                estilos.opcion,
                apiladas && estilos.apilada,
                {
                  borderColor: elegida ? paleta.brand : 'transparent',
                  backgroundColor: elegida ? paleta.brandTint : pressed ? paleta.surface200 : 'transparent',
                  opacity: deshabilitado ? 0.6 : 1,
                },
              ]}
            >
              {Icono && <Icono size={apiladas ? 22 : 18} strokeWidth={1.75} color={elegida ? paleta.brandStrong : paleta.inkMuted} />}
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.85} style={{ color: elegida ? paleta.brandStrong : paleta.ink, fontSize: apiladas ? 13 : 14, fontWeight: elegida ? '600' : '400' }}>
                {opcion.etiqueta}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error && <Text accessibilityRole="alert" style={[estilos.error, { color: paleta.danger }]}>{error}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: { fontSize: 13, fontWeight: '600' },
  grupo: { flexDirection: 'row', gap: espaciado.s1, padding: espaciado.s1, borderWidth: 1, borderRadius: radios.md },
  opcion: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radios.sm,
    paddingHorizontal: espaciado.s2,
  },
  apilada: { flexDirection: 'column', minHeight: 64, gap: 4, paddingVertical: espaciado.s2, paddingHorizontal: 2 },
  error: { fontSize: 13, fontWeight: '600' },
});
