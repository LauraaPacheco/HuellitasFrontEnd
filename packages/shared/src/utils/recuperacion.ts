/** Reglas de RestablecerContrasenaValidator del backend, más confirmación local. */
export function validarRestablecimiento(token: string, nuevaContrasena: string, confirmacion: string): string | null {
  if (!token.trim()) return 'Escribe el código que recibiste por correo.';
  if (nuevaContrasena.length < 8 || nuevaContrasena.length > 100) return 'La contraseña debe tener entre 8 y 100 caracteres.';
  if (nuevaContrasena !== confirmacion) return 'Las contraseñas no coinciden.';
  return null;
}
