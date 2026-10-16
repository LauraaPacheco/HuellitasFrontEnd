import bloqueo from '@/assets/bloqueo.webp';
import confundido from '@/assets/confundido.webp';
import durmiendo from '@/assets/durmiendo.webp';
import trio from '@/assets/trio.webp';
import './ilustracion.css';

export type VarianteIlustracion = 'trio' | 'bloqueo' | 'confundido' | 'durmiendo';

const FUENTES: Record<VarianteIlustracion, string> = {
  /** Las tres mascotas tranquilas: para una pantalla sin datos. */
  trio,
  /** Las tres con un candado: para un acceso denegado de verdad. */
  bloqueo,
  /** Con signos de pregunta: la busqueda no encontro nada. */
  confundido,
  /** Dormidas: todavia no ha pasado nada, no hay error. */
  durmiendo,
};

interface Props {
  readonly variante: VarianteIlustracion;
  /**
   * Alto fijo en píxeles. Si se omite, manda la hoja de estilos, que es
   * lo que permite que la ilustración se adapte al alto de la ventana en
   * vez de aparecer o desaparecer de golpe.
   */
  readonly alto?: number;
}

/**
 * Ilustraciones de la plataforma.
 *
 * Son las mascotas reales del equipo, dibujadas y recortadas del fondo. Al
 * venir sin fondo y con su propio contorno claro, la misma imagen sirve en
 * tema claro y en oscuro sin tener que duplicarla.
 *
 * Van en los momentos en que la pantalla no tiene datos que mostrar. Son
 * decorativas: el texto de al lado dice lo que hay que decir, así que el
 * alt va vacío para no repetirlo en el lector de pantalla.
 */
export function Ilustracion({ variante, alto }: Props) {
  return (
    <img
      className="ilustracion"
      src={FUENTES[variante]}
      alt=""
      // Un alto en linea le gana a cualquier regla del CSS, asi que solo
      // se pone cuando de verdad lo pidieron.
      style={alto === undefined ? undefined : { height: alto }}
      // Decorativa y pesada: que no bloquee lo que importa de la pantalla.
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
