import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type { FiltroPaginado, Paginado } from '../../types/comun';
import type {
  Apadrinamiento,
  Calificacion,
  CalificarDto,
  MotivoDto,
  Necesidad,
  Refugio,
  RequisitoAdopcion,
  SolicitudRefugioDto,
} from '../../types/refugios';

export class ServicioRefugios {
  constructor(private readonly api: ClienteApi) {}

  listar(filtro: FiltroPaginado = {}): Promise<Paginado<Refugio>> {
    return this.api.get<Paginado<Refugio>>(RUTAS.refugios.base, { ...filtro });
  }

  obtener(id: number): Promise<Refugio> {
    return this.api.get<Refugio>(RUTAS.refugios.porId(id));
  }

  solicitarRegistro(datos: SolicitudRefugioDto): Promise<Refugio> {
    return this.api.post<Refugio>(RUTAS.refugios.solicitarRegistro, datos);
  }

  verificar(id: number): Promise<void> {
    return this.api.post<void>(RUTAS.refugios.verificar(id));
  }

  rechazar(id: number, datos: MotivoDto): Promise<void> {
    return this.api.post<void>(RUTAS.refugios.rechazar(id), datos);
  }

  suspender(id: number, datos: MotivoDto): Promise<void> {
    return this.api.post<void>(RUTAS.refugios.suspender(id), datos);
  }

  requisitos(id: number): Promise<readonly RequisitoAdopcion[]> {
    return this.api.get<readonly RequisitoAdopcion[]>(RUTAS.refugios.requisitos(id));
  }

  guardarRequisito(
    refugioId: number,
    descripcion: string,
    esObligatorio: boolean,
  ): Promise<RequisitoAdopcion> {
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
