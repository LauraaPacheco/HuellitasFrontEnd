import { crearApi, type AlmacenToken } from '@huellitas/shared';

const CLAVE_TOKEN = 'huellitas.token';

/** Con el demo encendido, la app responde con datos simulados. */
export const MODO_DEMO = import.meta.env.VITE_MODO_DEMO === 'true';

/**
 * En la web el token vive en localStorage. Toda lectura va en try/catch
 * porque en modo privado o con las cookies bloqueadas puede lanzar.
 */
const almacenWeb: AlmacenToken = {
  async obtener() {
    try {
      return window.localStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  async guardar(token) {
    try {
      window.localStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* sin almacenamiento: la sesion dura lo que dure la pestana */
    }
  },
  async limpiar() {
    try {
      window.localStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* nada que limpiar */
    }
  },
};

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
