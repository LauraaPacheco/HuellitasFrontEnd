/** Validaciones que replican las reglas del backend, para avisar antes de enviar. */

export const LONGITUD_MINIMA_CONTRASENA = 8;

const PATRON_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PATRON_TELEFONO = /^\d{10}$/;
const PATRON_NIT = /^\d{9,10}-?\d?$/;

export function esCorreoValido(valor: string): boolean {
  return PATRON_CORREO.test(valor.trim());
}

export function esTelefonoValido(valor: string): boolean {
  return PATRON_TELEFONO.test(valor.replace(/\s|-/g, ''));
}

export function esNitValido(valor: string): boolean {
  return PATRON_NIT.test(valor.replace(/[.\s]/g, ''));
}

export function esContrasenaValida(valor: string): boolean {
  return valor.length >= LONGITUD_MINIMA_CONTRASENA;
}

export type FuerzaContrasena = 'debil' | 'media' | 'fuerte';

export function fuerzaContrasena(valor: string): FuerzaContrasena {
  if (valor.length < LONGITUD_MINIMA_CONTRASENA) return 'debil';
  const variedad =
    Number(/[a-z]/.test(valor)) +
    Number(/[A-Z]/.test(valor)) +
    Number(/\d/.test(valor)) +
    Number(/[^A-Za-z0-9]/.test(valor));
  if (valor.length >= 12 && variedad >= 3) return 'fuerte';
  if (variedad >= 2) return 'media';
  return 'debil';
}
