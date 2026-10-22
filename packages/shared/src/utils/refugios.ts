import type { EditarRefugioDto, SolicitudRefugioDto } from '../types/refugios';
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
    typeof valor === 'string' ? (clave === 'telefono' ? valor.replace(/\s|-/g, '') : valor.trim()) : valor,
  ])) as T;
}
