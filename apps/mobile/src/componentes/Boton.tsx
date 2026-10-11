import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { AREA_TOCABLE_MINIMA, espaciado, radios, usarPaleta } from '@/temas';

type Variante = 'primario' | 'secundario' | 'peligro';

interface Props {
  readonly titulo: string;
  readonly alPresionar: () => void;
  readonly variante?: Variante;
  readonly cargando?: boolean;
  readonly deshabilitado?: boolean;
}

export function Boton({
  titulo,
  alPresionar,
  variante = 'primario',
  cargando = false,
  deshabilitado = false,
}: Props) {
  const paleta = usarPaleta();
  const inactivo = deshabilitado || cargando;

  const fondo =
    variante === 'primario' ? paleta.brandStrong : paleta.surface100;
  const texto =
    variante === 'primario'
      ? paleta.onBrand
      : variante === 'peligro'
        ? paleta.danger
        : paleta.ink;
  const borde =
    variante === 'primario'
      ? 'transparent'
      : variante === 'peligro'
        ? paleta.danger
        : paleta.border;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: inactivo, busy: cargando }}
      onPress={alPresionar}
      disabled={inactivo}
      style={({ pressed }) => [
        estilos.base,
        {
          backgroundColor: fondo,
          borderColor: borde,
          opacity: inactivo ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
    >
      {cargando ? (
        <ActivityIndicator color={texto} />
      ) : (
        <Text style={[estilos.texto, { color: texto }]}>{titulo}</Text>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  base: {
    minHeight: 52,
    paddingHorizontal: espaciado.s5,
    borderRadius: radios.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  texto: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export { AREA_TOCABLE_MINIMA };
