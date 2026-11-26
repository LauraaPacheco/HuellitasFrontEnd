import type { StyleProp, ViewStyle } from 'react-native';

export interface Coordenada {
  readonly latitud: number;
  readonly longitud: number;
}

/** Centro de Cali: donde arranca el mapa si no hay permiso de ubicación. */
export const CENTRO_CALI: Coordenada = { latitud: 3.4516, longitud: -76.532 };

export interface PropsMapa {
  /** Dónde arranca el mapa. Moverlo después se hace con `centrarEn`. */
  readonly inicial: Coordenada;
  /** Se llama cuando la persona termina de mover el mapa, con el nuevo centro. */
  readonly alMover: (centro: Coordenada) => void;
  /** Se llama al mantener presionado el mapa, con el punto presionado. */
  readonly alMantener?: (punto: Coordenada) => void;
  /** Espacio abajo para que los créditos del mapa no queden tapados (barra de pestañas, botones). */
  readonly margenCreditos?: number;
  /** Muestra el punto azul de "estás aquí" (pide permiso de ubicación). */
  readonly mostrarUsuario?: boolean;
  readonly style?: StyleProp<ViewStyle>;
}

export interface ControlMapa {
  centrarEn: (c: Coordenada) => void;
}
