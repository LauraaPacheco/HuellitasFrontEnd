import { ErrorHttp } from './client';
import { EstadoApadrinamiento, EstadoMascota, EstadoNecesidad, EstadoReporte, EstadoSeguimiento, EstadoSolicitud, ResultadoSeguimiento, Sexo, TipoEvento, TipoNecesidad, TipoRegistroClinico, TipoReporte } from '../types/enums';
import type { DetalleReporte, PinReporte, ReporteBandeja } from '../types/reportes';
import type { ApadrinamientoResumen, NecesidadRefugio, OpinionRefugio } from '../types/refugios';
import type { EntradaAuditoria, EventoMascota, EventoSolicitud, NotificacionUsuario, PlanSeguimientoAdopcion } from '../types/trazabilidad';
import type { MascotaResumen, RecomendacionMascota, RegistroClinico } from '../types/mascotas';
import type { SolicitudResumen } from '../types/adopcion';
import type { Paginado } from '../types/comun';
export interface PerfilUsuarioApi { id: number; refugioId?: number | null; nombre: string; correo: string; telefono: string | null; fotoUrl: string | null; estado: string; fechaRegistro: string; politicaAceptada?: string | null; fechaAceptacionPolitica?: string | null }
export interface PerfilAdoptanteApi { tipoVivienda: string | null; espacioDisponible: string | null; presenciaDeNinos: boolean | null; otrasMascotas: boolean | null; tiempoDisponible: string | null; experienciaPrevia: boolean | null; porcentajeCompletitud: number }
export interface ResumenMascotaApi { id: number; nombre: string; especie: string; raza: string | null; sexo: string; edadAproximada: number; fotoPrincipal: string | null; estado: string; fechaCreacion: string }
export interface DetalleMascotaApi extends Omit<ResumenMascotaApi, 'fotoPrincipal' | 'fechaCreacion'> { descripcion: string | null; esterilizada: boolean; refugio: string; refugioId?: number; refugioTelefono: string | null; fotos: string[]; especieId?: number; razaId?: number | null; tamanoId?: number; colorId?: number }
export interface FichaMascotaPublica { id: number; nombre: string; especie: string; raza: string | null; sexo: Sexo; edadAproximada: number | null; descripcion: string | null; esterilizada: boolean; estado: EstadoMascota; refugioNombre: string; refugioTelefono: string | null; refugioId?: number; fotos: readonly string[];
  /** Ids de catálogo para editar. Opcionales: un backend sin el cambio de MascotaDetalleDTO no los manda. */
  especieId?: number; razaId?: number | null; tamanoId?: number; colorId?: number }
export interface PaginadoApi<T> { items: T[]; pagina: number; tamanoPagina: number; totalRegistros: number; totalPaginas: number }
const clave = (valor: string) => valor.trim().toLowerCase().replace(/\s/g, '');
export function estadoMascotaApi(valor: string): EstadoMascota {
  const estados: Record<string, EstadoMascota> = { disponible: EstadoMascota.Disponible, enproceso: EstadoMascota.EnProceso, adoptada: EstadoMascota.Adoptada, nodisponible: EstadoMascota.NoDisponible };
  const estado = estados[clave(valor)];
  if (estado === undefined) throw new ErrorHttp({ titulo: 'El servidor devolvió un estado de mascota no reconocido.', estadoHttp: 502 });
  return estado;
}
export function sexoApi(valor: string): Sexo {
  if (clave(valor) === 'macho') return Sexo.Macho;
  if (clave(valor) === 'hembra') return Sexo.Hembra;
  throw new ErrorHttp({ titulo: 'El servidor devolvió un sexo no reconocido.', estadoHttp: 502 });
}
export function resumenMascotaApi(datos: ResumenMascotaApi): MascotaResumen {
  return { id: datos.id, nombre: datos.nombre, especie: datos.especie, raza: datos.raza, sexo: sexoApi(datos.sexo), edadAproximada: datos.edadAproximada,
    fotoPrincipal: datos.fotoPrincipal, estado: estadoMascotaApi(datos.estado), tamano: null, refugioId: null, refugioNombre: null, refugioVerificado: null,
    fechaUltimaActualizacion: null, puntajeCompatibilidad: null };
}
export function paginadoApi(datos: PaginadoApi<ResumenMascotaApi>): Paginado<MascotaResumen> {
  return paginadoGenerico(datos, resumenMascotaApi);
}
export function paginadoGenerico<A, T>(datos: PaginadoApi<A>, mapear: (item: A) => T): Paginado<T> {
  return { items: datos.items.map(mapear), pagina: datos.pagina, tamanoPagina: datos.tamanoPagina, total: datos.totalRegistros, totalPaginas: datos.totalPaginas };
}

