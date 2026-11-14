import { ErrorHttp, type ClienteApi } from '../client';
import { EstadoVerificacion } from '../../types/enums';
import { leerRedesSociales, limpiarRedesSociales } from '../../utils/refugios';
import { RUTAS } from '../rutas';
import type { FiltroPaginado, Paginado } from '../../types/comun';
import type {
  Apadrinamiento,
  EditarRefugioDto,
  Calificacion,
  CalificarDto,
  MotivoDto,
  Necesidad,
  Refugio,
  RequisitoAdopcion,
  SolicitudRefugioDto,
} from '../../types/refugios';

const BASE = '/api/v1/Refugios';
interface RequisitoApi { requisitoId: number; descripcion: string; esObligatorio: boolean; orden: number }
interface PerfilApi {
  nombre: string; descripcion: string; direccion: string; telefono: string | null;
  /** Objeto en mi-perfil; la ficha pública aún devuelve el JSON como texto. */
  redesSociales: Record<string, string> | string | null; requisitos: RequisitoApi[];
}
interface PerfilPropioApi extends PerfilApi { estadoVerificacion: EstadoVerificacion }
interface PublicoApi extends PerfilApi { refugioId: number; correo: string | null; verificado: boolean }
interface ResumenApi { refugioId: number; nombre: string; direccion: string }
function refugioBase(id: number, nombre: string, direccion: string): Refugio {
  return { id, nombre, direccion, nit: '', telefono: null, correo: null, encargado: null,
    descripcion: null, redesSociales: null, estadoVerificacion: EstadoVerificacion.Pendiente,
    fechaVerificacion: null, motivoRechazo: null, promedioCalificacion: null, totalAdopciones: null,
    requisitos: [], activo: true, fechaCreacion: '', fechaModificacion: null };
}
function requisitosApi(datos: RequisitoApi[], refugioId: number): RequisitoAdopcion[] {
  return datos.map(r => ({ id: r.requisitoId, refugioId, descripcion: r.descripcion,
    esObligatorio: r.esObligatorio, orden: r.orden, activo: true, fechaCreacion: '', fechaModificacion: null }));
}

