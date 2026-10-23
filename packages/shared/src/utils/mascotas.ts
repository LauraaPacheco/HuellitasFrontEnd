import type { CrearMascotaDto } from '../types/mascotas';
import { EstadoMascota, Procedencia, Sexo } from '../types/enums';

export function validarMascota(datos: CrearMascotaDto): Record<string, string> {
  const errores: Record<string, string> = {};
  if (!datos.nombre?.trim() || datos.nombre.trim().length > 100) errores.nombre = 'Escribe un nombre de hasta 100 caracteres.';
  for (const campo of ['especieId', 'tamanoId', 'colorId'] as const) {
    if (!Number.isInteger(datos[campo]) || datos[campo] <= 0) errores[campo] = 'Selecciona una opción.';
  }
  if (datos.razaId !== undefined && (!Number.isInteger(datos.razaId) || datos.razaId <= 0)) errores.razaId = 'Selecciona una raza válida.';
  if (![Sexo.Macho, Sexo.Hembra].includes(datos.sexo)) errores.sexo = 'Selecciona el sexo.';
  if (![Procedencia.Rescate, Procedencia.EntregaVoluntaria, Procedencia.ReporteCiudadano].includes(datos.procedencia)) errores.procedencia = 'Selecciona la procedencia.';
  if (datos.edadAproximada !== undefined && (!Number.isFinite(datos.edadAproximada) || datos.edadAproximada < 0)) errores.edadAproximada = 'La edad debe ser un número de años mayor o igual a cero.';
  const fecha = new Date(`${datos.fechaIngreso}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(datos.fechaIngreso) || !Number.isFinite(fecha.getTime()) || fecha.toISOString().slice(0, 10) !== datos.fechaIngreso || datos.fechaIngreso > new Date().toLocaleDateString('sv-SE')) errores.fechaIngreso = 'Indica una fecha de ingreso válida que no sea futura.';
  if (typeof datos.esterilizada !== 'boolean') errores.esterilizada = 'Indica si está esterilizada.';
  if (!Array.isArray(datos.temperamentoIds) || datos.temperamentoIds.some(id => !Number.isInteger(id) || id <= 0)) errores.temperamentoIds = 'Selecciona temperamentos válidos.';
  return errores;
}

/** En proceso y Adoptada se reservarán para el flujo formal de adopción. */
export function estadosManualesMascota(actual: EstadoMascota): readonly EstadoMascota[] {
  if (actual === EstadoMascota.Disponible) return [EstadoMascota.NoDisponible];
  if (actual === EstadoMascota.NoDisponible) return [EstadoMascota.Disponible];
  return [];
}
