/** Formateo de fechas en espanol, sin dependencias externas. */

const FORMATO_CORTO = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const FORMATO_LARGO = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const FORMATO_HORA = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export function formatearFecha(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  return FORMATO_CORTO.format(new Date(iso));
}

export function formatearFechaLarga(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  return FORMATO_LARGO.format(new Date(iso));
}

export function formatearFechaHora(iso: string | null | undefined): string {
  if (!iso) return 'Sin fecha';
  return FORMATO_HORA.format(new Date(iso));
}

/**
 * Texto relativo para la frescura de la informacion.
 * La encuesta mostro que la informacion vencida es la queja principal (P4),
 * asi que cada ficha y cada tarjeta lo muestran.
 */
export function tiempoRelativo(iso: string | null | undefined): string {
  if (!iso) return 'Sin actualizar';
  const dias = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (dias <= 0) return 'Actualizada hoy';
  if (dias === 1) return 'Actualizada ayer';
  if (dias < 30) return `Actualizada hace ${dias} días`;
  const meses = Math.floor(dias / 30);
  if (meses === 1) return 'Actualizada hace un mes';
  if (meses < 12) return `Actualizada hace ${meses} meses`;
  return `Actualizada hace más de un año`;
}

/** Hace cuánto pasó algo, sin prefijo: "hace 5 min", "ayer", "hace 3 días". */
export function haceCuanto(iso: string | null | undefined): string {
  if (!iso) return '';
  const minutos = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (!Number.isFinite(minutos)) return '';
  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;
  const horas = Math.floor(minutos / 60);
  if (horas < 24) return horas === 1 ? 'hace 1 hora' : `hace ${horas} horas`;
  const dias = Math.floor(horas / 24);
  if (dias === 1) return 'ayer';
  if (dias < 30) return `hace ${dias} días`;
  return formatearFecha(iso);
}

export function diasDesde(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

/** Convierte una fecha a yyyy-MM-dd, que es lo que espera la API. */
export function aFechaIso(fecha: Date): string {
  return fecha.toISOString().slice(0, 10);
}
