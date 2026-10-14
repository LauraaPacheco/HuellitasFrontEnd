/**
 * Traduce lo que devuelve el backend a lo que espera el front.
 *
 * El backend responde al login con un objeto plano:
 *   { accessToken, refreshToken, expiraEnSegundos, nombre, rol }
 * donde `rol` es el NOMBRE del rol ("Refugio"), no su nivel.
 *
 * El front, en cambio, rutea y da permisos por `usuario.rol.nivel`, que es
 * un numero. Y necesita el correo y el id del usuario, que la respuesta no
 * trae pero el access token si, en sus claims.
 *
 * Toda esa costura vive aqui y en ningun otro lado: si Mateo cambia la
 * respuesta para que mande el usuario completo, se borra este archivo y no
 * se toca ninguna pantalla.
 */

import { EstadoUsuario, NivelRol } from '../types/enums';
import type { SesionDto, Usuario } from '../types/usuarios';

/** Lo que responde POST /api/v1/Auth/login y /refresh. */
export interface RespuestaTokenApi {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiraEnSegundos: number;
  readonly nombre: string;
  readonly rol: string;
}

/** Lo que responde POST /api/v1/Usuarios. */
export interface RespuestaRegistroApi {
  readonly mensaje: string;
  readonly usuarioId: number;
}

/** La sesion completa que guardamos, con lo que hace falta para renovarla. */
export interface SesionGuardada extends SesionDto {
  readonly refreshToken: string;
}

/**
 * Nombre del rol -> nivel. La tabla Roles tiene su propia columna Nivel,
 * pero el login solo manda el nombre; mientras siga asi, se mapea aqui.
 */
const NIVEL_POR_NOMBRE: Readonly<Record<string, NivelRol>> = {
  administrador: NivelRol.Administrador,
  admin: NivelRol.Administrador,
  refugio: NivelRol.Refugio,
  adoptante: NivelRol.Adoptante,
  visitante: NivelRol.Visitante,
};

export function nivelDesdeNombreRol(nombre: string): NivelRol {
  // Sin acentos y en minuscula, por si la tabla dice "Administrador".
  const clave = nombre
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
  // Adoptante es el rol con el que nace toda cuenta nueva: es el menos
  // peligroso como respaldo si llega un nombre que no conocemos.
  return NIVEL_POR_NOMBRE[clave] ?? NivelRol.Adoptante;
}

/* ---------- Lectura del access token ---------- */

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/**
 * Decodifica base64url a texto. Se hace a mano a proposito: atob existe en
 * el navegador pero no es seguro darlo por hecho en React Native, y traer
 * una dependencia por esto seria desproporcionado.
 */
function decodificarBase64Url(entrada: string): string {
  const limpio = entrada.replace(/-/g, '+').replace(/_/g, '/');
  let bits = 0;
  let acumulado = 0;
  const bytes: number[] = [];

  for (const caracter of limpio) {
    const valor = ALFABETO.indexOf(caracter);
    if (valor === -1) continue; // relleno '=' o basura
    acumulado = (acumulado << 6) | valor;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      bytes.push((acumulado >> bits) & 0xff);
    }
  }

  // Los claims pueden traer tildes, asi que se decodifica como UTF-8.
  let texto = '';
  for (let i = 0; i < bytes.length; i += 1) {
    const b = bytes[i]!;
    if (b < 0x80) {
      texto += String.fromCharCode(b);
    } else if (b < 0xe0) {
      texto += String.fromCharCode(((b & 0x1f) << 6) | (bytes[++i]! & 0x3f));
      } else if (b < 0xf0) {
      texto += String.fromCharCode(
        ((b & 0x0f) << 12) | ((bytes[++i]! & 0x3f) << 6) | (bytes[++i]! & 0x3f),
      );
    } else {
      const punto =
        ((b & 0x07) << 18) |
        ((bytes[++i]! & 0x3f) << 12) |
        ((bytes[++i]! & 0x3f) << 6) |
        (bytes[++i]! & 0x3f);
      texto += String.fromCodePoint(punto);
    }
  }
  return texto;
}

interface ClaimsToken {
  readonly sub?: string;
  readonly email?: string;
  /** ClaimTypes.Name y ClaimTypes.Role salen con su URI larga de .NET. */
  readonly [clave: string]: unknown;
}

/** Lee los claims del access token. Devuelve {} si el token no se deja leer. */
export function claimsDelToken(accessToken: string): ClaimsToken {
  try {
    const carga = accessToken.split('.')[1];
    if (!carga) return {};
    return JSON.parse(decodificarBase64Url(carga)) as ClaimsToken;
  } catch {
    return {};
  }
}

const URI_NOMBRE = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const URI_ROL = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';

/* ---------- Armado de la sesion ---------- */

/**
 * Construye la sesion del front a partir de la respuesta del backend.
 *
 * `correoEscrito` es el que la persona puso en el formulario: sirve de
 * respaldo si el token no trajera el claim de correo.
 */
export function sesionDesdeRespuesta(
  respuesta: RespuestaTokenApi,
  correoEscrito?: string,
): SesionGuardada {
  const claims = claimsDelToken(respuesta.accessToken);

  const id = Number(claims.sub ?? 0) || 0;
  const correo = (claims.email as string | undefined) ?? correoEscrito ?? '';
  const nombre =
    respuesta.nombre || (claims[URI_NOMBRE] as string | undefined) || correo;
  const nombreRol =
    respuesta.rol || (claims[URI_ROL] as string | undefined) || 'Adoptante';
  const ahora = new Date().toISOString();

  const usuario: Usuario = {
    id,
    activo: true,
    fechaCreacion: ahora,
    fechaModificacion: null,
    rolId: 0,
    rol: {
      id: 0,
      activo: true,
      fechaCreacion: ahora,
      fechaModificacion: null,
      nombre: nombreRol,
      nivel: nivelDesdeNombreRol(nombreRol),
      // El backend todavia no manda la lista de permisos; el front rutea
      // por nivel, asi que de momento no hace falta.
      permisos: [],
    },
    refugioId: null,
    nombre,
    correo,
    telefono: null,
    // Si pudo entrar es porque ya confirmo el correo: el backend rechaza
    // el login de una cuenta pendiente.
    estado: EstadoUsuario.Activo,
    fechaRegistro: ahora,
    perfil: null,
  };

  return {
    token: respuesta.accessToken,
    refreshToken: respuesta.refreshToken,
    expiraEn: new Date(
      Date.now() + respuesta.expiraEnSegundos * 1000,
    ).toISOString(),
    usuario,
  };
}

/** True si a la sesion le queda menos de un minuto de vida. */
export function sesionPorVencer(sesion: SesionGuardada): boolean {
  const vence = Date.parse(sesion.expiraEn);
  return Number.isFinite(vence) && vence - Date.now() < 60_000;
}
