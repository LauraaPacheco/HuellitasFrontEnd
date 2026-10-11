import type { EntidadBase, FiltroPaginado } from './comun';
import type {
  EstadoDenuncia,
  EstadoUsuario,
  MotivoDenuncia,
  NivelRol,
  TipoContenido,
} from './enums';

export interface Denuncia extends EntidadBase {
  readonly usuarioId: number;
  readonly nombreDenunciante: string;
  readonly tipoContenido: TipoContenido;
  readonly idContenido: number;
  readonly motivo: MotivoDenuncia;
  readonly descripcion: string | null;
  readonly estado: EstadoDenuncia;
  readonly resultado: string | null;
  readonly fecha: string;
}

export interface PoliticaDatos extends EntidadBase {
  readonly version: string;
  readonly contenido: string;
  readonly fechaPublicacion: string;
  readonly esVigente: boolean;
}

export interface ConfiguracionSistema extends EntidadBase {
  readonly clave: string;
  readonly valor: string;
  readonly descripcion: string | null;
}

/** Claves conocidas de ConfiguracionSistema. Evita strings sueltos en el codigo. */
export const CLAVES_CONFIGURACION = {
  diasAlertaDesactualizacion: 'dias_alerta_desactualizacion',
  seguimientosPorDefecto: 'seguimientos_por_defecto',
  diasRecordatorioSeguimiento: 'dias_recordatorio_seguimiento',
  diasAlertaSolicitudSinRespuesta: 'dias_alerta_solicitud_sin_respuesta',
  maxArchivosMascota: 'max_archivos_mascota',
  maxIntentosLogin: 'max_intentos_login',
  minutosBloqueoLogin: 'minutos_bloqueo_login',
  minutosVigenciaToken: 'minutos_vigencia_token',
  canalesDenunciaMaltrato: 'canales_denuncia_maltrato',
} as const;

export type ClaveConfiguracion =
  (typeof CLAVES_CONFIGURACION)[keyof typeof CLAVES_CONFIGURACION];

/* ---------- Indicadores: no son entidades, se calculan ---------- */

export interface Indicador {
  readonly nombre: string;
  readonly valor: number;
  readonly periodo: string;
}

export interface DashboardRefugio {
  readonly mascotasPorEstado: Readonly<Record<string, number>>;
  readonly solicitudesPorEstado: Readonly<Record<string, number>>;
  readonly adopcionesDelPeriodo: number;
  readonly tiempoPromedioRespuestaDias: number;
  readonly tiempoPromedioAdopcionDias: number;
  readonly tasaAprobacion: number;
  readonly cumplimientoSeguimientos: number;
}

export interface DashboardGeneral {
  readonly totalRefugios: number;
  readonly refugiosVerificados: number;
  readonly totalUsuarios: number;
  readonly adopcionesDelPeriodo: number;
  readonly reportesPorEstado: Readonly<Record<string, number>>;
  readonly reportesPorZona: readonly Indicador[];
}

/* ---------- Filtros y DTOs ---------- */

export interface FiltroUsuario extends FiltroPaginado {
  texto?: string;
  nivelRol?: NivelRol;
  estado?: EstadoUsuario;
}

export interface FiltroDenuncia extends FiltroPaginado {
  estado?: EstadoDenuncia;
  tipoContenido?: TipoContenido;
}

export interface CrearDenunciaDto {
  tipoContenido: TipoContenido;
  idContenido: number;
  motivo: MotivoDenuncia;
  descripcion?: string;
}

export interface ResolverDenunciaDto {
  resultado: string;
  ocultarContenido: boolean;
}

export interface ModeracionDto {
  tipoContenido: TipoContenido;
  idContenido: number;
  motivo: string;
}

export interface CambioRolDto {
  rolId: number;
}
