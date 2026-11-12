import { ErrorHttp } from '../api/client';

/** Que clase de fallo fue, para elegir mensaje e ilustracion. */
export type TipoFallo = 'red' | 'permiso' | 'noEncontrado' | 'servidor' | 'otro';

export interface ExplicacionError {
  readonly tipo: TipoFallo;
  readonly texto: string;
}

/**
 * Traduce un error de consulta a algo que la persona entienda y pueda
 * hacer. La comparten la web y la app movil para que digan lo mismo.
 *
 * No se muestra el titulo crudo del servidor: cuando el backend no manda
 * un ProblemDetails, el cliente pone "Ocurrió un error inesperado", que no
 * dice que paso ni que hacer.
 */
export function explicarError(error: unknown): ExplicacionError {
  if (!(error instanceof ErrorHttp) || error.estadoHttp === 0) {
    // Sin respuesta: no hubo red o el servidor no contesto.
    return {
      tipo: 'red',
      texto: 'No logramos comunicarnos con el servidor. Revisa tu conexión a internet y vuelve a intentarlo.',
    };
  }
  if (error.esSinPermiso) {
    return {
      tipo: 'permiso',
      texto: 'Tu cuenta no tiene permiso para ver esta sección. Si crees que es un error, habla con el administrador.',
    };
  }
  if (error.estadoHttp === 404) {
    return {
      tipo: 'noEncontrado',
      texto: 'No encontramos lo que buscabas. Puede que se haya eliminado o que el enlace ya no sea válido.',
    };
  }
  if (error.estadoHttp >= 500) {
    return {
      tipo: 'servidor',
      texto: 'Algo falló de nuestro lado. Intenta de nuevo en unos minutos; si sigue pasando, avísale al equipo de soporte.',
    };
  }
  // 4xx con detalle propio del backend: ese si suele explicar el caso.
  return { tipo: 'otro', texto: error.detalle ?? 'No pudimos completar la consulta. Vuelve a intentarlo.' };
}
