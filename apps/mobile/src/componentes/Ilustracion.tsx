import { Image, StyleSheet, type ImageSourcePropType } from 'react-native';

import restablecer from '../../assets/restablecer.webp';

export type VarianteIlustracion = 'restablecer';

const FUENTES: Record<VarianteIlustracion, ImageSourcePropType> = {
  /** Frente al portatil con el sobre y el campo de contrasena. */
  restablecer,
};

interface Props {
  readonly variante: VarianteIlustracion;
  /** Alto en puntos. Por defecto, el que cabe sin empujar el formulario. */
  readonly alto?: number;
}

/**
 * Ilustraciones de la plataforma: las mismas imagenes que la web.
 *
 * Son las mascotas reales del equipo, recortadas del fondo. Al venir sin
 * fondo y con su propio contorno claro, la misma imagen sirve en tema
 * claro y en oscuro sin duplicarla.
 *
 * resizeMode contain y solo el alto fijo: el ancho sale de la proporcion
 * de la imagen. Con los dos puestos se deformarian.
 *
 * Son decorativas. El texto de al lado dice lo que hay que decir, asi que
 * quedan fuera del lector de pantalla para no repetirlo.
 */
export function Ilustracion({ variante, alto = 140 }: Props) {
  return (
    <Image
      source={FUENTES[variante]}
      style={[estilos.imagen, { height: alto }]}
      resizeMode="contain"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    />
  );
}

const estilos = StyleSheet.create({
  imagen: { width: '100%', alignSelf: 'center' },
});
