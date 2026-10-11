import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type { Paginado } from '../../types/comun';
import type {
  ConfiguracionSistema,
  CrearDenunciaDto,
  DashboardGeneral,
  DashboardRefugio,
  Denuncia,
  FiltroDenuncia,
  ModeracionDto,
  PoliticaDatos,
  ResolverDenunciaDto,
} from '../../types/administracion';

export class ServicioAdministracion {
  constructor(private readonly api: ClienteApi) {}

  /* ----- Denuncias y moderacion ----- */

  denuncias(filtro: FiltroDenuncia = {}): Promise<Paginado<Denuncia>> {
    return this.api.get<Paginado<Denuncia>>(RUTAS.administracion.denuncias, {
      ...filtro,
    });
  }

  denunciar(datos: CrearDenunciaDto): Promise<Denuncia> {
    return this.api.post<Denuncia>(RUTAS.administracion.denuncias, datos);
  }

  resolverDenuncia(id: number, datos: ResolverDenunciaDto): Promise<void> {
    return this.api.post<void>(RUTAS.administracion.resolverDenuncia(id), datos);
  }

  ocultarContenido(datos: ModeracionDto): Promise<void> {
    return this.api.post<void>(RUTAS.administracion.moderarOcultar, datos);
  }

  restaurarContenido(datos: Omit<ModeracionDto, 'motivo'>): Promise<void> {
    return this.api.post<void>(RUTAS.administracion.moderarRestaurar, datos);
  }

  /* ----- Configuracion ----- */

  configuracion(): Promise<readonly ConfiguracionSistema[]> {
    return this.api.get<readonly ConfiguracionSistema[]>(
      RUTAS.administracion.configuracion,
    );
  }

  actualizarConfiguracion(clave: string, valor: string): Promise<void> {
    return this.api.put<void>(`${RUTAS.administracion.configuracion}/${clave}`, {
      valor,
    });
  }

  politicaVigente(): Promise<PoliticaDatos> {
    return this.api.get<PoliticaDatos>(RUTAS.administracion.politica);
  }

  publicarPolitica(version: string, contenido: string): Promise<PoliticaDatos> {
    return this.api.post<PoliticaDatos>(RUTAS.administracion.politica, {
      version,
      contenido,
    });
  }

  /* ----- Indicadores ----- */

  dashboardRefugio(refugioId: number, periodo: string): Promise<DashboardRefugio> {
    return this.api.get<DashboardRefugio>(
      RUTAS.administracion.dashboardRefugio(refugioId),
      { periodo },
    );
  }

  dashboardGeneral(periodo: string): Promise<DashboardGeneral> {
    return this.api.get<DashboardGeneral>(RUTAS.administracion.dashboardGeneral, {
      periodo,
    });
  }
}
