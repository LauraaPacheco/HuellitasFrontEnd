import type { ReactNode } from 'react';
import { ErrorHttp, explicarError } from '@huellitas/shared';
import { Ilustracion, type VarianteIlustracion } from '../Ilustracion';
import { Boton } from '../Boton';
import './estadoError.css';

interface Props {
  /** Qué no se pudo cargar, en una frase: "No pudimos cargar las solicitudes". */
  readonly titulo: string;
  /** El error de la consulta. De él sale la explicación que ve la persona. */
  readonly error: unknown;
  readonly alReintentar: () => void;
  /** Mientras se reintenta, el botón muestra que está trabajando. */
  readonly reintentando?: boolean;
  /** Otra salida además de reintentar, por ejemplo volver al listado. */
  readonly accionExtra?: ReactNode;
}

/** La explicacion vive en @huellitas/shared: la app movil dice lo mismo. */
export function explicarErrorConIlustracion(error: unknown): { texto: string; ilustracion: VarianteIlustracion } {
  const { tipo, texto } = explicarError(error);
  return { texto, ilustracion: tipo === 'permiso' ? 'bloqueo' : 'confundido' };
}

/**
 * Estado de una pantalla cuya consulta principal falló.
 *
 * Ocupa el espacio de la pantalla en vez de quedar como una tarjeta suelta
 * arriba: cuando no hay datos, el error es lo único que hay que ver.
 */
export function EstadoError({ titulo, error, alReintentar, reintentando = false, accionExtra }: Props) {
  const { texto, ilustracion } = explicarErrorConIlustracion(error);
  const sinPermiso = error instanceof ErrorHttp && error.esSinPermiso;

  return (
    <section className="estado-error" role="alert">
      <Ilustracion variante={ilustracion} />
      <h2 className="estado-error__titulo">{titulo}</h2>
      <p className="estado-error__texto">{texto}</p>
      <div className="estado-error__acciones">
        {/* Reintentar no arregla un permiso que falta. */}
        {!sinPermiso && (
          <Boton variante="primario" onClick={alReintentar} cargando={reintentando}>
            Reintentar
          </Boton>
        )}
        {accionExtra}
      </div>
    </section>
  );
}
