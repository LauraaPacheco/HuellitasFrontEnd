import { ErrorHttp, type ClienteApi } from '../client';
import { paginadoApi, paginadoGenerico, estadoMascotaApi, recomendacionApi, registroClinicoApi, sexoApi, type PaginadoApi, type RecomendacionApi, type RegistroClinicoApi, type ResumenMascotaApi, type DetalleMascotaApi, type FichaMascotaPublica } from '../contratosBackend';
import { RUTAS } from '../rutas';
import { validarUrlFoto } from '../../utils/multimedia';
import type { FiltroPaginado, Paginado } from '../../types/comun';
import type { Bitacora } from '../../types/trazabilidad';
import type {
  CambioEstadoMascotaDto,
  CrearMascotaDto,
  CrearRegistroClinicoDto,
  DatosCompartirMascota,
  EditarMascotaDto,
  FiltroMascota,
  Mascota,
  MascotaResumen,
  Multimedia,
  RecomendacionMascota,
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
      descripcion: dto.descripcion, esterilizada: dto.esterilizada, estado: estadoMascotaApi(dto.estado), refugioNombre: dto.refugio, refugioId: dto.refugioId, refugioTelefono: dto.refugioTelefono, fotos: dto.fotos,
      especieId: dto.especieId, razaId: dto.razaId, tamanoId: dto.tamanoId, colorId: dto.colorId };
  }

  /** Conservado para las operaciones de dominio demo. En real, registrar devuelve solamente el identificador. */
  crear(datos: CrearMascotaDto): Promise<Mascota> { this.soloDemo(); return this.api.post(RUTAS.mascotas.base, datos); }

  /** Valida edad y fotos igual que el backend antes de enviar; devuelve las URLs limpias. */
  private validarEnvio(datos: CrearMascotaDto): string[] {
    if (!Number.isInteger(datos.edadAproximada ?? 0) || (datos.edadAproximada ?? 0) < 0 || (datos.edadAproximada ?? 0) > 255) throw new ErrorHttp({ titulo: 'La edad debe ser un número entero entre 0 y 255 años.', estadoHttp: 400 });
    const fotosUrls = (datos.fotosUrls ?? []).map(url => url.trim());
    const errorFoto = fotosUrls.map((url, i) => validarUrlFoto(url, fotosUrls.slice(0, i))).find(Boolean);
    if (errorFoto) throw new ErrorHttp({ titulo: errorFoto, estadoHttp: 400 });
    return fotosUrls;
  }

  registrar(datos: CrearMascotaDto): Promise<{ id: number; mensaje: string }> {
    const fotosUrls = this.validarEnvio(datos);
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

  /**
   * PUT real (ActualizarMascotaDTO). La especie y la procedencia no se cambian.
   * Si llegan fotos, el backend reemplaza todas; una lista vacía conserva las actuales.
   */
  async actualizar(id: number, datos: CrearMascotaDto): Promise<void> {
    const fotosUrls = this.validarEnvio(datos);
    const { nombre, razaId, tamanoId, colorId, sexo, edadAproximada, descripcion, esterilizada } = datos;
    await this.api.put(RUTAS.mascotas.porId(id), { nombre: nombre.trim(), razaId: razaId ?? null, tamanoId, colorId, sexo, edadAproximada: edadAproximada ?? null, descripcion: descripcion?.trim() || null, esterilizada, fotosUrls });
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

  /* ----- Historial clínico (HU-MAS-04) ----- */

  /** Requiere sesión iniciada (cualquier rol). Más reciente primero, paginado. */
  async historialClinico(mascotaId: number, filtro: FiltroPaginado = {}): Promise<Paginado<RegistroClinico>> {
    const parametros = { pagina: filtro.pagina ?? 1, tamano: filtro.tamanoPagina ?? 10 };
    if (this.modoDemo) return this.api.get(RUTAS.mascotas.historialClinico(mascotaId), parametros);
    const dto = await this.api.get<PaginadoApi<RegistroClinicoApi>>(RUTAS.mascotas.historialClinico(mascotaId), parametros);
    return paginadoGenerico(dto, (r) => registroClinicoApi(r, mascotaId));
  }

  /** Solo el refugio dueño. La fecha va como AAAA-MM-DD (DateOnly). */
  async agregarRegistroClinico(datos: CrearRegistroClinicoDto): Promise<void> {
    const fecha = datos.fecha.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || fecha > new Date().toISOString().slice(0, 10)) {
      throw new ErrorHttp({ titulo: 'Elige una fecha válida que no esté en el futuro.', estadoHttp: 400 });
    }
    const descripcion = datos.descripcion?.trim() ?? '';
    if (!descripcion) throw new ErrorHttp({ titulo: 'Describe la atención.', estadoHttp: 400 });
    await this.api.post(RUTAS.mascotas.historialClinico(datos.mascotaId), {
      tipo: datos.tipo, fecha, descripcion, soporteVeterinario: datos.soporteVeterinario?.trim() || null,
    });
  }

  bitacora(id: number): Promise<readonly Bitacora[]> {
    return this.api.get<readonly Bitacora[]>(RUTAS.mascotas.bitacora(id));
  }

  /* ----- Favoritos (HU-MAS-07, solo adoptante) ----- */

  async misFavoritos(filtro: FiltroPaginado = {}): Promise<Paginado<MascotaResumen>> {
    const parametros = { pagina: filtro.pagina ?? 1, tamano: filtro.tamanoPagina ?? 50 };
    if (this.modoDemo) return this.api.get(RUTAS.mascotas.favoritos, parametros);
    return paginadoApi(await this.api.get<PaginadoApi<ResumenMascotaApi>>(RUTAS.mascotas.favoritos, parametros));
  }

  async marcarFavorito(mascotaId: number): Promise<void> {
    await this.api.post(RUTAS.mascotas.favoritoPorMascota(mascotaId));
  }

  async quitarFavorito(mascotaId: number): Promise<void> {
    await this.api.delete(RUTAS.mascotas.favoritoPorMascota(mascotaId));
  }

  /* ----- Recomendaciones (HU-MAS-06, solo adoptante con perfil completo) ----- */

  /** Top 10 por compatibilidad. Si el perfil de adoptante está incompleto el servidor responde 400. */
  async recomendaciones(): Promise<readonly RecomendacionMascota[]> {
    if (this.modoDemo) return this.api.get(RUTAS.mascotas.recomendaciones);
    return (await this.api.get<RecomendacionApi[]>(RUTAS.mascotas.recomendaciones)).map(recomendacionApi);
  }

  /* ----- Compartir (HU-MAS-08, público) ----- */

  compartir(mascotaId: number): Promise<DatosCompartirMascota> {
    return this.api.get<DatosCompartirMascota>(RUTAS.mascotas.compartir(mascotaId));
  }
}
