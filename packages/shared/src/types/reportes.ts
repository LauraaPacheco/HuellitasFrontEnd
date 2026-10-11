import type { EntidadBase, FiltroPaginado } from './comun';
import type { EstadoReporte, TipoReporte } from './enums';
import type { Multimedia } from './mascotas';

/** Objeto de valor embebido en el reporte: no tiene vida propia. */
export interface Ubicacion {
  readonly latitud: number;
  readonly longitud: number;
  readonly direccion: string | null;
  readonly puntoDeReferencia: string | null;
}

export interface ReporteResumen {
  readonly id: number;
  readonly numeroReporte: string;
  readonly tipo: TipoReporte;
  readonly estado: EstadoReporte;
  readonly fechaReporte: string;
  readonly zona: string | null;
  readonly fotoPrincipal: string | null;
  readonly refugioAsignado: string | null;
  /** Los heridos y los casos de maltrato se muestran primero. */
  readonly esPrioritario: boolean;
}

export interface ReporteCiudadano extends EntidadBase {
  readonly numeroReporte: string;
  readonly usuarioId: number;
  readonly nombreReportante: string;
  readonly refugioId: number | null;
  readonly refugioNombre: string | null;
  readonly mascotaId: number | null;
  readonly tipo: TipoReporte;
  readonly descripcion: string;
  readonly fechaReporte: string;
  readonly estado: EstadoReporte;
  readonly motivoCierre: string | null;
  readonly ubicacion: Ubicacion;
  readonly evidencias: readonly Multimedia[];
}

/* ---------- Filtros y DTOs ---------- */

export interface FiltroReporte extends FiltroPaginado {
  tipo?: TipoReporte;
  estado?: EstadoReporte;
  refugioId?: number;
  soloActivos?: boolean;
  desde?: string;
  hasta?: string;
}

export interface CrearReporteDto {
  tipo: TipoReporte;
  descripcion: string;
  latitud: number;
  longitud: number;
  direccion?: string;
  puntoDeReferencia?: string;
}

export interface CambioEstadoReporteDto {
  nuevoEstado: EstadoReporte;
  motivo?: string;
}
