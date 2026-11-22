import type { EditarRefugioDto, RedesSociales, SolicitudRefugioDto } from '../types/refugios';
import { esCorreoValido, esNitValido, esTelefonoValido } from './validacion';

export function validarRefugio(datos: EditarRefugioDto | SolicitudRefugioDto): string | null {
  if (!datos.nombre.trim()) return 'Escribe el nombre del refugio.';
  if ('nit' in datos && !esNitValido(datos.nit)) return 'El NIT no tiene un formato válido.';
  if (!datos.direccion.trim()) return 'Escribe la dirección del refugio.';
  if (!esTelefonoValido(datos.telefono)) return 'El teléfono debe tener 10 dígitos.';
  if (!esCorreoValido(datos.correo)) return 'Escribe un correo válido.';
  if (!datos.encargado.trim()) return 'Escribe el nombre de la persona encargada.';
  return null;
}

export function normalizarRefugio<T extends EditarRefugioDto>(datos: T): T {
  return Object.fromEntries(Object.entries(datos).map(([clave, valor]) => [clave,
    typeof valor === 'string' ? (clave === 'telefono' ? valor.replace(/\s|-/g, '') : valor.trim())
      : clave === 'redesSociales' ? limpiarRedesSociales(valor as RedesSociales | null) : valor,
  ])) as T;
}

/** Redes que el formulario ofrece; el orden es el de los campos. */
export const REDES_SOCIALES = [
  { clave: 'instagram', etiqueta: 'Instagram', marcador: '@turefugio' },
  { clave: 'facebook', etiqueta: 'Facebook', marcador: 'facebook.com/turefugio' },
  { clave: 'tiktok', etiqueta: 'TikTok', marcador: '@turefugio' },
  { clave: 'sitioWeb', etiqueta: 'Sitio web', marcador: 'https://turefugio.org' },
] as const;

/** Clave para un texto suelto guardado antes de que las redes fueran JSON. */
const CLAVE_LIBRE = 'otra';

/**
 * Lee las redes venga como venga: objeto (perfil propio), texto JSON (ficha
 * pública, que aún devuelve la columna cruda) o texto plano de registros
 * anteriores, que se conserva bajo la clave "otra".
 */
export function leerRedesSociales(valor: unknown): RedesSociales | null {
  if (valor == null) return null;
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!texto) return null;
    try {
      return leerRedesSociales(JSON.parse(texto));
    } catch {
      return { [CLAVE_LIBRE]: texto };
    }
  }
  if (typeof valor !== 'object' || Array.isArray(valor)) return null;
  return limpiarRedesSociales(
    Object.fromEntries(Object.entries(valor).filter((par): par is [string, string] => typeof par[1] === 'string')),
  );
}

/** Quita espacios y redes vacías. Sin ninguna red devuelve null. */
export function limpiarRedesSociales(redes: RedesSociales | null | undefined): RedesSociales | null {
  if (!redes) return null;
  const limpias = Object.entries(redes)
    .map(([clave, valor]) => [clave, valor.trim()] as const)
    .filter(([, valor]) => valor);
  return limpias.length ? Object.fromEntries(limpias) : null;
}

export function etiquetaRedSocial(clave: string): string {
  // "redes" es la clave con que el backend guarda el texto suelto de registros viejos.
  if (clave === CLAVE_LIBRE || clave === 'redes') return 'Otra';
  return REDES_SOCIALES.find((red) => red.clave === clave)?.etiqueta ?? clave;
}

/** "Instagram: @patitas · Facebook: patitas", o '' si no hay redes. */
export function describirRedesSociales(redes: RedesSociales | null | undefined): string {
  return Object.entries(limpiarRedesSociales(redes) ?? {})
    .map(([clave, valor]) => `${etiquetaRedSocial(clave)}: ${valor}`)
    .join(' · ');
}
