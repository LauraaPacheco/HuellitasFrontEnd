import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type {
  Color,
  Especie,
  Raza,
  Tamano,
  Temperamento,
} from '../../types/mascotas';

/**
 * Catalogos parametricos (HU-MAS-02).
 *
 * Viven en su propio servicio y no dentro de ServicioMascotas porque no
 * son mascotas: son listas que mantiene la administracion y que consumen
 * varios modulos. Mascotas los usa para publicar y filtrar, y reportes
 * los va a necesitar para describir al animal avistado.
 *
 * Todos devuelven OpcionCatalogo { id, nombre, activo }. Razas ademas
 * trae especieId y acepta filtrar por el, porque la raza depende de la
 * especie: no tiene sentido ofrecer "Siames" cuando se eligio Perro.
 */
export class ServicioCatalogos {
  constructor(private readonly api: ClienteApi) {}

  especies(): Promise<readonly Especie[]> {
    return this.api.get<readonly Especie[]>(RUTAS.catalogos.especies);
  }

  /** Sin especieId devuelve todas; el backend filtra si se le pasa. */
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