/** RecomendacionMascotaDTO (d98646c): el resumen de siempre más el puntaje y los factores. */
export interface RecomendacionApi extends ResumenMascotaApi { puntaje: number; factores: string[] }
export function recomendacionApi(datos: RecomendacionApi): RecomendacionMascota {
  return { ...resumenMascotaApi(datos), puntajeCompatibilidad: Math.max(0, Math.min(100, datos.puntaje)), factores: datos.factores ?? [] };
}

/** RegistroClinicoDTO (0dc2665): el tipo llega como el nombre del enum y la fecha como DateOnly. */
export interface RegistroClinicoApi { registroClinicoId: number; tipo: string; fecha: string; descripcion: string; soporteVeterinario: string | null }
const TIPOS_CLINICOS: Record<string, TipoRegistroClinico> = { vacuna: TipoRegistroClinico.Vacuna, desparasitacion: TipoRegistroClinico.Desparasitacion,
  esterilizacion: TipoRegistroClinico.Esterilizacion, diagnostico: TipoRegistroClinico.Diagnostico, tratamiento: TipoRegistroClinico.Tratamiento };
export function registroClinicoApi(datos: RegistroClinicoApi, mascotaId: number): RegistroClinico {
  const tipo = TIPOS_CLINICOS[clave(datos.tipo).normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
  if (tipo === undefined) throw new ErrorHttp({ titulo: 'El servidor devolvió un tipo de registro clínico no reconocido.', estadoHttp: 502 });
  return { id: datos.registroClinicoId, mascotaId, tipo, fecha: datos.fecha, descripcion: datos.descripcion?.trim() || null,
    soporteVeterinario: datos.soporteVeterinario, activo: true, fechaCreacion: datos.fecha, fechaModificacion: null };
}

/** SolicitudResumenDTO del backend (db3a4fb): el estado llega como texto y sin ids de usuario ni mascota. */
export interface SolicitudResumenApi { solicitudId: number; codigo: string; mascotaNombre: string; mascotaFoto: string | null; adoptanteNombre: string; fechaEnvio: string; estado: string;
  /** Aún no existen en el backend; se leen si llegan (ver SolicitudResumen). */
  adopcionId?: number | null; refugioId?: number | null; mascotaId?: number | null }
export function estadoSolicitudApi(valor: string): EstadoSolicitud {
  const estados: Record<string, EstadoSolicitud> = { enviada: EstadoSolicitud.Enviada, enrevision: EstadoSolicitud.EnRevision, entrevista: EstadoSolicitud.EntrevistaVisita,
    aprobada: EstadoSolicitud.Aprobada, rechazada: EstadoSolicitud.Rechazada, finalizada: EstadoSolicitud.Finalizada, cerrada: EstadoSolicitud.Cerrada, cancelada: EstadoSolicitud.Cancelada };
  const estado = estados[clave(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
  if (estado === undefined) {
    // Una solicitud rara no debe tumbar toda la lista: se muestra como desconocida y sin acciones.
    console.warn(`[solicitudes] estado no reconocido del servidor: ${JSON.stringify(valor)}`);
    return EstadoSolicitud.Desconocido;
  }
  return estado;
}
const DIA_MS = 24 * 60 * 60 * 1000;
/** Solo las solicitudes que esperan decisión del refugio acumulan días sin respuesta. */
function diasEsperando(fechaEnvio: string, estado: EstadoSolicitud, ahora: number): number {
  if (estado !== EstadoSolicitud.Enviada && estado !== EstadoSolicitud.EnRevision) return 0;
  const envio = Date.parse(fechaEnvio);
  return Number.isFinite(envio) ? Math.max(0, Math.floor((ahora - envio) / DIA_MS)) : 0;
}
export function solicitudResumenApi(dto: SolicitudResumenApi, ahora = Date.now()): SolicitudResumen {
  const estado = estadoSolicitudApi(dto.estado);
  return { id: dto.solicitudId, codigo: dto.codigo, nombreAdoptante: dto.adoptanteNombre, nombreMascota: dto.mascotaNombre, fotoMascota: dto.mascotaFoto,
    fechaEnvio: dto.fechaEnvio, estado, diasSinRespuesta: diasEsperando(dto.fechaEnvio, estado, ahora),
    ...(dto.adopcionId ? { adopcionId: dto.adopcionId } : {}), ...(dto.refugioId ? { refugioId: dto.refugioId } : {}), ...(dto.mascotaId ? { mascotaId: dto.mascotaId } : {}) };
}
export function paginadoSolicitudesApi(datos: PaginadoApi<SolicitudResumenApi>, ahora = Date.now()): Paginado<SolicitudResumen> {
  return { items: datos.items.map(s => solicitudResumenApi(s, ahora)), pagina: datos.pagina, tamanoPagina: datos.tamanoPagina, total: datos.totalRegistros, totalPaginas: datos.totalPaginas };
}

/* ---------- HU-REF-03/04 y HU-TRA-01 a 06 (95d5da4, 49b28ea, a00d0cc) ---------- */

/** Nombre de enum de C# ("EnRevision", "Medicinas") a clave comparable, sin tildes ni espacios. */
const claveEnum = (valor: string) => clave(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
function enumPorNombre<T>(valor: string, opciones: Record<string, T>, que: string): T {
  const resultado = opciones[claveEnum(valor ?? '')];
  if (resultado === undefined) throw new ErrorHttp({ titulo: `El servidor devolvió ${que} no reconocido.`, estadoHttp: 502 });
  return resultado;
}

export interface NecesidadApi { necesidadId: number; tipo: string; descripcion: string; medioDonacion: string | null; estado: string; fechaPublicacion: string }
export function necesidadApi(d: NecesidadApi): NecesidadRefugio {
  return {
    id: d.necesidadId,
    tipo: enumPorNombre(d.tipo, { alimento: TipoNecesidad.Alimento, medicinas: TipoNecesidad.Medicinas, insumos: TipoNecesidad.Insumos, otro: TipoNecesidad.Otro }, 'un tipo de necesidad'),
    descripcion: d.descripcion,
    medioDonacion: d.medioDonacion?.trim() || null,
    estado: enumPorNombre(d.estado, { publicada: EstadoNecesidad.Publicada, cubierta: EstadoNecesidad.Cubierta }, 'un estado de necesidad'),
    fechaPublicacion: d.fechaPublicacion,
  };
}

export interface ApadrinamientoApi { apadrinamientoId: number; mascotaId: number; mascotaNombre: string; refugioNombre: string | null; adoptanteNombre: string; fechaInicio: string; estado: string; observacion: string | null }
export function apadrinamientoApi(d: ApadrinamientoApi): ApadrinamientoResumen {
  return {
    id: d.apadrinamientoId, mascotaId: d.mascotaId, mascotaNombre: d.mascotaNombre, refugioNombre: d.refugioNombre,
    padrinoNombre: d.adoptanteNombre, fechaInicio: d.fechaInicio, observacion: d.observacion?.trim() || null,
    estado: enumPorNombre(d.estado, { solicitado: EstadoApadrinamiento.Solicitado, activo: EstadoApadrinamiento.Activo, finalizado: EstadoApadrinamiento.Finalizado }, 'un estado de apadrinamiento'),
  };
}

export interface CalificacionApi { calificacionId: number; adoptanteNombre: string; puntaje: number; comentario: string | null; fecha: string; esPropia?: boolean }
export function calificacionApi(d: CalificacionApi): OpinionRefugio {
  return { id: d.calificacionId, autor: d.adoptanteNombre, puntaje: Math.max(1, Math.min(5, d.puntaje)), comentario: d.comentario?.trim() || null, fecha: d.fecha, esPropia: d.esPropia === true };
}

export interface LineaTiempoApi { estadoAnterior: string; estadoNuevo: string; observacion: string | null; usuarioResponsable: string; fecha: string }
export function lineaTiempoApi(d: LineaTiempoApi): EventoSolicitud {
  return { estadoAnterior: d.estadoAnterior === 'Sin estado previo' ? null : d.estadoAnterior, estadoNuevo: d.estadoNuevo,
    observacion: d.observacion?.trim() || null, responsable: d.usuarioResponsable, fecha: d.fecha };
}

export interface HistorialMascotaApi { tipoEvento: string; descripcion: string; fecha: string }
export function historialMascotaApi(d: HistorialMascotaApi): EventoMascota {
  return {
    tipo: enumPorNombre(d.tipoEvento, { ingreso: TipoEvento.Ingreso, cambioestado: TipoEvento.CambioEstado, atencionclinica: TipoEvento.AtencionClinica, adopcion: TipoEvento.Adopcion, seguimiento: TipoEvento.Seguimiento }, 'un tipo de evento'),
    descripcion: d.descripcion, fecha: d.fecha,
  };
}

export interface NotificacionApi { notificacionId: number; mensaje: string; leida: boolean; fechaEnvio: string }
export function notificacionApi(d: NotificacionApi): NotificacionUsuario {
  return { id: d.notificacionId, mensaje: d.mensaje, leida: d.leida, fecha: d.fechaEnvio };
}

export interface AuditoriaApi { auditoriaId: number; accion: string; entidadAfectada: string; idEntidad: number | null; valorAnterior: string | null; valorNuevo: string | null; usuarioResponsable: string; fecha: string }
export function auditoriaApi(d: AuditoriaApi): EntradaAuditoria {
  return { id: d.auditoriaId, accion: d.accion, entidad: d.entidadAfectada, idEntidad: d.idEntidad, valorAnterior: d.valorAnterior,
    valorNuevo: d.valorNuevo, responsable: d.usuarioResponsable, fecha: d.fecha };
}

export interface PlanSeguimientoApi { planId: number; adopcionId: number; seguimientos: { seguimientoId: number; numero: number; fechaProgramada: string; fechaEnvio: string | null; estado: string; resultado: string | null; fotosUrls: string[] }[] }
export function planSeguimientoApi(d: PlanSeguimientoApi): PlanSeguimientoAdopcion {
  return {
    id: d.planId, adopcionId: d.adopcionId,
    seguimientos: d.seguimientos.map((s) => ({
      id: s.seguimientoId, numero: s.numero, fechaProgramada: s.fechaProgramada, fechaEnvio: s.fechaEnvio, fotos: s.fotosUrls ?? [],
      estado: enumPorNombre(s.estado, { pendiente: EstadoSeguimiento.Pendiente, enviado: EstadoSeguimiento.Enviado, vencido: EstadoSeguimiento.Vencido }, 'un estado de seguimiento'),
      // El backend manda el byte como texto ("0" o "1").
      // Desde 46c2e86 llega con nombre ("Conforme", "RequiereAtencion"); antes, como "0"/"1".
      resultado: s.resultado === null || s.resultado === undefined || s.resultado === '' ? null
        : /^\d+$/.test(s.resultado) ? (Number(s.resultado) === 1 ? ResultadoSeguimiento.RequiereAtencion : ResultadoSeguimiento.Conforme)
        : enumPorNombre(s.resultado, { conforme: ResultadoSeguimiento.Conforme, requiereatencion: ResultadoSeguimiento.RequiereAtencion }, 'un resultado de seguimiento'),
    })),
  };
}

/** Etiqueta legible de un estado de solicitud que llega como nombre de enum. */
export function etiquetaEstadoSolicitud(valor: string | null): string {
  if (!valor) return 'Sin estado previo';
  const estados: Record<string, string> = { enviada: 'Enviada', enrevision: 'En revisión', entrevista: 'Entrevista o visita', aprobada: 'Aprobada',
    rechazada: 'Rechazada', finalizada: 'Finalizada', cerrada: 'Cerrada', cancelada: 'Cancelada' };
  return estados[claveEnum(valor)] ?? valor;
}


/* ----- Reportes ciudadanos (ca46f35): tipo y estado llegan por nombre ----- */

const tipoReporte = (v: string) => enumPorNombre(v, { encalle: TipoReporte.EnCalle, herido: TipoReporte.Herido, maltrato: TipoReporte.Maltrato, otro: TipoReporte.Otro }, 'un tipo de reporte');
const estadoReporte = (v: string) => enumPorNombre(v, {
  recibido: EstadoReporte.Recibido, enatencion: EstadoReporte.EnAtencion, rescatado: EstadoReporte.Rescatado,
  noencontrado: EstadoReporte.NoEncontrado, cerrado: EstadoReporte.Cerrado,
}, 'un estado de reporte');

export interface ReporteMapaApi { reporteId: number; numeroReporte: string; tipo: string; estado: string; latitud: number; longitud: number }
export function pinReporteApi(d: ReporteMapaApi): PinReporte {
  return { id: d.reporteId, numeroReporte: d.numeroReporte, tipo: tipoReporte(d.tipo), estado: estadoReporte(d.estado), latitud: Number(d.latitud), longitud: Number(d.longitud) };
}

export interface ReporteResumenApi { reporteId: number; numeroReporte: string; tipo: string; descripcion: string; fechaReporte: string; estado: string; fotoPrincipal: string | null; reportanteNombre: string; asignadoAMi: boolean }
export function reporteBandejaApi(d: ReporteResumenApi): ReporteBandeja {
  return {
    id: d.reporteId, numeroReporte: d.numeroReporte, tipo: tipoReporte(d.tipo), estado: estadoReporte(d.estado),
    descripcion: d.descripcion, fechaReporte: d.fechaReporte, fotoPrincipal: d.fotoPrincipal || null,
    reportanteNombre: d.reportanteNombre, asignadoAMi: d.asignadoAMi === true,
  };
}

/** ReporteDetallePublicoDTO o ReporteDetalleDTO: el segundo agrega contacto, dirección y refugio. */
export interface ReporteDetalleApi {
  reporteId: number; numeroReporte: string; tipo: string; descripcion: string; fechaReporte: string; estado: string;
  latitud: number; longitud: number; fotos: string[] | null;
  direccion?: string | null; puntoReferencia?: string | null; refugioAsignado?: string | null;
  reportanteNombre?: string; reportanteTelefono?: string | null; mascotaId?: number | null;
}
export function detalleReporteApi(d: ReporteDetalleApi): DetalleReporte {
  return {
    id: d.reporteId, numeroReporte: d.numeroReporte, tipo: tipoReporte(d.tipo), estado: estadoReporte(d.estado),
    descripcion: d.descripcion, fechaReporte: d.fechaReporte, latitud: Number(d.latitud), longitud: Number(d.longitud),
    fotos: d.fotos ?? [], completo: d.reportanteNombre !== undefined,
    direccion: d.direccion || null, puntoReferencia: d.puntoReferencia || null, refugioAsignado: d.refugioAsignado || null,
    reportanteNombre: d.reportanteNombre || null, reportanteTelefono: d.reportanteTelefono || null, mascotaId: d.mascotaId ?? null,
  };
}
