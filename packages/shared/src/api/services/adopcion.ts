import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type { Paginado, ResultadoValidacion } from '../../types/comun';
import type { EtapaLineaTiempo } from '../../types/trazabilidad';
import type {
  Adopcion,
  CrearSolicitudDto,
  CrearVisitaDto,
  DecisionSolicitudDto,
  FiltroSolicitud,
  RechazoSolicitudDto,
  SolicitudAdopcion,
  SolicitudResumen,
  VisitaEntrevista,
} from '../../types/adopcion';

export class ServicioAdopcion {
  constructor(private readonly api: ClienteApi) {}

  /** Bandeja del refugio. */
  listar(filtro: FiltroSolicitud = {}): Promise<Paginado<SolicitudResumen>> {
    return this.api.get<Paginado<SolicitudResumen>>(RUTAS.solicitudes.base, {
      ...filtro,
    });
  }

  misSolicitudes(): Promise<readonly SolicitudResumen[]> {
    return this.api.get<readonly SolicitudResumen[]>(RUTAS.solicitudes.mias);
  }

  obtener(id: number): Promise<SolicitudAdopcion> {
    return this.api.get<SolicitudAdopcion>(RUTAS.solicitudes.porId(id));
  }

  /** Comprueba cuenta verificada y perfil completo antes de dejar postular. */
  validarPostulacion(mascotaId: number): Promise<ResultadoValidacion> {
    return this.api.get<ResultadoValidacion>(RUTAS.solicitudes.validar, {
      mascotaId,
    });
  }

  crear(datos: CrearSolicitudDto): Promise<SolicitudAdopcion> {
    return this.api.post<SolicitudAdopcion>(RUTAS.solicitudes.base, datos);
  }

  aprobar(id: number, datos: DecisionSolicitudDto = {}): Promise<void> {
    return this.api.post<void>(RUTAS.solicitudes.aprobar(id), datos);
  }

  rechazar(id: number, datos: RechazoSolicitudDto): Promise<void> {
    return this.api.post<void>(RUTAS.solicitudes.rechazar(id), datos);
  }

  cancelar(id: number, motivo?: string): Promise<void> {
    return this.api.post<void>(RUTAS.solicitudes.cancelar(id), { motivo });
  }

  /** Dispara el cierre en cascada: mascota adoptada y demas solicitudes cerradas. */
  finalizar(id: number): Promise<Adopcion> {
    return this.api.post<Adopcion>(RUTAS.solicitudes.finalizar(id));
  }

  lineaTiempo(id: number): Promise<readonly EtapaLineaTiempo[]> {
    return this.api.get<readonly EtapaLineaTiempo[]>(
      RUTAS.solicitudes.lineaTiempo(id),
    );
  }

  subirSoporte(id: number, archivo: FormData): Promise<void> {
    return this.api.peticion<void>(RUTAS.solicitudes.soportes(id), {
      metodo: 'POST',
      cuerpo: archivo,
    });
  }

  agendarVisita(datos: CrearVisitaDto): Promise<VisitaEntrevista> {
    return this.api.post<VisitaEntrevista>(RUTAS.solicitudes.visitas, datos);
  }

  constancia(adopcionId: number): Promise<{ url: string }> {
    return this.api.get<{ url: string }>(RUTAS.adopciones.constancia(adopcionId));
  }
}
