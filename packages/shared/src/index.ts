/**
 * Huellitas - codigo compartido entre la app web y la app movil.
 *
 * Aqui no entra nada que dependa del DOM ni de react-native: solo
 * tipos, logica pura, el cliente HTTP y los tokens de diseno.
 */

export * from './types';
export * from './api';
export * from './utils';
export * as tokens from './tokens';
export * as demo from './demo';

/** Credenciales del modo demostracion, para mostrarlas en pantalla. */
export { CONTRASENA_DEMO, USUARIOS_DEMO } from './demo/datos';
