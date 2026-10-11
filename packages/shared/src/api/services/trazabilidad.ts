import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type { Paginado } from '../../types/comun';
import type {
  FiltroAuditoria,
  Notificacion,
  PlanSeguimiento,
  RegistroAuditoria,
  ReporteSeguimientoDto,
  RevisarSeguimientoDto,
  Seguimiento,
} from '../../types/trazabilidad';

export class ServicioTrazabilidad {
  constructor(private readonly api: ClienteApi) {}

  /* ----- Seguimiento post-adopcion ----- */

  misSeguimientos(): Promise<readonly Seguimiento[]> {
    return this.api.get<readonly Seguimiento[]>(RUTAS.seguimientos.mios);
  }

  planPorAdopcion(adopcionId: number): Promise<PlanSeguimiento> {
    return this.api.get<PlanSeguimiento>(RUTAS.seguimientos.porAdopcion(adopcionId));
  }

  enviarReporte(id: number, datos: ReporteSeguimientoDto): Promise<void> {
    return this.api.post<void>(RUTAS.seguimientos.reporte(id), datos);
  }

  revisarReporte(id: number, datos: RevisarSeguimientoDto): Promise<void> {
    return this.api.post<void>(RUTAS.seguimientos.revisar(id), datos);
  }

  /* ----- Notificaciones ----- */

  notificacionesNoLeidas(): Promise<readonly Notificacion[]> {
    return this.api.get<readonly Notificacion[]>(RUTAS.notificaciones.noLeidas);
  }

  marcarLeida(id: number): Promise<void> {
    return this.api.post<void>(RUTAS.notificaciones.marcarLeida(id));
  }

  /* ----- Auditoria ----- */

  auditoria(filtro: FiltroAuditoria = {}): Promise<Paginado<RegistroAuditoria>> {
    return this.api.get<Paginado<RegistroAuditoria>>(RUTAS.administracion.auditoria, {
      ...filtro,
    });
  }
}
