import type { EntidadBase, FiltroPaginado } from './comun';
import type { EstadoSolicitud, EstadoVisita, Modalidad } from './enums';
import type { MascotaResumen } from './mascotas';

export interface DocumentoSoporte extends EntidadBase {
  readonly solicitudId: number;
  readonly tipo: string;
  readonly archivo: string;
  readonly fechaCarga: string;
}

export interface VisitaEntrevista extends EntidadBase {
  readonly solicitudId: number;
  readonly fecha: string;
  readonly modalidad: Modalidad;
  readonly estado: EstadoVisita;
}

export interface Adopcion extends EntidadBase {
  readonly solicitudId: number;
  readonly fechaFinalizacion: string;
  readonly codigoConstancia: string;
}

/** Fila de la bandeja del refugio (HU-ADO-03). */
export interface SolicitudResumen {
  readonly id: number;
  readonly codigo: string;
  readonly usuarioId: number;
  readonly nombreAdoptante: string;
  readonly perfilCompleto: boolean;
  readonly mascotaId: number;
  readonly nombreMascota: string;
  readonly fechaEnvio: string;
  readonly estado: EstadoSolicitud;
  /** Alimenta el resaltado ambar de las solicitudes demoradas. */
  readonly diasSinRespuesta: number;
}

export interface SolicitudAdopcion extends EntidadBase {
  readonly codigo: string;
  readonly usuarioId: number;
  readonly mascotaId: number;
  readonly mascota: MascotaResumen;
  readonly fechaEnvio: string;
  readonly estado: EstadoSolicitud;
  readonly respuestasFormulario: Readonly<Record<string, string>>;
  readonly observaciones: string | null;
  readonly motivoRechazo: string | null;
  readonly soportes: readonly DocumentoSoporte[];
  readonly visita: VisitaEntrevista | null;
  readonly adopcion: Adopcion | null;
}

/* ---------- Filtros y DTOs ---------- */

export interface FiltroSolicitud extends FiltroPaginado {
  estado?: EstadoSolicitud;
  mascotaId?: number;
  refugioId?: number;
  soloDemoradas?: boolean;
}

export interface CrearSolicitudDto {
  mascotaId: number;
  respuestasFormulario: Record<string, string>;
  aceptaCompromisos: boolean;
}

export interface DecisionSolicitudDto {
  observacion?: string;
}

export interface RechazoSolicitudDto {
  /** Obligatorio: la base de datos no acepta un rechazo sin motivo. */
  motivo: string;
}

export interface CrearVisitaDto {
  solicitudId: number;
  fecha: string;
  modalidad: Modalidad;
}
