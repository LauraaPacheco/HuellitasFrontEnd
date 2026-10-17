import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { usarTema } from '@/temas';

interface Props {
  readonly tamano?: number;
  /** Para cuando el isotipo va sobre un fondo de color de marca. */
  readonly sobreOscuro?: boolean;
}

/**
 * Isotipo de Huellitas: pin de ubicacion con una huella recortada.
 *
 * Mismo dibujo que en la web (apps/web/src/componentes/ui/Isotipo). Si
 * cambia uno, cambia el otro: es la misma marca.
 *
 * Una sola geometria para todos los tamanos. La version reducida que
 * habia por debajo de 32px tapaba el circulo entero y solo dejaba un
 * anillo. El hueco sale de surface100 y no de un blanco fijo, que en
 * tema oscuro quedaba gris sobre el verde menta.
 */
export function Isotipo({ tamano = 32, sobreOscuro = false }: Props) {
  const { paleta, tema } = usarTema();
  const pin = sobreOscuro || tema === 'oscuro' ? '#ffffff' : paleta.brandStrong;
  const hueco = sobreOscuro ? paleta.brandStrong : paleta.surface100;

  return (
    <Svg viewBox="0 0 120 120" width={tamano} height={tamano} accessibilityLabel="Huellitas">
      <Path
        d="M60 6 C86 6 106 26 106 52 C106 82 72 106 60 116 C48 106 14 82 14 52 C14 26 34 6 60 6 Z"
        fill={pin}
      />
      <Circle cx="60" cy="50" r="26" fill={hueco} />
      <Circle cx="46" cy="43" r="7.5" fill={pin} />
      <Circle cx="60" cy="36" r="7.5" fill={pin} />
      <Circle cx="74" cy="43" r="7.5" fill={paleta.accent} />
      <Ellipse cx="60" cy="60" rx="14" ry="10" fill={pin} />
    </Svg>
  );
}
