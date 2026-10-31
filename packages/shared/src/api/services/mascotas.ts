import { ErrorHttp, type ClienteApi } from '../client';
import { paginadoApi, estadoMascotaApi, sexoApi, type PaginadoApi, type ResumenMascotaApi, type DetalleMascotaApi, type FichaMascotaPublica } from '../contratosBackend';
import { RUTAS } from '../rutas';
import { validarUrlFoto } from '../../utils/multimedia';
import type { Paginado } from '../../types/comun';
import type { Bitacora } from '../../types/trazabilidad';
import type {
  CambioEstadoMascotaDto,
  Compatibilidad,
  CrearMascotaDto,
  CrearRegistroClinicoDto,
  EditarMascotaDto,
  FiltroMascota,
  Mascota,
  MascotaResumen,
  Multimedia,
  RegistroClinico,
} from '../../types/mascotas';

export class ServicioMascotas {
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}
  private soloDemo() { if (!this.modoDemo) throw new ErrorHttp({ titulo: 'Esta función todavía no está disponible en el servidor.', estadoHttp: 501 }); }

  async buscar(filtro: FiltroMascota = {}): Promise<Paginado<MascotaResumen>> {
    if (this.modoDemo) return this.api.get(RUTAS.mascotas.base, { ...filtro });
    const { pagina, tamanoPagina, especieId, tamanoId, sexo } = filtro;
    if (['texto', 'razaId', 'edadMinima', 'edadMaxima', 'refugioId', 'estado'].some(campo => filtro[campo as keyof FiltroMascota] !== undefined)) throw new ErrorHttp({ titulo: 'El servidor solo permite filtrar por especie, tamaño y sexo.', estadoHttp: 400 });
    return paginadoApi(await this.api.get<PaginadoApi<ResumenMascotaApi>>(RUTAS.mascotas.base, { pagina, tamanoPagina, especieId, tamanoId, sexo }));
  }

  async inventario(filtro: FiltroMascota = {}): Promise<Paginado<MascotaResumen>> {
    if (this.modoDemo) return this.buscar(filtro);
    return paginadoApi(await this.api.get<PaginadoApi<ResumenMascotaApi>>(RUTAS.mascotas.inventario, { pagina: filtro.pagina, tamano: filtro.tamanoPagina }));
  }

  obtener(id: number): Promise<Mascota> {
    this.soloDemo();
    return this.api.get<Mascota>(RUTAS.mascotas.porId(id));
  }

  async obtenerFicha(id: number): Promise<FichaMascotaPublica> {
    if (this.modoDemo) {
      const mascota = await this.obtener(id);
      const resumen = (await this.buscar({ tamanoPagina: 1000 })).items.find(m => m.id === id);
      return { id: mascota.id, nombre: mascota.nombre, especie: resumen?.especie ?? '', raza: resumen?.raza ?? null,
        sexo: mascota.sexo, edadAproximada: mascota.edadAproximada, descripcion: mascota.descripcion, esterilizada: mascota.esterilizada, estado: mascota.estado,
        refugioNombre: resumen?.refugioNombre ?? '', refugioTelefono: null, refugioId: mascota.refugioId,
        fotos: mascota.multimedia.filter(a => a.activo && a.tipo === 0).sort((a,b) => Number(b.esPrincipal) - Number(a.esPrincipal)).map(a => a.archivo) };
    }
    const dto = await this.api.get<DetalleMascotaApi>(RUTAS.mascotas.porId(id));
    return { id: dto.id, nombre: dto.nombre, especie: dto.especie, raza: dto.raza, sexo: sexoApi(dto.sexo), edadAproximada: dto.edadAproximada,
      descripcion: dto.descripcion, esterilizada: dto.esterilizada, estado: estadoMascotaApi(dto.estado), refugioNombre: dto.refugio, refugioTelefono: dto.refugioTelefono, fotos: dto.fotos };
  }

  /** Conservado para las operaciones de dominio demo. En real, registrar devuelve solamente el identificador. */
  crear(datos: CrearMascotaDto): Promise<Mascota> { this.soloDemo(); return this.api.post(RUTAS.mascotas.base, datos); }

  registrar(datos: CrearMascotaDto): Promise<{ id: number; mensaje: string }> {
    if (!Number.isInteger(datos.edadAproximada ?? 0) || (datos.edadAproximada ?? 0) < 0 || (datos.edadAproximada ?? 0) > 255) throw new ErrorHttp({ titulo: 'La edad debe ser un número entero entre 0 y 255 años.', estadoHttp: 400 });
    const fotosUrls = (datos.fotosUrls ?? []).map(url => url.trim());
    const errorFoto = fotosUrls.map((url, i) => validarUrlFoto(url, fotosUrls.slice(0, i))).find(Boolean);
    if (errorFoto) throw new ErrorHttp({ titulo: errorFoto, estadoHttp: 400 });
    const { nombre, especieId, razaId, tamanoId, colorId, sexo, edadAproximada, descripcion, esterilizada, procedencia } = datos;
    return this.api.post(RUTAS.mascotas.base, { nombre, especieId, razaId, tamanoId, colorId, sexo, edadAproximada, descripcion, esterilizada, procedencia, fotosUrls });
  }

  crearBorrador(datos: CrearMascotaDto): Promise<Mascota> {
    this.soloDemo();
    return this.api.post<Mascota>(`${RUTAS.mascotas.base}/borradores`, datos);
  }

  publicar(id: number): Promise<Mascota> {
    this.soloDemo();
    return this.api.post<Mascota>(`${RUTAS.mascotas.porId(id)}/publicar`);
  }

  editar(id: number, datos: EditarMascotaDto): Promise<Mascota> {
    this.soloDemo();
    return this.api.put<Mascota>(RUTAS.mascotas.porId(id), datos);
  }

  eliminar(id: number, motivo: string): Promise<void> {
    return this.api.peticion<void>(RUTAS.mascotas.porId(id), {
      metodo: 'DELETE',
      ...(this.modoDemo ? { cuerpo: { motivo } } : { parametros: { motivo } }),
    });
  }

  cambiarEstado(id: number, datos: CambioEstadoMascotaDto): Promise<void> {
    return this.api.patch<void>(RUTAS.mascotas.cambiarEstado(id), datos);
  }

  subirMultimedia(id: number, archivo: FormData): Promise<Multimedia> {
    this.soloDemo();
    return this.api.peticion<Multimedia>(RUTAS.mascotas.multimedia(id), {
      metodo: 'POST',
      cuerpo: archivo,
    });
  }

  marcarFotoPrincipal(id: number, multimediaId: number): Promise<void> {
    this.soloDemo();
    return this.api.put<void>(`${RUTAS.mascotas.multimedia(id)}/${multimediaId}/principal`);
  }

  eliminarMultimedia(id: number, multimediaId: number): Promise<void> {
    this.soloDemo();
    return this.api.delete<void>(`${RUTAS.mascotas.multimedia(id)}/${multimediaId}`);
  }

  agregarRegistroClinico(datos: CrearRegistroClinicoDto): Promise<RegistroClinico> {
    return this.api.post<RegistroClinico>(
      RUTAS.mascotas.historialClinico(datos.mascotaId),
      datos,
    );
  }

  bitacora(id: number): Promise<readonly Bitacora[]> {
    return this.api.get<readonly Bitacora[]>(RUTAS.mascotas.bitacora(id));
  }

  /* ----- Favoritos ----- */

  misFavoritos(): Promise<readonly MascotaResumen[]> {
    return this.api.get<readonly MascotaResumen[]>(RUTAS.mascotas.favoritos);
  }

  marcarFavorito(mascotaId: number): Promise<void> {
    return this.api.post<void>(RUTAS.mascotas.favoritos, { mascotaId });
  }

  quitarFavorito(mascotaId: number): Promise<void> {
    return this.api.delete<void>(RUTAS.mascotas.favoritoPorMascota(mascotaId));
  }

  /* ----- Match ----- */

  compatibilidad(mascotaId: number): Promise<Compatibilidad> {
    return this.api.get<Compatibilidad>(RUTAS.mascotas.compatibilidad(mascotaId));
  }

  recomendadas(cantidad = 10): Promise<readonly MascotaResumen[]> {
    return this.api.get<readonly MascotaResumen[]>(RUTAS.mascotas.recomendadas, {
      cantidad,
    });
  }
}
