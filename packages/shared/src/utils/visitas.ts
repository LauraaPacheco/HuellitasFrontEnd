import { EstadoSolicitud } from '../types/enums';
import type { SolicitudResumen, VisitaResumen } from '../types/adopcion';

/** Una reprogramación puede tener fecha anterior: manda el ID de creación, no la fecha. */
export function visitaVigente(visitas: readonly VisitaResumen[], solicitudId: number): VisitaResumen | undefined {
  return visitas.filter(v => v.solicitudId === solicitudId).reduce<VisitaResumen | undefined>((actual, v) => !actual || v.visitaId > actual.visitaId ? v : actual, undefined);
}
export function puedeDecidirSolicitud(s: SolicitudResumen, visita?: VisitaResumen): boolean {
  const abierta = s.estado === EstadoSolicitud.Enviada || s.estado === EstadoSolicitud.EnRevision;
  if (visita) return (abierta || s.estado === EstadoSolicitud.EntrevistaVisita) && visita.estado === 'Confirmada';
  return abierta;
}
