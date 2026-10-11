import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { tokens } from '@huellitas/shared';
import type { PreferenciaTema } from '@huellitas/shared/tokens';
import { AREA_TOCABLE_MINIMA, espaciado, radios, usarTema } from '@/temas';

interface Props {
  /** Con etiqueta, el botón muestra el nombre del tema al lado del icono. */
  readonly conEtiqueta?: boolean;
}

/** Sol, luna o mitad y mitad, segun el estado. */
function IconoTema({ preferencia, color }: { preferencia: PreferenciaTema; color: string }) {
  const comun = { stroke: color, strokeWidth: 1.5, strokeLinecap: 'round' as const };

  if (preferencia === 'claro') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Circle cx={12} cy={12} r={4} {...comun} />
        <Path
          d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8l-1.4 1.4m-10 10l-1.4 1.4"
          {...comun}
        />
      </Svg>
    );
  }

  if (preferencia === 'oscuro') {
    return (
      <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <Path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" {...comun} />
      </Svg>
    );
  }

  // Automatico: circulo medio lleno, para que se lea distinto de los otros dos.
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={8} {...comun} />
      <Path d="M12 4a8 8 0 0 0 0 16z" fill={color} />
    </Svg>
  );
}

export function BotonTema({ conEtiqueta = false }: Props) {
  const { preferencia, paleta, alternarTema } = usarTema();
  const etiqueta = tokens.etiquetaBotonTema(preferencia);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={etiqueta}
      onPress={alternarTema}
      hitSlop={8}
      style={({ pressed }) => [
        estilos.boton,
        {
          borderColor: paleta.border,
          backgroundColor: pressed ? paleta.surface300 : paleta.surface100,
          paddingHorizontal: conEtiqueta ? espaciado.s4 : espaciado.s3,
        },
      ]}
    >
      <View style={estilos.contenido}>
        <IconoTema preferencia={preferencia} color={paleta.ink} />
        {conEtiqueta && (
          <Text style={[estilos.texto, { color: paleta.ink }]}>
            {tokens.nombrePreferenciaTema(preferencia)}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: {
    minWidth: AREA_TOCABLE_MINIMA,
    height: AREA_TOCABLE_MINIMA,
    borderWidth: 1,
    borderRadius: radios.pill,
    justifyContent: 'center',
  },
  contenido: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.s2,
  },
  texto: { fontSize: 14, fontWeight: '600' },
});
