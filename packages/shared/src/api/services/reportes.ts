import { ErrorHttp, type ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import {
  detalleReporteApi, paginadoGenerico, pinReporteApi, reporteBandejaApi,
  type PaginadoApi, type ReporteDetalleApi, type ReporteMapaApi, type ReporteResumenApi,
} from '../contratosBackend';
import type { FiltroPaginado, Paginado } from '../../types/comun';
import { EstadoReporte, TipoReporte } from '../../types/enums';
import type {
  CambioEstadoReporteDto, ConvertirReporteDto, CrearReporteDto, DetalleReporte, EditarReporteDto, PinReporte, ReporteBandeja, ReporteCreado,
} from '../../types/reportes';

const MAX_DESCRIPCION = 1000;
const MAX_DIRECCION = 200;
const MAX_MOTIVO = 500;

/** Los heridos y el maltrato se atienden primero. */
export const esReportePrioritario = (tipo: TipoReporte) => tipo === TipoReporte.Herido || tipo === TipoReporte.Maltrato;

/** No encontrado y Cerrado piden motivo en el backend. */
export const estadoPideMotivo = (estado: EstadoReporte) => estado === EstadoReporte.NoEncontrado || estado === EstadoReporte.Cerrado;

/** Las mismas reglas del validador del backend, para avisar antes de enviar. */
export function validarReporte(d: CrearReporteDto): string | null {
  if (!Object.values(TipoReporte).includes(d.tipo)) return 'Elige qué le pasa al animal.';
  const descripcion = d.descripcion.trim();
  if (!descripcion) return 'Cuenta qué viste.';
  if (descripcion.length > MAX_DESCRIPCION) return `La descripción no puede superar ${MAX_DESCRIPCION} caracteres.`;
  if (!Number.isFinite(d.latitud) || Math.abs(d.latitud) > 90 || !Number.isFinite(d.longitud) || Math.abs(d.longitud) > 180) return 'La ubicación no es válida.';
  if ((d.direccion?.trim().length ?? 0) > MAX_DIRECCION) return `La dirección no puede superar ${MAX_DIRECCION} caracteres.`;
  if ((d.puntoReferencia?.trim().length ?? 0) > MAX_DIRECCION) return `El punto de referencia no puede superar ${MAX_DIRECCION} caracteres.`;
  if (d.fotosUrls?.some((u) => !/^https?:\/\//i.test(u))) return 'Una de las fotos no tiene un enlace válido.';
  return null;
}

const cuerpoReporte = (d: CrearReporteDto) => ({
  tipo: d.tipo,
  descripcion: d.descripcion.trim(),
  latitud: d.latitud,
  longitud: d.longitud,
  direccion: d.direccion?.trim() || null,
  puntoReferencia: d.puntoReferencia?.trim() || null,
  fotosUrls: [...(d.fotosUrls ?? [])],
});

const invalido = (titulo: string) => new ErrorHttp({ titulo, estadoHttp: 400 });

/**
 * Reportes ciudadanos (HU-REP-01 a 04). En demo el cliente simulado ya
 * responde con las formas del dominio, así que esas ramas no traducen.
 */
export class ServicioReportes {
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}

  /** Cualquiera puede reportar, con o sin sesión (máximo 10 por minuto). */
  async crear(datos: CrearReporteDto): Promise<ReporteCreado> {
    const problema = validarReporte(datos);
    if (problema) throw invalido(problema);
    const r = await this.api.post<{ id: number; numeroReporte: string }>(RUTAS.reportes.base, cuerpoReporte(datos));
    return { id: r.id, numeroReporte: r.numeroReporte };
  }

  /** Pines públicos: Recibido, En atención y Rescatado. */
  async mapa(): Promise<readonly PinReporte[]> {
    if (this.modoDemo) return this.api.get(RUTAS.reportes.mapa);
    return (await this.api.get<ReporteMapaApi[]>(RUTAS.reportes.mapa)).map(pinReporteApi);
  }

  /** Reportes libres y los que tomó el refugio con sesión. El admin sin refugio recibe 400. */
  async bandeja(filtro: FiltroPaginado = {}): Promise<Paginado<ReporteBandeja>> {
    const consulta = { pagina: filtro.pagina ?? 1, tamano: filtro.tamanoPagina ?? 50 };
    if (this.modoDemo) return this.api.get(RUTAS.reportes.bandeja, consulta);
    return paginadoGenerico(await this.api.get<PaginadoApi<ReporteResumenApi>>(RUTAS.reportes.bandeja, consulta), reporteBandejaApi);
  }

  async obtener(id: number): Promise<DetalleReporte> {
    if (this.modoDemo) return this.api.get(RUTAS.reportes.porId(id));
    return detalleReporteApi(await this.api.get<ReporteDetalleApi>(RUTAS.reportes.porId(id)));
  }

  async tomar(id: number): Promise<void> {
    await this.api.patch(RUTAS.reportes.tomar(id));
  }

  async cambiarEstado(id: number, { nuevoEstado, motivo }: CambioEstadoReporteDto): Promise<void> {
    const texto = motivo?.trim() ?? '';
    if (estadoPideMotivo(nuevoEstado) && !texto) throw invalido('Cuenta por qué cambias el estado.');
    if (texto.length > MAX_MOTIVO) throw invalido(`El motivo no puede superar ${MAX_MOTIVO} caracteres.`);
    await this.api.patch(RUTAS.reportes.cambiarEstado(id), { nuevoEstado, motivo: texto || null });
  }

  /** Solo administrador. */
  async editar(id: number, datos: EditarReporteDto): Promise<void> {
    const problema = validarReporte(datos);
    if (problema) throw invalido(problema);
    await this.api.put(RUTAS.reportes.porId(id), cuerpoReporte(datos));
  }

  /** Administrador, o quien reportó mientras siga Recibido y sin refugio. Es un borrado lógico. */
  async eliminar(id: number, motivo?: string): Promise<void> {
    const texto = motivo?.trim();
    const ruta = RUTAS.reportes.porId(id) + (texto ? `?motivo=${encodeURIComponent(texto)}` : '');
    await this.api.delete(ruta);
  }

  /** Crea la ficha de la mascota rescatada; devuelve su id. */
  async convertirEnMascota(id: number, datos: ConvertirReporteDto): Promise<number> {
    if (!datos.nombre.trim()) throw invalido('Ponle un nombre a la mascota.');
    const r = await this.api.post<{ mascotaId: number }>(RUTAS.reportes.convertirMascota(id), {
      ...datos, nombre: datos.nombre.trim(), descripcion: datos.descripcion?.trim() || null, razaId: datos.razaId ?? null, edadAproximada: datos.edadAproximada ?? null,
    });
    return r.mascotaId;
  }
}
