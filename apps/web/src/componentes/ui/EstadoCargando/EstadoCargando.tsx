import './estadoCargando.css';

interface Props {
  /** Qué se está cargando: "Cargando solicitudes". Lo lee el lector de pantalla. */
  readonly mensaje?: string;
  /**
   * - pagina: llena el espacio bajo el encabezado, como el estado de error.
   * - pantalla: alto completo de la ventana, para antes de que haya layout.
   * - bloque: centrado con aire, cuando debajo hay otra seccion que no
   *   debe quedar empujada fuera de la pantalla.
   * - compacto: en linea, para una carga pequena dentro de un bloque.
   */
  readonly variante?: 'pagina' | 'pantalla' | 'bloque' | 'compacto';
}

/**
 * Indicador de carga.
 *
 * Ocupa el mismo espacio que tendra el contenido o el error, asi que al
 * terminar la pantalla no salta. Aparece con un pequeno retraso: si la
 * respuesta llega rapido, no alcanza a parpadear.
 */
export function EstadoCargando({ mensaje = 'Cargando…', variante = 'pagina' }: Props) {
  return (
    <div className={`estado-cargando estado-cargando--${variante}`} role="status" aria-live="polite">
      <span className="estado-cargando__spinner" aria-hidden="true" />
      <span className="estado-cargando__mensaje">{mensaje}</span>
    </div>
  );
}
