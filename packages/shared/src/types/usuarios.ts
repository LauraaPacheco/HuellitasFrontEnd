import type { EntidadBase } from './comun';
import type { EstadoUsuario, NivelRol, TipoVivienda } from './enums';

export interface Rol extends EntidadBase {
  readonly nombre: string;
  readonly nivel: NivelRol;
  readonly permisos: readonly string[];
}

export interface Usuario extends EntidadBase {
  readonly rolId: number;
  readonly rol: Rol;
  readonly refugioId: number | null;
  readonly nombre: string;
  readonly correo: string;
  readonly telefono: string | null;
  readonly estado: EstadoUsuario;
  readonly fechaRegistro: string;
  readonly perfil: PerfilAdoptante | null;
}

export interface PerfilAdoptante extends EntidadBase {
  readonly usuarioId: number;
  readonly tipoVivienda: TipoVivienda | null;
  readonly espacioDisponible: string | null;
  readonly presenciaDeNinos: boolean | null;
  readonly otrasMascotas: boolean | null;
  readonly tiempoDisponible: string | null;
  readonly experienciaPrevia: boolean | null;
  /** Lo calcula el backend; alimenta el aviso de perfil incompleto. */
  readonly porcentajeCompletitud: number;
}

export interface ConsentimientoDatos extends EntidadBase {
  readonly usuarioId: number;
  readonly politicaId: number;
  readonly versionAceptada: string;
  readonly fechaAceptacion: string;
}

/* ---------- DTOs de entrada ---------- */

export interface RegistroDto {
  nombre: string;
  correo: string;
  contrasena: string;
  telefono: string;
  aceptaPolitica: boolean;
}

export interface LoginDto {
  correo: string;
  contrasena: string;
}

export interface RecuperacionDto {
  correo: string;
}

export interface RestablecerDto {
  token: string;
  nuevaContrasena: string;
}

export interface EditarPerfilDto {
  nombre?: string;
  telefono?: string;
}

export interface PerfilAdoptanteDto {
  tipoVivienda: TipoVivienda;
  espacioDisponible: string;
  presenciaDeNinos: boolean;
  otrasMascotas: boolean;
  tiempoDisponible: string;
  experienciaPrevia: boolean;
}

/* ---------- DTOs de salida ---------- */

export interface SesionDto {
  readonly token: string;
  readonly expiraEn: string;
  readonly usuario: Usuario;
}
