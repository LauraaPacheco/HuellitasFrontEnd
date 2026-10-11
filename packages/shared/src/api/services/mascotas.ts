import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type { Paginado } from '../../types/comun';
import type { Bitacora } from '../../types/trazabilidad';
import type {
  CambioEstadoMascotaDto,
  Color,
  Compatibilidad,
  CrearMascotaDto,
  CrearRegistroClinicoDto,
  EditarMascotaDto,
  Especie,
  FiltroMascota,
  Mascota,
  MascotaResumen,
  Multimedia,
  Raza,
  RegistroClinico,
  Tamano,
  Temperamento,
} from '../../types/mascotas';

export class ServicioMascotas {
  constructor(private readonly api: ClienteApi) {}

  buscar(filtro: FiltroMascota = {}): Promise<Paginado<MascotaResumen>> {
    return this.api.get<Paginado<MascotaResumen>>(RUTAS.mascotas.base, { ...filtro });
  }

  obtener(id: number): Promise<Mascota> {
    return this.api.get<Mascota>(RUTAS.mascotas.porId(id));
  }

  crear(datos: CrearMascotaDto): Promise<Mascota> {
    return this.api.post<Mascota>(RUTAS.mascotas.base, datos);
  }

  editar(id: number, datos: EditarMascotaDto): Promise<Mascota> {
    return this.api.put<Mascota>(RUTAS.mascotas.porId(id), datos);
  }

  eliminar(id: number, motivo: string): Promise<void> {
    return this.api.peticion<void>(RUTAS.mascotas.porId(id), {
      metodo: 'DELETE',
      cuerpo: { motivo },
    });
  }

  cambiarEstado(id: number, datos: CambioEstadoMascotaDto): Promise<void> {
    return this.api.put<void>(RUTAS.mascotas.cambiarEstado(id), datos);
  }

  subirMultimedia(id: number, archivo: FormData): Promise<Multimedia> {
    return this.api.peticion<Multimedia>(RUTAS.mascotas.multimedia(id), {
      metodo: 'POST',
      cuerpo: archivo,
    });
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

  /* ----- Catalogos ----- */

  especies(): Promise<readonly Especie[]> {
    return this.api.get<readonly Especie[]>(RUTAS.catalogos.especies);
  }

  razas(especieId?: number): Promise<readonly Raza[]> {
    return this.api.get<readonly Raza[]>(RUTAS.catalogos.razas, { especieId });
  }

  tamanos(): Promise<readonly Tamano[]> {
    return this.api.get<readonly Tamano[]>(RUTAS.catalogos.tamanos);
  }

  colores(): Promise<readonly Color[]> {
    return this.api.get<readonly Color[]>(RUTAS.catalogos.colores);
  }

  temperamentos(): Promise<readonly Temperamento[]> {
    return this.api.get<readonly Temperamento[]>(RUTAS.catalogos.temperamentos);
  }
}
