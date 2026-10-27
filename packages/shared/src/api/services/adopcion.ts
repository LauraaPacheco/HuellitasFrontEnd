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
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}

  /** HU-ADO-01: respuesta reducida del endpoint real, sin inventar el detalle. */
  async postular(datos: CrearSolicitudDto): Promise<ConfirmacionPostulacion> {
    if (this.modoDemo) {
      const mascota = await this.api.get<{ nombre: string }>(RUTAS.mascotas.porId(datos.mascotaId));
      return { mensaje: 'Simulación demo: esta solicitud no se guarda ni se envía al refugio.', solicitud: {
        solicitudId: 0, codigo: 'DEMO-SIN-REGISTRO', mascotaNombre: mascota.nombre,
        fechaEnvio: new Date().toISOString(), estado: 'Simulada',
      } };
    }
    return this.api.post<ConfirmacionPostulacion>('/api/v1/Adopciones', {
      mascotaId: datos.mascotaId,
      respuestasFormulario: { ...datos.respuestasFormulario, aceptaCompromisos: datos.aceptaCompromisos },
    });
  }

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

export interface ConfirmacionPostulacion {
  mensaje: string;
  solicitud: { solicitudId: number; codigo: string; mascotaNombre: string; fechaEnvio: string; estado: string };
}
