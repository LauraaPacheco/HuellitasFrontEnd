export const MAX_ARCHIVOS_MASCOTA = 10;
export const MAX_FOTO_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const FORMATOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const FORMATOS_VIDEO = ['video/mp4', 'video/webm'] as const;
export function esFoto(tipo: string): boolean { return (FORMATOS_FOTO as readonly string[]).includes(tipo); }
export function validarArchivoMascota(archivo: { type: string; size: number }): string | null {
  const foto = esFoto(archivo.type);
  if (!foto && !(FORMATOS_VIDEO as readonly string[]).includes(archivo.type)) return 'Elige una foto JPG, PNG o WebP, o un video MP4 o WebM.';
  if (!Number.isFinite(archivo.size) || archivo.size <= 0) return 'El archivo está vacío.';
  if (archivo.size > (foto ? MAX_FOTO_BYTES : MAX_VIDEO_BYTES)) return foto ? 'Cada foto puede pesar hasta 5 MB.' : 'Cada video puede pesar hasta 25 MB.';
  return null;
}
/** Comprobación básica de cabecera para la demo; el servidor deberá decodificar y verificar el archivo completo. */
export function coincideFirmaArchivo(tipo: string, bytes: Uint8Array): boolean {
  const empieza = (...firma: number[]) => firma.every((valor, i) => bytes[i] === valor);
  const texto = (inicio: number, fin: number) => String.fromCharCode(...bytes.slice(inicio, fin));
  if (tipo === 'image/jpeg') return empieza(255, 216, 255);
  if (tipo === 'image/png') return empieza(137, 80, 78, 71, 13, 10, 26, 10);
  if (tipo === 'image/webp') return texto(0, 4) === 'RIFF' && texto(8, 12) === 'WEBP';
  if (tipo === 'video/mp4') return bytes.length >= 12 && texto(4, 8) === 'ftyp';
  if (tipo === 'video/webm') return empieza(26, 69, 223, 163);
  return false;
}
