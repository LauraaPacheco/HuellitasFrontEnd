import type { EntidadBase, FiltroPaginado, OpcionCatalogo } from './comun';
import type {
  EstadoMascota,
  Procedencia,
  Sexo,
  TipoMultimedia,
  TipoRegistroClinico,
} from './enums';

export interface Especie extends OpcionCatalogo {}
export interface Tamano extends OpcionCatalogo {}
export interface Color extends OpcionCatalogo {}
export interface Temperamento extends OpcionCatalogo {}

export interface Raza extends OpcionCatalogo {
  readonly especieId: number;
}

export interface Multimedia extends EntidadBase {
  readonly mascotaId: number | null;
  readonly reporteId: number | null;
  readonly seguimientoId: number | null;
  readonly tipo: TipoMultimedia;
  readonly archivo: string;
  readonly esPrincipal: boolean;
  readonly fechaCarga: string;
}

export interface RegistroClinico extends EntidadBase {
  readonly mascotaId: number;
  readonly tipo: TipoRegistroClinico;
  readonly fecha: string;
  readonly descripcion: string | null;
  readonly soporteVeterinario: string | null;
}

/** Version liviana para las tarjetas del catalogo. */
export interface MascotaResumen {
  readonly id: number;
  readonly nombre: string;
  readonly especie: string;
  readonly raza: string | null;
  readonly tamano: string | null;
  readonly sexo: Sexo;
  readonly edadAproximada: number | null;
  readonly estado: EstadoMascota;
  readonly fotoPrincipal: string | null;
  readonly refugioId: number | null;
  readonly refugioNombre: string | null;
  readonly refugioVerificado: boolean | null;
  /** La encuesta mostro que la informacion vencida es el problema #1 (P4). */
  readonly fechaUltimaActualizacion: string | null;
  readonly puntajeCompatibilidad: number | null;
}

export interface Mascota extends EntidadBase {
  readonly refugioId: number;
  readonly especieId: number;
  readonly razaId: number | null;
  readonly tamanoId: number;
  readonly colorId: number;
  readonly nombre: string;
  readonly sexo: Sexo;
  readonly edadAproximada: number | null;
  readonly descripcion: string | null;
  readonly esterilizada: boolean;
  readonly estado: EstadoMascota;
  readonly procedencia: Procedencia;
  readonly fechaIngreso: string;
  readonly fechaUltimaActualizacion: string;
  readonly motivoBaja: string | null;
  readonly temperamentos: readonly Temperamento[];
  readonly multimedia: readonly Multimedia[];
  readonly historialClinico: readonly RegistroClinico[];
}

export interface Favorito extends EntidadBase {
  readonly usuarioId: number;
  readonly mascotaId: number;
  readonly fecha: string;
}

/** Desglose del puntaje del Match, para explicarle al adoptante por que (HU-MAS-06). */
export interface FactorMatch {
  readonly nombre: string;
  readonly peso: number;
  readonly aporte: number;
}

export interface Compatibilidad extends EntidadBase {
  readonly perfilId: number;
  readonly mascotaId: number;
  readonly puntaje: number;
  readonly factores: readonly FactorMatch[];
  readonly fechaCalculo: string;
}

/* ---------- Filtros y DTOs ---------- */

export interface FiltroMascota extends FiltroPaginado {
  texto?: string;
  especieId?: number;
  razaId?: number;
  tamanoId?: number;
  sexo?: Sexo;
  edadMinima?: number;
  edadMaxima?: number;
  refugioId?: number;
  estado?: EstadoMascota;
}

export interface CrearMascotaDto {
  nombre: string;
  especieId: number;
  razaId?: number;
  tamanoId: number;
  colorId: number;
  sexo: Sexo;
  edadAproximada?: number;
  descripcion?: string;
  esterilizada: boolean;
  procedencia: Procedencia;
  fechaIngreso: string;
  temperamentoIds: number[];
}

export interface EditarMascotaDto extends Partial<CrearMascotaDto> {}

export interface CambioEstadoMascotaDto {
  nuevoEstado: EstadoMascota;
  motivo?: string;
}

export interface CrearRegistroClinicoDto {
  mascotaId: number;
  tipo: TipoRegistroClinico;
  fecha: string;
  descripcion?: string;
  soporteVeterinario?: string;
}
