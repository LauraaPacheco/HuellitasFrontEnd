import type { EstadoReporte, Sexo, TipoReporte } from './enums';

/**
 * Reportes ciudadanos (HU-REP-01 a 04) contra /api/v1/Reportes (ca46f35, 7f6a3f1).
 * El backend parte la información en tres vistas: el mapa (público, solo
 * ubicación), la bandeja del refugio (sin ubicación) y el detalle.
 */

/** GET /mapa: pin público. Solo trae reportes Recibido, En atención y Rescatado. */
export interface PinReporte {
  readonly id: number;
  readonly numeroReporte: string;
  readonly tipo: TipoReporte;
  readonly estado: EstadoReporte;
  readonly latitud: number;
  readonly longitud: number;
}

/** GET /bandeja: los reportes libres y los que ya tomó el refugio que consulta. */
export interface ReporteBandeja {
  readonly id: number;
  readonly numeroReporte: string;
  readonly tipo: TipoReporte;
  readonly estado: EstadoReporte;
  readonly descripcion: string;
  readonly fechaReporte: string;
  readonly fotoPrincipal: string | null;
  readonly reportanteNombre: string;
  readonly asignadoAMi: boolean;
}

/**
 * GET /{id}. Lo público (tipo, descripción, fotos, ubicación) lo ve
 * cualquiera; el resto solo el refugio asignado, el admin o quien reportó.
 * `completo` dice cuál de las dos versiones llegó.
 */
export interface DetalleReporte {
  readonly id: number;
  readonly numeroReporte: string;
  readonly tipo: TipoReporte;
  readonly estado: EstadoReporte;
  readonly descripcion: string;
  readonly fechaReporte: string;
  readonly latitud: number;
  readonly longitud: number;
  readonly fotos: readonly string[];
  readonly completo: boolean;
  readonly direccion: string | null;
  readonly puntoReferencia: string | null;
  readonly refugioAsignado: string | null;
  readonly reportanteNombre: string | null;
  readonly reportanteTelefono: string | null;
  /** La ficha creada desde el reporte rescatado. */
  readonly mascotaId: number | null;
}

/* ---------- DTOs ---------- */

/** POST / (también sin sesión) y PUT /{id} (solo administrador). */
export interface CrearReporteDto {
  tipo: TipoReporte;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  puntoReferencia?: string;
  /** Ya subidas a /api/v1/Archivos (eso sí pide sesión). */
  fotosUrls?: readonly string[];
}

export type EditarReporteDto = CrearReporteDto;

export interface ReporteCreado {
  readonly id: number;
  readonly numeroReporte: string;
}

/** Desde En atención a Rescatado, No encontrado o Cerrado; los dos últimos piden motivo. */
export interface CambioEstadoReporteDto {
  nuevoEstado: EstadoReporte;
  motivo?: string;
}

/** POST /{id}/convertir-mascota: solo con el reporte Rescatado y por el refugio asignado. */
export interface ConvertirReporteDto {
  nombre: string;
  especieId: number;
  razaId?: number | null;
  tamanoId: number;
  colorId: number;
  sexo: Sexo;
  edadAproximada?: number | null;
  descripcion?: string;
  esterilizada: boolean;
}
