import type { FiltroPaginado } from './comun';
import type { EstadoDenuncia, EstadoModeracion, MotivoDenuncia, TipoContenido } from './enums';

/**
 * Administración (HU-ADM-01 a 04, HU-REF-04) contra /api/v1/Admin,
 * /Denuncias y /Politicas (8c9f391, adafb78).
 */

/* ---------- Usuarios (ADM-01) ---------- */

export interface UsuarioAdmin {
  readonly id: number;
  readonly nombre: string;
  readonly correo: string;
  /** Nombre del rol tal como lo manda el backend: Administrador, Refugio, Adoptante. */
  readonly rol: string;
  /** Activo, PendienteVerificacion, Inactivo… */
  readonly estado: string;
  readonly activo: boolean;
  readonly fechaRegistro: string;
}

export interface FiltroUsuarioAdmin extends FiltroPaginado {
  busqueda?: string;
  rolId?: number;
  estado?: number;
}

/** Ids de la tabla Roles (enum RolUsuario del backend; Visitante = 1 no se asigna). */
export const ROLES_ADMIN = [
  { id: 2, nombre: 'Administrador' },
  { id: 3, nombre: 'Refugio' },
  { id: 4, nombre: 'Adoptante' },
] as const;

/** Enum EstadoUsuario del backend, para el filtro del listado. */
export const ESTADOS_USUARIO_ADMIN = [
  { id: 1, nombre: 'Activo' },
  { id: 0, nombre: 'Pendiente de verificación' },
  { id: 2, nombre: 'Bloqueado' },
  { id: 3, nombre: 'Desactivado' },
] as const;

/* ---------- Denuncias (ADM-02) ---------- */

export interface Denuncia {
  readonly id: number;
  readonly denunciante: string;
  readonly tipoContenido: TipoContenido;
  readonly idContenido: number;
  readonly motivo: MotivoDenuncia;
  readonly descripcion: string | null;
  readonly estado: EstadoDenuncia;
  readonly resultado: string | null;
  readonly fecha: string;
}

export interface FiltroDenuncia extends FiltroPaginado {
  estado?: EstadoDenuncia;
}

export interface CrearDenunciaDto {
  tipoContenido: TipoContenido;
  idContenido: number;
  motivo: MotivoDenuncia;
  descripcion?: string;
}

export interface ResolverDenunciaDto {
  resultado: string;
  /** Oculta lo denunciado (mascota, refugio, opinión o reporte). */
  ocultarContenido: boolean;
}

/* ---------- Configuración y política (ADM-03) ---------- */

export interface ConfiguracionSistema {
  readonly id: number;
  readonly clave: string;
  readonly valor: string;
  readonly descripcion: string | null;
  readonly activo: boolean;
}

export interface GuardarConfiguracionDto {
  clave: string;
  valor: string;
  descripcion?: string;
}

export interface Politica {
  readonly id: number;
  readonly version: string;
  readonly contenido: string;
  readonly fechaPublicacion: string;
  /** La vigente; las demás son historial. */
  readonly activo: boolean;
}

export interface PublicarPoliticaDto {
  version: string;
  contenido: string;
}

/* ---------- Indicadores (ADM-04) ---------- */

export interface DashboardAdmin {
  readonly adopcionesExitosas: number;
  readonly mascotasDisponibles: number;
  readonly usuariosRegistrados: number;
  readonly refugiosVerificados: number;
  readonly reportesCiudadanos: number;
  readonly tiempoPromedioAdopcionDias: number;
  readonly reportesPorEstado: readonly { readonly estado: string; readonly total: number }[];
}

/* ---------- Moderación de opiniones (REF-04) ---------- */

export interface CalificacionAdmin {
  readonly id: number;
  readonly refugioId: number;
  readonly refugioNombre: string;
  readonly adoptanteNombre: string;
  readonly puntaje: number;
  readonly comentario: string | null;
  readonly estado: EstadoModeracion;
  readonly fecha: string;
}
