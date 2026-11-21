import type { EntidadBase } from './comun';
import type {
  EstadoApadrinamiento,
  EstadoModeracion,
  EstadoNecesidad,
  EstadoVerificacion,
  TipoNecesidad,
} from './enums';

/**
 * Redes del refugio como pares red → usuario o enlace. El backend lo guarda
 * como JSON (`Dictionary<string, string>`), así que se admiten claves que
 * el front no conozca y se conservan al editar.
 */
export type RedesSociales = Readonly<Record<string, string>>;

export interface Refugio extends EntidadBase {
  readonly nombre: string;
  readonly nit: string;
  readonly direccion: string;
  readonly telefono: string | null;
  readonly correo: string | null;
  readonly encargado: string | null;
  readonly redesSociales: RedesSociales | null;
  readonly descripcion: string | null;
  readonly estadoVerificacion: EstadoVerificacion;
  readonly fechaVerificacion: string | null;
  readonly motivoRechazo: string | null;
  /** Calculados por el backend para el perfil publico. */
  readonly promedioCalificacion: number | null;
  readonly totalAdopciones: number | null;
  readonly requisitos: readonly RequisitoAdopcion[];
}

export interface RequisitoAdopcion extends EntidadBase {
  readonly refugioId: number;
  readonly descripcion: string;
  readonly esObligatorio: boolean;
  readonly orden: number;
}

export interface Necesidad extends EntidadBase {
  readonly refugioId: number;
  readonly tipo: TipoNecesidad;
  readonly descripcion: string;
  readonly medioDonacion: string | null;
  readonly estado: EstadoNecesidad;
  readonly fechaPublicacion: string;
}

export interface Apadrinamiento extends EntidadBase {
  readonly usuarioId: number;
  readonly mascotaId: number;
  readonly fechaInicio: string;
  readonly fechaFin: string | null;
  readonly estado: EstadoApadrinamiento;
  readonly observacion: string | null;
}

export interface Calificacion extends EntidadBase {
  readonly refugioId: number;
  readonly usuarioId: number;
  readonly adopcionId: number;
  readonly nombreAutor: string;
  readonly puntaje: number;
  readonly comentario: string | null;
  readonly estadoModeracion: EstadoModeracion;
  readonly fecha: string;
}

/* ---------- DTOs ---------- */

export interface SolicitudRefugioDto {
  nombre: string;
  nit: string;
  direccion: string;
  telefono: string;
  correo: string;
  encargado: string;
  redesSociales?: RedesSociales | null;
  descripcion?: string;
}

/** Datos editables; NIT y verificación solo se gestionan por su flujo específico. */
export type EditarRefugioDto = Omit<SolicitudRefugioDto, 'nit'>;

export interface MotivoDto {
  motivo: string;
}

export interface CalificarDto {
  refugioId: number;
  adopcionId: number;
  puntaje: number;
  comentario?: string;
}

/* ---------- HU-REF-03 y 04 contra el backend real (95d5da4, 49b28ea) ---------- */

/** Necesidad de donación que publica el refugio. */
export interface NecesidadRefugio {
  readonly id: number;
  readonly tipo: TipoNecesidad;
  readonly descripcion: string;
  /** Cómo donar, por ejemplo "Nequi 3001234567". */
  readonly medioDonacion: string | null;
  readonly estado: EstadoNecesidad;
  readonly fechaPublicacion: string;
}

export interface GuardarNecesidadDto {
  tipo: TipoNecesidad;
  descripcion: string;
  medioDonacion?: string;
}

/** Solicitud o padrinazgo vigente de una mascota. */
export interface ApadrinamientoResumen {
  readonly id: number;
  readonly mascotaId: number;
  readonly mascotaNombre: string;
  readonly refugioNombre: string | null;
  readonly padrinoNombre: string;
  readonly fechaInicio: string;
  readonly estado: EstadoApadrinamiento;
  readonly observacion: string | null;
}

/** Opinión pública de un adoptante sobre el refugio (1 a 5). */
export interface OpinionRefugio {
  readonly id: number;
  readonly autor: string;
  readonly puntaje: number;
  readonly comentario: string | null;
  readonly fecha: string;
}

export interface CalificarRefugioDto {
  adopcionId: number;
  puntaje: number;
  comentario?: string;
}

