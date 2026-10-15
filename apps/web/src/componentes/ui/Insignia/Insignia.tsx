import type { DescriptorEstado } from '@huellitas/shared';
import './insignia.css';

/**
 * Insignia de estado. Siempre muestra el texto: el color nunca va solo,
 * para que la pantalla se lea con daltonismo o bajo el sol.
 */
export function Insignia({ estado }: { readonly estado: DescriptorEstado }) {
  return (
    <span className={`insignia insignia--${estado.tono}`}>{estado.etiqueta}</span>
  );
}
