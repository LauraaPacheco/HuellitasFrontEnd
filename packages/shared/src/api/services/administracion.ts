import { ErrorHttp, type ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import { paginadoGenerico, type PaginadoApi } from '../contratosBackend';
import type { Paginado } from '../../types/comun';
import { EstadoDenuncia, EstadoModeracion, MotivoDenuncia, TipoContenido } from '../../types/enums';
import type {
  CalificacionAdmin, ConfiguracionSistema, CrearDenunciaDto, DashboardAdmin, Denuncia, FiltroDenuncia,
  FiltroUsuarioAdmin, GuardarConfiguracionDto, Politica, PublicarPoliticaDto, ResolverDenunciaDto, UsuarioAdmin,
} from '../../types/administracion';

/* ---------- Formas del backend ---------- */

interface UsuarioAdminApi { usuarioId: number; nombre: string; correo: string; rol: string; estado: string; activo: boolean; fechaRegistro: string }
interface DenunciaApi { denunciaId: number; denunciante: string; tipoContenido: string; idContenido: number; motivo: string; descripcion: string | null; estado: string; resultado: string | null; fecha: string }
interface ConfiguracionApi { configuracionId: number; clave: string; valor: string; descripcion: string | null; activo: boolean }
interface PoliticaApi { politicaId: number; version: string; contenido: string; fechaPublicacion: string; activo: boolean }
interface DashboardApi {
  totalAdopcionesExitosas: number; totalMascotasDisponibles: number; totalUsuariosRegistrados: number; totalRefugiosVerificados: number;
  totalReportesCiudadanos: number; tiempoPromedioAdopcionDias: number; reportesPorEstado: { estado: string; total: number }[] | null;
}
interface CalificacionAdminApi { calificacionId: number; refugioId: number; refugioNombre: string; adoptanteNombre: string; puntaje: number; comentario: string | null; estadoModeracion: string; fecha: string; activo: boolean }

const clave = (v: string) => (v ?? '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ\s]/g, '');
function porNombre<T>(valor: string, opciones: Record<string, T>, que: string): T {
  const r = opciones[clave(valor)];
  if (r === undefined) throw new ErrorHttp({ titulo: `El servidor devolvió ${que} no reconocido.`, estadoHttp: 502 });
  return r;
}
const TIPO_CONTENIDO = { mascota: TipoContenido.Mascota, refugio: TipoContenido.Refugio, calificacion: TipoContenido.Calificacion, reporte: TipoContenido.Reporte };
const MOTIVO = { posibleestafa: MotivoDenuncia.PosibleEstafa, informacionfalsa: MotivoDenuncia.InformacionFalsa, contenidoinapropiado: MotivoDenuncia.ContenidoInapropiado, otro: MotivoDenuncia.Otro };
const ESTADO_DENUNCIA = { recibida: EstadoDenuncia.Recibida, enrevision: EstadoDenuncia.EnRevision, resuelta: EstadoDenuncia.Resuelta };

export const usuarioAdminApi = (u: UsuarioAdminApi): UsuarioAdmin =>
  ({ id: u.usuarioId, nombre: u.nombre, correo: u.correo, rol: u.rol, estado: u.estado, activo: u.activo, fechaRegistro: u.fechaRegistro });
export const denunciaApi = (d: DenunciaApi): Denuncia => ({
  id: d.denunciaId, denunciante: d.denunciante, idContenido: d.idContenido, descripcion: d.descripcion || null, resultado: d.resultado || null, fecha: d.fecha,
  tipoContenido: porNombre(d.tipoContenido, TIPO_CONTENIDO, 'un tipo de contenido'),
  motivo: porNombre(d.motivo, MOTIVO, 'un motivo de denuncia'),
  estado: porNombre(d.estado, ESTADO_DENUNCIA, 'un estado de denuncia'),
});
const configuracionApi = (c: ConfiguracionApi): ConfiguracionSistema => ({ id: c.configuracionId, clave: c.clave, valor: c.valor, descripcion: c.descripcion || null, activo: c.activo });
export const politicaApi = (p: PoliticaApi): Politica => ({ id: p.politicaId, version: p.version, contenido: p.contenido, fechaPublicacion: p.fechaPublicacion, activo: p.activo });
export const calificacionAdminApi = (c: CalificacionAdminApi): CalificacionAdmin => ({
  id: c.calificacionId, refugioId: c.refugioId, refugioNombre: c.refugioNombre, adoptanteNombre: c.adoptanteNombre, puntaje: c.puntaje,
  comentario: c.comentario || null, fecha: c.fecha,
  estado: porNombre(c.estadoModeracion, { publicada: EstadoModeracion.Publicada, oculta: EstadoModeracion.Oculta }, 'un estado de moderación'),
});

const invalido = (titulo: string) => new ErrorHttp({ titulo, estadoHttp: 400 });
const pagina = (f: { pagina?: number; tamanoPagina?: number }, tamano = 10) => ({ pagina: f.pagina ?? 1, tamano: f.tamanoPagina ?? tamano });

/**
 * Administración: usuarios, denuncias, configuración, política, indicadores
 * y moderación de opiniones. En demo el cliente simulado responde con las
 * formas del dominio, así que esas ramas no traducen.
 */
export class ServicioAdministracion {
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}

  /* ----- Usuarios (ADM-01) ----- */

  async usuarios(filtro: FiltroUsuarioAdmin = {}): Promise<Paginado<UsuarioAdmin>> {
    const consulta = { ...pagina(filtro, 20), busqueda: filtro.busqueda?.trim() || undefined, rolId: filtro.rolId, estado: filtro.estado };
    if (this.modoDemo) return this.api.get(RUTAS.administracion.usuarios, consulta);
    return paginadoGenerico(await this.api.get<PaginadoApi<UsuarioAdminApi>>(RUTAS.administracion.usuarios, consulta), usuarioAdminApi);
  }

  /** Desactivar pide motivo; el admin no puede desactivarse a sí mismo ni dejar la plataforma sin admin. */
  async cambiarEstadoUsuario(id: number, activo: boolean, motivo?: string): Promise<void> {
    if (!activo && !motivo?.trim()) throw invalido('Escribe el motivo para desactivar la cuenta.');
    await this.api.patch(RUTAS.administracion.estadoUsuario(id), { activo, motivo: motivo?.trim() || null });
  }

  async cambiarRolUsuario(id: number, nuevoRolId: number): Promise<void> {
    await this.api.patch(RUTAS.administracion.rolUsuario(id), { nuevoRolId });
  }

  /* ----- Denuncias (ADM-02) ----- */

  /** Cualquier usuario con sesión puede denunciar una mascota, un refugio, una opinión o un reporte. */
  async denunciar(datos: CrearDenunciaDto): Promise<void> {
    if ((datos.descripcion?.trim().length ?? 0) > 500) throw invalido('La descripción no puede superar 500 caracteres.');
    await this.api.post(RUTAS.denuncias.crear, { ...datos, descripcion: datos.descripcion?.trim() || null });
  }

  async denuncias(filtro: FiltroDenuncia = {}): Promise<Paginado<Denuncia>> {
    const consulta = { ...pagina(filtro, 20), estado: filtro.estado };
    if (this.modoDemo) return this.api.get(RUTAS.administracion.denuncias, consulta);
    return paginadoGenerico(await this.api.get<PaginadoApi<DenunciaApi>>(RUTAS.administracion.denuncias, consulta), denunciaApi);
  }

  async resolverDenuncia(id: number, datos: ResolverDenunciaDto): Promise<void> {
    if (!datos.resultado.trim()) throw invalido('Escribe qué se decidió.');
    await this.api.patch(RUTAS.administracion.resolverDenuncia(id), { resultado: datos.resultado.trim(), ocultarContenido: datos.ocultarContenido });
  }

  /* ----- Configuración y política (ADM-03) ----- */

  async configuracion(): Promise<readonly ConfiguracionSistema[]> {
    if (this.modoDemo) return this.api.get(RUTAS.administracion.configuracion);
    return (await this.api.get<ConfiguracionApi[]>(RUTAS.administracion.configuracion)).map(configuracionApi);
  }

  async guardarConfiguracion(datos: GuardarConfiguracionDto, id?: number): Promise<void> {
    if (!datos.clave.trim() || !datos.valor.trim()) throw invalido('La clave y el valor son obligatorios.');
    const cuerpo = { clave: datos.clave.trim(), valor: datos.valor.trim(), descripcion: datos.descripcion?.trim() || null };
    if (id === undefined) await this.api.post(RUTAS.administracion.configuracion, cuerpo);
    else await this.api.put(RUTAS.administracion.configuracionPorId(id), cuerpo);
  }

  /** La política vigente: pública, la usa también el registro. */
  async politicaActiva(): Promise<Politica | null> {
    if (this.modoDemo) return this.api.get(RUTAS.politicas.activa);
    try {
      return politicaApi(await this.api.get<PoliticaApi>(RUTAS.politicas.activa));
    } catch (e) {
      if (e instanceof ErrorHttp && e.estadoHttp === 404) return null;
      throw e;
    }
  }

  /** Historial completo, la vigente primero (admin). */
  async politicas(): Promise<readonly Politica[]> {
    const lista = this.modoDemo ? await this.api.get<Politica[]>(RUTAS.politicas.base) : (await this.api.get<PoliticaApi[]>(RUTAS.politicas.base)).map(politicaApi);
    return [...lista].sort((a, b) => Number(b.activo) - Number(a.activo) || b.fechaPublicacion.localeCompare(a.fechaPublicacion));
  }

  /** Publicar una versión nueva obliga a todos a aceptarla otra vez. */
  async publicarPolitica(datos: PublicarPoliticaDto): Promise<void> {
    if (!datos.version.trim() || !datos.contenido.trim()) throw invalido('Escribe la versión y el contenido.');
    await this.api.post(RUTAS.politicas.base, { version: datos.version.trim(), contenido: datos.contenido.trim() });
  }

  async aceptarPolitica(politica: { id: number | null; version: string | null }): Promise<void> {
    await this.api.post(RUTAS.politicas.aceptar, { politicaId: politica.id, version: politica.version });
  }

  /* ----- Indicadores (ADM-04) ----- */

  async dashboard(): Promise<DashboardAdmin> {
    if (this.modoDemo) return this.api.get(RUTAS.administracion.dashboard);
    const d = await this.api.get<DashboardApi>(RUTAS.administracion.dashboard);
    return {
      adopcionesExitosas: d.totalAdopcionesExitosas, mascotasDisponibles: d.totalMascotasDisponibles, usuariosRegistrados: d.totalUsuariosRegistrados,
      refugiosVerificados: d.totalRefugiosVerificados, reportesCiudadanos: d.totalReportesCiudadanos,
      tiempoPromedioAdopcionDias: d.tiempoPromedioAdopcionDias, reportesPorEstado: d.reportesPorEstado ?? [],
    };
  }

  /* ----- Moderación de opiniones (REF-04) ----- */

  async calificaciones(filtro: { pagina?: number; tamanoPagina?: number; estado?: EstadoModeracion } = {}): Promise<Paginado<CalificacionAdmin>> {
    const consulta = { ...pagina(filtro, 20), estado: filtro.estado };
    if (this.modoDemo) return this.api.get(RUTAS.administracion.calificaciones, consulta);
    return paginadoGenerico(await this.api.get<PaginadoApi<CalificacionAdminApi>>(RUTAS.administracion.calificaciones, consulta), calificacionAdminApi);
  }

  async moderarCalificacion(id: number, estado: EstadoModeracion): Promise<void> {
    await this.api.patch(RUTAS.administracion.moderarCalificacion(id), { estadoModeracion: estado });
  }
}
