import { ClienteApi, type ConfiguracionCliente } from './client';
import { ClienteDemo } from '../demo/clienteDemo';
import {
  ServicioAdministracion,
  ServicioAdopcion,
  ServicioAutenticacion,
  ServicioMascotas,
  ServicioRefugios,
  ServicioReportes,
  ServicioTrazabilidad,
  ServicioUsuarios,
} from './services';

export * from './client';
export * from './rutas';
export * from './services';

/** Todos los servicios, ya construidos sobre un mismo cliente. */
export interface ApiHuellitas {
  readonly cliente: ClienteApi;
  readonly autenticacion: ServicioAutenticacion;
  readonly usuarios: ServicioUsuarios;
  readonly refugios: ServicioRefugios;
  readonly mascotas: ServicioMascotas;
  readonly adopcion: ServicioAdopcion;
  readonly trazabilidad: ServicioTrazabilidad;
  readonly reportes: ServicioReportes;
  readonly administracion: ServicioAdministracion;
}

export interface OpcionesApi extends ConfiguracionCliente {
  /**
   * Responde con datos simulados en vez de llamar al backend.
   * Sirve para desarrollar y sustentar mientras la API no esta lista.
   */
  readonly modoDemo?: boolean;
}

export function crearApi(config: OpcionesApi): ApiHuellitas {
  const cliente = config.modoDemo ? new ClienteDemo(config) : new ClienteApi(config);
  return {
    cliente,
    autenticacion: new ServicioAutenticacion(cliente),
    usuarios: new ServicioUsuarios(cliente),
    refugios: new ServicioRefugios(cliente),
    mascotas: new ServicioMascotas(cliente),
    adopcion: new ServicioAdopcion(cliente),
    trazabilidad: new ServicioTrazabilidad(cliente),
    reportes: new ServicioReportes(cliente),
    administracion: new ServicioAdministracion(cliente),
  };
}
