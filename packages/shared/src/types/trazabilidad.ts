import type { EntidadBase, EntidadInmutable, FiltroPaginado } from './comun';
import type {
  CanalNotificacion,
  EstadoSeguimiento,
  ResultadoSeguimiento,
  TipoEvento,
} from './enums';
import type { Multimedia } from './mascotas';

/**
 * Registro de una transicion de estado. Es compartido: entidad e idEntidad
 * apuntan a una solicitud de adopcion o a un reporte ciudadano.
 */
export interface CambioDeEstado extends EntidadInmutable {
  readonly usuarioId: number | null;
  readonly nombreUsuario: string | null;
  readonly entidad: 'SolicitudAdopcion' | 'ReporteCiudadano';
  readonly idEntidad: number;
  readonly estadoAnterior: string | null;
  readonly estadoNuevo: string;
  readonly observacion: string | null;
}

/** Bitacora de la mascota: toda su historia en orden cronologico (HU-TRA-02). */
export interface Bitacora extends EntidadInmutable {
  readonly mascotaId: number;
  readonly tipo: TipoEvento;
  readonly descripcion: string;
}

export interface PlanSeguimiento extends EntidadBase {
  readonly adopcionId: number;
  readonly cantidadSeguimientos: number;
  readonly periodicidad: string;
  readonly seguimientos: readonly Seguimiento[];
  readonly porcentajeCumplimiento: number;
}

export interface Seguimiento extends EntidadBase {
  readonly planId: number;
  readonly numero: number;
  readonly fechaProgramada: string;
  readonly fechaEnvio: string | null;
  readonly estadoSalud: string | null;
  readonly adaptacion: string | null;
  readonly comentarios: string | null;
  readonly resultado: ResultadoSeguimiento | null;
  readonly estado: EstadoSeguimiento;
  readonly evidencias: readonly Multimedia[];
}

export interface Notificacion extends EntidadInmutable {
  readonly usuarioId: number;
  readonly tipo: string;
  readonly mensaje: string;
  readonly canal: CanalNotificacion;
  readonly fechaEnvio: string;
  readonly leida: boolean;
}

export interface RegistroAuditoria extends EntidadInmutable {
  readonly usuarioId: number | null;
  readonly nombreUsuario: string | null;
  readonly accion: string;
  readonly entidadAfectada: string;
  readonly idEntidad: number | null;
  readonly valorAnterior: string | null;
  readonly valorNuevo: string | null;
}

/** Una etapa de la linea de tiempo que ve el adoptante (HU-TRA-01). */
export interface EtapaLineaTiempo {
  readonly etiqueta: string;
  readonly estado: 'completada' | 'actual' | 'pendiente';
  readonly fecha: string | null;
  readonly detalle: string | null;
}

/* ---------- DTOs ---------- */

export interface ReporteSeguimientoDto {
  estadoSalud: string;
  adaptacion: string;
  comentarios?: string;
}

export interface RevisarSeguimientoDto {
  resultado: ResultadoSeguimiento;
}

export interface FiltroAuditoria extends FiltroPaginado {
  usuarioId?: number;
  accion?: string;
  entidadAfectada?: string;
  desde?: string;
  hasta?: string;
}
