import trio from '@/assets/trio.webp';
import './ilustracion.css';

export type VarianteIlustracion = 'trio';

const FUENTES: Record<VarianteIlustracion, string> = {
  trio,
};

interface Props {
  readonly variante: VarianteIlustracion;
  /** Alto en píxeles; el ancho sale solo de la proporción. */
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
export function Ilustracion({ variante, alto = 200 }: Props) {
  return (
    <img
      className="ilustracion"
      src={FUENTES[variante]}
      alt=""
      height={alto}
      style={{ height: alto }}
      // Decorativa y pesada: que no bloquee lo que importa de la pantalla.
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
