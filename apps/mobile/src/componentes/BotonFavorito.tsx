import { Pressable, StyleSheet } from 'react-native';
import { Heart } from 'lucide-react-native';
import { radios, usarPaleta } from '@/temas';

/** Corazón redondo que va sobre la foto. Lleno y en color de acento cuando está marcado. */
export function BotonFavorito({
  marcado,
  nombre,
  alPresionar,
  tamano = 44,
}: {
  readonly marcado: boolean;
  readonly nombre: string;
  readonly alPresionar: () => void;
  readonly tamano?: number;
}) {
  const paleta = usarPaleta();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={marcado ? `Quitar a ${nombre} de favoritos` : `Guardar a ${nombre} en favoritos`}
      accessibilityState={{ selected: marcado }}
      hitSlop={6}
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.boton,
        { width: tamano, height: tamano, backgroundColor: paleta.surface100, borderColor: paleta.border, opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Heart
        size={Math.round(tamano * 0.48)}
        strokeWidth={2}
        color={marcado ? paleta.accent : paleta.ink}
        fill={marcado ? paleta.accent : 'transparent'}
      />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: { borderRadius: radios.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
});
