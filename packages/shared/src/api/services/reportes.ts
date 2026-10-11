import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type { Paginado } from '../../types/comun';
import type { Mascota } from '../../types/mascotas';
import type {
  CambioEstadoReporteDto,
  CrearReporteDto,
  FiltroReporte,
  ReporteCiudadano,
  ReporteResumen,
} from '../../types/reportes';

export class ServicioReportes {
  constructor(private readonly api: ClienteApi) {}

  listar(filtro: FiltroReporte = {}): Promise<Paginado<ReporteResumen>> {
    return this.api.get<Paginado<ReporteResumen>>(RUTAS.reportes.base, { ...filtro });
  }

  misReportes(): Promise<readonly ReporteResumen[]> {
    return this.api.get<readonly ReporteResumen[]>(RUTAS.reportes.mios);
  }

  obtener(id: number): Promise<ReporteCiudadano> {
    return this.api.get<ReporteCiudadano>(RUTAS.reportes.porId(id));
  }

  crear(datos: CrearReporteDto): Promise<ReporteCiudadano> {
    return this.api.post<ReporteCiudadano>(RUTAS.reportes.base, datos);
  }

  /** El publico ve la ubicacion aproximada; los refugios, la exacta. */
  mapa(filtro: FiltroReporte = {}): Promise<readonly ReporteResumen[]> {
    return this.api.get<readonly ReporteResumen[]>(RUTAS.reportes.mapa, { ...filtro });
  }

  tomar(id: number): Promise<void> {
    return this.api.post<void>(RUTAS.reportes.tomar(id));
  }

  cambiarEstado(id: number, datos: CambioEstadoReporteDto): Promise<void> {
    return this.api.put<void>(RUTAS.reportes.cambiarEstado(id), datos);
  }

  /** Crea la ficha de la mascota rescatada conservando la procedencia. */
  crearFichaMascota(id: number): Promise<Mascota> {
    return this.api.post<Mascota>(RUTAS.reportes.crearFicha(id));
  }

  /** Canales oficiales que se muestran en los reportes de maltrato (Ley 1774). */
  canalesDenuncia(): Promise<readonly string[]> {
    return this.api.get<readonly string[]>(RUTAS.reportes.canalesDenuncia);
  }
}
