import { ErrorHttp, type ClienteApi } from '../client';
import { paginadoSolicitudesApi, type PaginadoApi, type SolicitudResumenApi } from '../contratosBackend';
import { RUTAS } from '../rutas';
import type { Paginado, ResultadoValidacion } from '../../types/comun';
import type { EtapaLineaTiempo } from '../../types/trazabilidad';
import type {
  Adopcion,
  CrearSolicitudDto,
  CrearVisitaDto,
  DecisionSolicitudDto,
  FiltroSolicitud,
  RechazoSolicitudDto,
  SolicitudAdopcion,
  SolicitudResumen,
  VisitaEntrevista,
} from '../../types/adopcion';

export class ServicioAdopcion {
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}

  private soloDemo() { if (!this.modoDemo) throw new ErrorHttp({ titulo: 'Esta función todavía no está disponible en el servidor.', estadoHttp: 501 }); }

  /** HU-ADO-01: respuesta reducida del endpoint real, sin inventar el detalle. */
  async postular(datos: CrearSolicitudDto): Promise<ConfirmacionPostulacion> {
    if (this.modoDemo) {
      const mascota = await this.api.get<{ nombre: string }>(RUTAS.mascotas.porId(datos.mascotaId));
      return { mensaje: 'Simulación demo: esta solicitud no se guarda ni se envía al refugio.', solicitud: {
        solicitudId: 0, codigo: 'DEMO-SIN-REGISTRO', mascotaNombre: mascota.nombre,
        fechaEnvio: new Date().toISOString(), estado: 'Simulada',
      } };
    }
    return this.api.post<ConfirmacionPostulacion>(RUTAS.adopciones.postular, {
      mascotaId: datos.mascotaId,
      respuestasFormulario: { ...datos.respuestasFormulario, aceptaCompromisos: datos.aceptaCompromisos },
    });
  }

  /** Bandeja del refugio. El backend real solo pagina: no filtra por estado. */
  async listar(filtro: FiltroSolicitud = {}): Promise<Paginado<SolicitudResumen>> {
    if (this.modoDemo) return this.api.get<Paginado<SolicitudResumen>>(RUTAS.solicitudes.base, { ...filtro });
    if (filtro.estado !== undefined) throw new ErrorHttp({ titulo: 'El servidor todavía no filtra la bandeja por estado.', estadoHttp: 400 });
    return paginadoSolicitudesApi(await this.api.get<PaginadoApi<SolicitudResumenApi>>(RUTAS.adopciones.bandeja, { pagina: filtro.pagina, tamano: filtro.tamanoPagina }));
  }

  /** Solicitudes del adoptante autenticado. */
  async misSolicitudes(pagina = 1, tamano = 20): Promise<Paginado<SolicitudResumen>> {
    if (this.modoDemo) {
      const items = await this.api.get<readonly SolicitudResumen[]>(RUTAS.solicitudes.mias);
      return { items, pagina: 1, tamanoPagina: items.length, total: items.length, totalPaginas: 1 };
    }
    return paginadoSolicitudesApi(await this.api.get<PaginadoApi<SolicitudResumenApi>>(RUTAS.adopciones.misSolicitudes, { pagina, tamano }));
  }

  obtener(id: number): Promise<SolicitudAdopcion> {
    this.soloDemo();
    return this.api.get<SolicitudAdopcion>(RUTAS.solicitudes.porId(id));
  }

  /** Comprueba cuenta verificada y perfil completo antes de dejar postular. */
  validarPostulacion(mascotaId: number): Promise<ResultadoValidacion> {
    return this.api.get<ResultadoValidacion>(RUTAS.solicitudes.validar, {
      mascotaId,
    });
  }

  crear(datos: CrearSolicitudDto): Promise<SolicitudAdopcion> {
    return this.api.post<SolicitudAdopcion>(RUTAS.solicitudes.base, datos);
  }

  /** HU-ADO-03: solo para solicitudes Enviadas o En revisión; el backend responde 409 si no. */
  async aprobar(id: number, datos: DecisionSolicitudDto = {}): Promise<void> {
    if (this.modoDemo) return this.api.post<void>(RUTAS.solicitudes.aprobar(id), datos);
    await this.api.patch(RUTAS.adopciones.aprobar(id), { observaciones: datos.observacion?.trim() || undefined });
  }

  async rechazar(id: number, datos: RechazoSolicitudDto): Promise<void> {
    const motivo = datos.motivo.trim();
    if (!motivo) throw new ErrorHttp({ titulo: 'Escribe el motivo del rechazo.', estadoHttp: 400 });
    if (motivo.length > MAX_MOTIVO_RECHAZO) throw new ErrorHttp({ titulo: `El motivo puede tener hasta ${MAX_MOTIVO_RECHAZO} caracteres.`, estadoHttp: 400 });
    if (this.modoDemo) return this.api.post<void>(RUTAS.solicitudes.rechazar(id), { motivo });
    await this.api.patch(RUTAS.adopciones.rechazar(id), { motivoRechazo: motivo });
  }

  cancelar(id: number, motivo?: string): Promise<void> {
    this.soloDemo();
    return this.api.post<void>(RUTAS.solicitudes.cancelar(id), { motivo });
  }

  /** Dispara el cierre en cascada: mascota adoptada y demas solicitudes cerradas. */
  finalizar(id: number): Promise<Adopcion> {
    this.soloDemo();
    return this.api.post<Adopcion>(RUTAS.solicitudes.finalizar(id));
  }

  lineaTiempo(id: number): Promise<readonly EtapaLineaTiempo[]> {
    this.soloDemo();
    return this.api.get<readonly EtapaLineaTiempo[]>(
      RUTAS.solicitudes.lineaTiempo(id),
    );
  }

  subirSoporte(id: number, archivo: FormData): Promise<void> {
    return this.api.peticion<void>(RUTAS.solicitudes.soportes(id), {
      metodo: 'POST',
      cuerpo: archivo,
    });
  }

  agendarVisita(datos: CrearVisitaDto): Promise<VisitaEntrevista> {
    return this.api.post<VisitaEntrevista>(RUTAS.solicitudes.visitas, datos);
  }

  constancia(adopcionId: number): Promise<{ url: string }> {
    return this.api.get<{ url: string }>(RUTAS.adopciones.constancia(adopcionId));
  }
}

/** Límite del RechazarSolicitudValidator del backend. */
export const MAX_MOTIVO_RECHAZO = 500;

export interface ConfirmacionPostulacion {
  mensaje: string;
  solicitud: { solicitudId: number; codigo: string; mascotaNombre: string; fechaEnvio: string; estado: string };
}
