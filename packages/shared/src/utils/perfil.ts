import { TipoVivienda } from '../types/enums';
import type { PerfilAdoptanteDto } from '../types/usuarios';
import { esTelefonoValido } from './validacion';

export interface DatosPersonalesFormulario { nombre: string; telefono: string }
export interface PerfilAdoptanteFormulario {
  tipoVivienda: TipoVivienda | null;
  espacioDisponible: string;
  presenciaDeNinos: boolean | null;
  otrasMascotas: boolean | null;
  tiempoDisponible: string;
  experienciaPrevia: boolean | null;
}
export type ErroresFormulario<T> = Partial<Record<keyof T, string>>;

export function validarDatosPersonales(datos: DatosPersonalesFormulario): ErroresFormulario<DatosPersonalesFormulario> {
  const errores: ErroresFormulario<DatosPersonalesFormulario> = {};
  if (!datos.nombre.trim()) errores.nombre = 'Escribe tu nombre completo.';
  else if (datos.nombre.trim().length > 120) errores.nombre = 'El nombre admite hasta 120 caracteres.';
  if (!esTelefonoValido(datos.telefono)) errores.telefono = 'El teléfono debe tener 10 dígitos.';
  return errores;
}

export function validarPerfilAdoptante(datos: PerfilAdoptanteFormulario): ErroresFormulario<PerfilAdoptanteFormulario> {
  const errores: ErroresFormulario<PerfilAdoptanteFormulario> = {};
  if (![TipoVivienda.Casa, TipoVivienda.Apartamento, TipoVivienda.Finca].includes(datos.tipoVivienda as TipoVivienda)) {
    errores.tipoVivienda = 'Elige el tipo de vivienda.';
  }
  if (!datos.espacioDisponible.trim()) errores.espacioDisponible = 'Describe el espacio disponible.';
  if (!datos.tiempoDisponible.trim()) errores.tiempoDisponible = 'Indica cuánto tiempo puedes dedicarle.';
  if (datos.espacioDisponible.trim().length > 80) errores.espacioDisponible = 'Máximo 80 caracteres.';
  if (datos.tiempoDisponible.trim().length > 80) errores.tiempoDisponible = 'Máximo 80 caracteres.';
  for (const campo of ['presenciaDeNinos', 'otrasMascotas', 'experienciaPrevia'] as const) {
    if (typeof datos[campo] !== 'boolean') errores[campo] = 'Selecciona Sí o No.';
  }
  return errores;
}

/** Convierte solo un formulario completo; false es una respuesta válida. */
export function prepararPerfilAdoptante(datos: PerfilAdoptanteFormulario): PerfilAdoptanteDto {
  if (Object.keys(validarPerfilAdoptante(datos)).length) throw new Error('Completa el perfil antes de guardar.');
  return {
    tipoVivienda: datos.tipoVivienda!,
    espacioDisponible: datos.espacioDisponible.trim(),
    tiempoDisponible: datos.tiempoDisponible.trim(),
    presenciaDeNinos: datos.presenciaDeNinos!,
    otrasMascotas: datos.otrasMascotas!,
    experienciaPrevia: datos.experienciaPrevia!,
  };
}
