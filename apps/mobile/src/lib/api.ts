import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { crearApi, type AlmacenToken } from '@huellitas/shared';

const CLAVE_TOKEN = 'huellitas.token';
const CLAVE_SESION = 'huellitas.sesion';

/**
 * En movil el token va en AsyncStorage. Para produccion conviene pasar
 * a expo-secure-store, que lo guarda cifrado en el Keychain o Keystore.
 */
function almacenDe(clave: string): AlmacenToken {
  return {
    async obtener() {
      try {
        return await AsyncStorage.getItem(clave);
      } catch {
        return null;
      }
    },
    async guardar(valor) {
      try {
        await AsyncStorage.setItem(clave, valor);
      } catch {
        /* sin almacenamiento: la sesion dura lo que dure la app abierta */
      }
    },
    async limpiar() {
      try {
        await AsyncStorage.removeItem(clave);
      } catch {
        /* nada que limpiar */
      }
    },
  };
}

const almacenMovil = almacenDe(CLAVE_TOKEN);

/**
 * La sesion completa (usuario y refresh token) va aparte del access token.
 * Hace falta porque el backend todavia no expone GET /usuarios/yo: sin
 * esto, al reabrir la app no habria forma de saber quien entro.
 */
const almacenSesionMovil = almacenDe(CLAVE_SESION);

function resolverUrlApi(): string {
  const desdeEntorno = process.env.EXPO_PUBLIC_URL_API;
  if (desdeEntorno) return desdeEntorno;
  const desdeConfig = Constants.expoConfig?.extra?.urlApi;
  return typeof desdeConfig === 'string' ? desdeConfig : '';
}

/** Con el demo encendido, la app responde con datos simulados. */
export const MODO_DEMO = process.env.EXPO_PUBLIC_MODO_DEMO === 'true';

let alExpirar: (() => void) | undefined;

/** La capa de sesion registra aqui qué hacer cuando la API responde 401. */
export function registrarExpiracionSesion(callback: () => void): void {
  alExpirar = callback;
}

/**
 * Con el backend detras de un tunel de devtunnels hay que mandar su
 * cabecera. No tiene nada que ver con la sesion del usuario y desaparece
 * sola cuando el backend este publicado de verdad.
 */
function cabecerasDelTunel(): Record<string, string> | undefined {
  const token = process.env.EXPO_PUBLIC_TUNEL_TOKEN;
  return token ? { 'X-Tunnel-Authorization': `tunnel ${token}` } : undefined;
}

export const api = crearApi({
  urlBase: resolverUrlApi(),
  almacen: almacenMovil,
  modoDemo: MODO_DEMO,
  cabecerasExtra: cabecerasDelTunel(),
  alExpirarSesion: () => alExpirar?.(),
});

export const almacen = almacenMovil;
export const almacenSesion = almacenSesionMovil;
