import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { crearApi, type AlmacenToken } from '@huellitas/shared';

const CLAVE_TOKEN = 'huellitas.token';

/**
 * En movil el token va en AsyncStorage. Para produccion conviene pasar
 * a expo-secure-store, que lo guarda cifrado en el Keychain o Keystore.
 */
const almacenMovil: AlmacenToken = {
  async obtener() {
    try {
      return await AsyncStorage.getItem(CLAVE_TOKEN);
    } catch {
      return null;
    }
  },
  async guardar(token) {
    try {
      await AsyncStorage.setItem(CLAVE_TOKEN, token);
    } catch {
      /* sin almacenamiento: la sesion dura lo que dure la app abierta */
    }
  },
  async limpiar() {
    try {
      await AsyncStorage.removeItem(CLAVE_TOKEN);
    } catch {
      /* nada que limpiar */
    }
  },
};

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

export const api = crearApi({
  urlBase: resolverUrlApi(),
  almacen: almacenMovil,
  modoDemo: MODO_DEMO,
  alExpirarSesion: () => alExpirar?.(),
});

export const almacen = almacenMovil;
