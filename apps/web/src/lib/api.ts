import { crearApi, type AlmacenToken } from '@huellitas/shared';

const CLAVE_TOKEN = 'huellitas.token';
const CLAVE_SESION = 'huellitas.sesion';

/** Con el demo encendido, la app responde con datos simulados. */
export const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === 'true';

/**
 * En la web el token vive en localStorage. Toda lectura va en try/catch
 * porque en modo privado o con las cookies bloqueadas puede lanzar.
 */
function almacenDe(clave: string): AlmacenToken {
  return {
    async obtener() {
      try {
        return window.localStorage.getItem(clave);
      } catch {
        return null;
      }
    },
    async guardar(valor) {
      try {
        window.localStorage.setItem(clave, valor);
      } catch {
        /* sin almacenamiento: la sesion dura lo que dure la pestana */
      }
    },
    async limpiar() {
      try {
        window.localStorage.removeItem(clave);
      } catch {
        /* nada que limpiar */
      }
    },
  };
}

const almacenWeb = almacenDe(CLAVE_TOKEN);

/**
 * La sesion completa (usuario y refresh token) va aparte del access token.
 * Conserva el contexto de rol y el refresh token; al abrir se actualiza
 * el perfil desde GET /api/v1/Usuarios/perfil.
 */
const almacenSesionWeb = almacenDe(CLAVE_SESION);

export const api = crearApi({
  urlBase: import.meta.env.VITE_URL_API ?? '',
  almacen: almacenWeb,
  modoDemo: MODO_DEMO,
  alExpirarSesion: () => {
    // Fuerza volver al login cuando la API responde 401.
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  },
});

export const almacen = almacenWeb;
export const almacenSesion = almacenSesionWeb;