export class ServicioRefugios {
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}

  /** El perfil propio no devuelve ID: se usa la asociación vigente del usuario. */
  async miPerfil(refugioId: number): Promise<Refugio> {
    if (this.modoDemo) return this.obtener(refugioId);
    const dto = await this.api.get<PerfilPropioApi>(`${BASE}/mi-perfil`);
    // La consulta pública sí carga los requisitos asociados; mi-perfil puede omitirlos.
    const publico = await this.obtener(refugioId);
    return { ...publico, ...dto, id: refugioId, redesSociales: leerRedesSociales(dto.redesSociales),
      requisitos: publico.requisitos, estadoVerificacion: dto.estadoVerificacion };
  }

  private noDisponible(accion: string): never {
    throw new ErrorHttp({ titulo: `${accion} aún no está disponible.`, estadoHttp: 501 });
  }

  async listar(filtro: FiltroPaginado = {}): Promise<Paginado<Refugio>> {
    if (!this.modoDemo) {
      const dto = await this.api.get<{ items: ResumenApi[]; pagina: number; tamanoPagina: number; totalRegistros: number; totalPaginas: number }>(BASE,
        { pagina: filtro.pagina ?? 1, tamano: filtro.tamanoPagina ?? 10 });
      return { items: dto.items.map(r => ({ ...refugioBase(r.refugioId, r.nombre, r.direccion), estadoVerificacion: EstadoVerificacion.Verificado })),
        pagina: dto.pagina, tamanoPagina: dto.tamanoPagina, total: dto.totalRegistros, totalPaginas: dto.totalPaginas };
    }
    return this.api.get<Paginado<Refugio>>(RUTAS.refugios.base, { ...filtro });
  }

  async obtener(id: number): Promise<Refugio> {
    if (!this.modoDemo) {
      const dto = await this.api.get<PublicoApi>(`${BASE}/${id}`);
      return { ...refugioBase(dto.refugioId, dto.nombre, dto.direccion), descripcion: dto.descripcion,
        telefono: dto.telefono, correo: dto.correo, redesSociales: leerRedesSociales(dto.redesSociales),
        estadoVerificacion: dto.verificado ? EstadoVerificacion.Verificado : EstadoVerificacion.Pendiente,
        requisitos: requisitosApi(dto.requisitos, dto.refugioId) };
    }
    return this.api.get<Refugio>(RUTAS.refugios.porId(id));
  }

  solicitarRegistro(datos: SolicitudRefugioDto): Promise<Refugio> {
    if (!this.modoDemo) this.noDisponible('El registro de refugios');
    return this.api.post<Refugio>(RUTAS.refugios.solicitarRegistro, datos);
  }

  async editar(id: number, datos: EditarRefugioDto): Promise<Refugio> {
    if (!this.modoDemo) {
      const { descripcion = '', direccion, telefono } = datos;
      // El backend serializa el diccionario a JSON; null deja la columna vacía.
      await this.api.put(`${BASE}/mi-perfil`, { descripcion, direccion, telefono, redesSociales: limpiarRedesSociales(datos.redesSociales) });
      return this.miPerfil(id);
    }
    return this.api.put<Refugio>(RUTAS.refugios.porId(id), datos);
  }

  editarRequisito(refugioId: number, requisitoId: number, datos: { descripcion: string; esObligatorio: boolean }): Promise<RequisitoAdopcion> {
    if (!this.modoDemo) this.noDisponible('La edición de requisitos');
    return this.api.put<RequisitoAdopcion>(`${RUTAS.refugios.requisitos(refugioId)}/${requisitoId}`, datos);
  }

  eliminarRequisito(refugioId: number, requisitoId: number): Promise<void> {
    if (!this.modoDemo) this.noDisponible('La eliminación de requisitos');
    return this.api.delete<void>(`${RUTAS.refugios.requisitos(refugioId)}/${requisitoId}`);
  }

  verificar(id: number): Promise<void> {
    if (!this.modoDemo) return this.api.patch<void>(`${BASE}/${id}/verificar`, { aprobado: true });
    return this.api.post<void>(RUTAS.refugios.verificar(id));
  }

  rechazar(id: number, datos: MotivoDto): Promise<void> {
    if (!this.modoDemo) return this.api.patch<void>(`${BASE}/${id}/verificar`, { aprobado: false, motivoRechazo: datos.motivo });
    return this.api.post<void>(RUTAS.refugios.rechazar(id), datos);
  }

  suspender(id: number, datos: MotivoDto): Promise<void> {
    if (!this.modoDemo) this.noDisponible('La suspensión de refugios');
    return this.api.post<void>(RUTAS.refugios.suspender(id), datos);
  }

  async requisitos(id: number): Promise<readonly RequisitoAdopcion[]> {
    if (!this.modoDemo) return (await this.obtener(id)).requisitos;
    return this.api.get<readonly RequisitoAdopcion[]>(RUTAS.refugios.requisitos(id));
  }

  async guardarRequisito(
    refugioId: number,
    descripcion: string,
    esObligatorio: boolean,
    orden = 0,
  ): Promise<RequisitoAdopcion | void> {
    if (!this.modoDemo) {
      await this.api.post(`${BASE}/requisitos`, { descripcion, esObligatorio, orden });
      return;
    }
    return this.api.post<RequisitoAdopcion>(RUTAS.refugios.requisitos(refugioId), {
      descripcion,
      esObligatorio,
    });
  }

  necesidades(refugioId?: number): Promise<readonly Necesidad[]> {
    return this.api.get<readonly Necesidad[]>(RUTAS.refugios.necesidades, {
      refugioId,
    });
  }

  apadrinar(mascotaId: number): Promise<Apadrinamiento> {
    return this.api.post<Apadrinamiento>(RUTAS.refugios.apadrinamientos, {
      mascotaId,
    });
  }

  calificaciones(refugioId: number): Promise<readonly Calificacion[]> {
    return this.api.get<readonly Calificacion[]>(
      RUTAS.refugios.calificacionesPorRefugio(refugioId),
    );
  }

  calificar(datos: CalificarDto): Promise<Calificacion> {
    return this.api.post<Calificacion>(RUTAS.refugios.calificaciones, datos);
  }
}
