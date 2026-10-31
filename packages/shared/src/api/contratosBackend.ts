import { ErrorHttp } from './client';
import { EstadoMascota, EstadoSolicitud, Sexo } from '../types/enums';
import type { MascotaResumen } from '../types/mascotas';
import type { SolicitudResumen } from '../types/adopcion';
import type { Paginado } from '../types/comun';
export interface PerfilUsuarioApi { id: number; nombre: string; correo: string; telefono: string | null; fotoUrl: string | null; estado: string; fechaRegistro: string; politicaAceptada?: string | null; fechaAceptacionPolitica?: string | null }
export interface PerfilAdoptanteApi { tipoVivienda: string | null; espacioDisponible: string | null; presenciaDeNinos: boolean | null; otrasMascotas: boolean | null; tiempoDisponible: string | null; experienciaPrevia: boolean | null; porcentajeCompletitud: number }
export interface ResumenMascotaApi { id: number; nombre: string; especie: string; raza: string | null; sexo: string; edadAproximada: number; fotoPrincipal: string | null; estado: string; fechaCreacion: string }
export interface DetalleMascotaApi extends Omit<ResumenMascotaApi, 'fotoPrincipal' | 'fechaCreacion'> { descripcion: string | null; esterilizada: boolean; refugio: string; refugioTelefono: string | null; fotos: string[] }
export interface FichaMascotaPublica { id: number; nombre: string; especie: string; raza: string | null; sexo: Sexo; edadAproximada: number | null; descripcion: string | null; esterilizada: boolean; estado: EstadoMascota; refugioNombre: string; refugioTelefono: string | null; refugioId?: number; fotos: readonly string[] }
export interface PaginadoApi<T> { items: T[]; pagina: number; tamanoPagina: number; totalRegistros: number; totalPaginas: number }
const clave = (valor: string) => valor.trim().toLowerCase().replace(/\s/g, '');
export function estadoMascotaApi(valor: string): EstadoMascota {
  const estados: Record<string, EstadoMascota> = { disponible: EstadoMascota.Disponible, enproceso: EstadoMascota.EnProceso, adoptada: EstadoMascota.Adoptada, nodisponible: EstadoMascota.NoDisponible };
  const estado = estados[clave(valor)];
  if (estado === undefined) throw new ErrorHttp({ titulo: 'El servidor devolvió un estado de mascota no reconocido.', estadoHttp: 502 });
  return estado;
}
export function sexoApi(valor: string): Sexo {
  if (clave(valor) === 'macho') return Sexo.Macho;
  if (clave(valor) === 'hembra') return Sexo.Hembra;
  throw new ErrorHttp({ titulo: 'El servidor devolvió un sexo no reconocido.', estadoHttp: 502 });
}
export function resumenMascotaApi(datos: ResumenMascotaApi): MascotaResumen {
  return { id: datos.id, nombre: datos.nombre, especie: datos.especie, raza: datos.raza, sexo: sexoApi(datos.sexo), edadAproximada: datos.edadAproximada,
    fotoPrincipal: datos.fotoPrincipal, estado: estadoMascotaApi(datos.estado), tamano: null, refugioId: null, refugioNombre: null, refugioVerificado: null,
    fechaUltimaActualizacion: null, puntajeCompatibilidad: null };
}
export function paginadoApi(datos: PaginadoApi<ResumenMascotaApi>): Paginado<MascotaResumen> {
  return { items: datos.items.map(resumenMascotaApi), pagina: datos.pagina, tamanoPagina: datos.tamanoPagina, total: datos.totalRegistros, totalPaginas: datos.totalPaginas };
}

/** SolicitudResumenDTO del backend (db3a4fb): el estado llega como texto y sin ids de usuario ni mascota. */
export interface SolicitudResumenApi { solicitudId: number; codigo: string; mascotaNombre: string; mascotaFoto: string | null; adoptanteNombre: string; fechaEnvio: string; estado: string }
export function estadoSolicitudApi(valor: string): EstadoSolicitud {
  const estados: Record<string, EstadoSolicitud> = { enviada: EstadoSolicitud.Enviada, enrevision: EstadoSolicitud.EnRevision, entrevista: EstadoSolicitud.EntrevistaVisita,
    aprobada: EstadoSolicitud.Aprobada, rechazada: EstadoSolicitud.Rechazada, finalizada: EstadoSolicitud.Finalizada, cancelada: EstadoSolicitud.Cancelada };
  const estado = estados[clave(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '')];
  if (estado === undefined) throw new ErrorHttp({ titulo: 'El servidor devolvió un estado de solicitud no reconocido.', estadoHttp: 502 });
  return estado;
}
const DIA_MS = 24 * 60 * 60 * 1000;
/** Solo las solicitudes que esperan decisión del refugio acumulan días sin respuesta. */
function diasEsperando(fechaEnvio: string, estado: EstadoSolicitud, ahora: number): number {
  if (estado !== EstadoSolicitud.Enviada && estado !== EstadoSolicitud.EnRevision) return 0;
  const envio = Date.parse(fechaEnvio);
  return Number.isFinite(envio) ? Math.max(0, Math.floor((ahora - envio) / DIA_MS)) : 0;
}
export function solicitudResumenApi(dto: SolicitudResumenApi, ahora = Date.now()): SolicitudResumen {
  const estado = estadoSolicitudApi(dto.estado);
  return { id: dto.solicitudId, codigo: dto.codigo, nombreAdoptante: dto.adoptanteNombre, nombreMascota: dto.mascotaNombre, fotoMascota: dto.mascotaFoto,
    fechaEnvio: dto.fechaEnvio, estado, diasSinRespuesta: diasEsperando(dto.fechaEnvio, estado, ahora) };
}
export function paginadoSolicitudesApi(datos: PaginadoApi<SolicitudResumenApi>, ahora = Date.now()): Paginado<SolicitudResumen> {
  return { items: datos.items.map(s => solicitudResumenApi(s, ahora)), pagina: datos.pagina, tamanoPagina: datos.tamanoPagina, total: datos.totalRegistros, totalPaginas: datos.totalPaginas };
}
