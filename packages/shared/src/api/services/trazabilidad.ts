import { ErrorHttp, type ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import {
  auditoriaApi, historialMascotaApi, lineaTiempoApi, notificacionApi, paginadoGenerico, planSeguimientoApi,
  type AuditoriaApi, type HistorialMascotaApi, type LineaTiempoApi, type NotificacionApi, type PaginadoApi, type PlanSeguimientoApi,
} from '../contratosBackend';
import type { FiltroPaginado, Paginado } from '../../types/comun';
import type { ResultadoSeguimiento } from '../../types/enums';
import type {
  EntradaAuditoria, EventoMascota, EventoSolicitud, NotificacionUsuario, PlanSeguimientoAdopcion, ReporteSeguimientoAdopcionDto,
} from '../../types/trazabilidad';

const pagina = (f: FiltroPaginado, tamano: number) => ({ pagina: f.pagina ?? 1, tamano: f.tamanoPagina ?? tamano });

/**
 * Trazabilidad (HU-TRA-01 a 06): línea de tiempo de la solicitud, bitácora
 * pública de la mascota, notificaciones, auditoría y seguimiento
 * post-adopción. En demo el cliente simulado responde con las formas del
 * dominio, así que esas ramas no traducen.
 */
export class ServicioTrazabilidad {
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}

  /** Cambios de estado de una solicitud, del más antiguo al más reciente. Dueño, refugio o admin. */
  async lineaTiempo(solicitudId: number): Promise<readonly EventoSolicitud[]> {
    if (this.modoDemo) return this.api.get(RUTAS.trazabilidad.solicitud(solicitudId));
    const datos = await this.api.get<LineaTiempoApi[]>(RUTAS.trazabilidad.solicitud(solicitudId));
    return datos.map(lineaTiempoApi).sort((a, b) => a.fecha.localeCompare(b.fecha));
  }

  /** Bitácora pública de la mascota (no pide sesión), más reciente primero. */
  async historialMascota(mascotaId: number): Promise<readonly EventoMascota[]> {
    if (this.modoDemo) return this.api.get(RUTAS.trazabilidad.mascota(mascotaId));
    const datos = await this.api.get<HistorialMascotaApi[]>(RUTAS.trazabilidad.mascota(mascotaId));
    return datos.map(historialMascotaApi).sort((a, b) => b.fecha.localeCompare(a.fecha));
  }

  /* ----- Notificaciones (TRA-04) ----- */

  async notificaciones(filtro: FiltroPaginado = {}): Promise<Paginado<NotificacionUsuario>> {
    if (this.modoDemo) return this.api.get(RUTAS.notificaciones.base, pagina(filtro, 20));
    return paginadoGenerico(await this.api.get<PaginadoApi<NotificacionApi>>(RUTAS.notificaciones.base, pagina(filtro, 20)), notificacionApi);
  }

  async marcarLeida(id: number): Promise<void> {
    await this.api.patch(RUTAS.notificaciones.leer(id));
  }

  /* ----- Auditoría (TRA-03, solo administrador) ----- */

  async auditoria(filtro: FiltroPaginado = {}): Promise<Paginado<EntradaAuditoria>> {
    if (this.modoDemo) return this.api.get(RUTAS.trazabilidad.auditoria, pagina(filtro, 20));
    return paginadoGenerico(await this.api.get<PaginadoApi<AuditoriaApi>>(RUTAS.trazabilidad.auditoria, pagina(filtro, 20)), auditoriaApi);
  }

  /* ----- Seguimiento post-adopción (TRA-05) ----- */

  /**
   * Necesita el ID de la adopción, que ningún endpoint del backend devuelve
   * todavía: queda listo para cuando la solicitud lo exponga.
   */
  /**
   * HU-TRA-06, solo administrador: revisa los seguimientos vencidos y envía
   * las alertas. El backend no lo corre solo (no tiene tarea programada).
   */
  async procesarAlertas(): Promise<string> {
    const r = await this.api.post<{ mensaje?: string }>(RUTAS.seguimientos.procesarAlertas);
    return r?.mensaje ?? 'Alertas procesadas.';
  }

  async planSeguimiento(adopcionId: number): Promise<PlanSeguimientoAdopcion> {
    if (this.modoDemo) return this.api.get(RUTAS.seguimientos.plan(adopcionId));
    return planSeguimientoApi(await this.api.get<PlanSeguimientoApi>(RUTAS.seguimientos.plan(adopcionId)));
  }

  async enviarReporte(seguimientoId: number, datos: ReporteSeguimientoAdopcionDto): Promise<void> {
    const estadoSalud = datos.estadoSalud.trim(); const adaptacion = datos.adaptacion.trim();
    if (!estadoSalud || !adaptacion) throw new ErrorHttp({ titulo: 'Cuéntanos cómo está de salud y cómo se ha adaptado.', estadoHttp: 400 });
    await this.api.post(RUTAS.seguimientos.reporte(seguimientoId), {
      estadoSalud, adaptacion, comentarios: datos.comentarios.trim(), fotosUrls: datos.fotosUrls.filter((u) => /^https:\/\//i.test(u)),
    });
  }

  /** El resultado va en la URL (?resultado=0|1), como lo espera el backend. */
  async evaluarSeguimiento(seguimientoId: number, resultado: ResultadoSeguimiento): Promise<void> {
    await this.api.peticion(RUTAS.seguimientos.evaluar(seguimientoId), { metodo: 'PATCH', parametros: { resultado } });
  }
}
