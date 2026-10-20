import { useQuery } from '@tanstack/react-query';
import type { OpcionCatalogo } from '@huellitas/shared';
import { api } from '@/lib/api';

/**
 * Casos de uso de los catalogos parametricos (HU-MAS-02).
 *
 * Son las listas que alimentan los desplegables de toda la plataforma:
 * especies, razas, tamanos, colores y temperamentos. Viven aparte de
 * @/casos/mascotas porque no son mascotas; mascotas es solo su primer
 * consumidor.
 */

/**
 * Una hora sin volver a pedirlos.
 *
 * Un catalogo cambia cuando la administracion anade una raza, o sea casi
 * nunca, y en cambio se pide en cada pantalla que lleve un desplegable.
 * Sin esto, abrir el formulario de una mascota dispararia cinco
 * peticiones cada vez.
 */
const UNA_HORA = 60 * 60 * 1000;

/**
 * Claves de cache, de lo general a lo especifico, igual que en mascotas:
 * invalidar ['catalogos'] alcanza los cinco de una vez, que es lo que
 * hara la pantalla de administracion cuando edite una lista.
 */
export const clavesCatalogos = {
  todo: ['catalogos'] as const,
  especies: () => [...clavesCatalogos.todo, 'especies'] as const,
  razas: (especieId: number | undefined) =>
    [...clavesCatalogos.todo, 'razas', especieId ?? 'todas'] as const,
  tamanos: () => [...clavesCatalogos.todo, 'tamanos'] as const,
  colores: () => [...clavesCatalogos.todo, 'colores'] as const,
  temperamentos: () => [...clavesCatalogos.todo, 'temperamentos'] as const,
};

export function usarEspecies() {
  return useQuery({
    queryKey: clavesCatalogos.especies(),
    queryFn: () => api.catalogos.especies(),
    staleTime: UNA_HORA,
  });
}

/**
 * Razas de una especie.
 *
 * Sin especie no pide nada: ofrecer todas las razas juntas no ayuda a
 * nadie, porque "Siames" no es una opcion valida si ya se eligio Perro.
 * La pantalla deja el desplegable deshabilitado hasta que haya especie.
 */
export function usarRazas(especieId: number | undefined) {
  return useQuery({
    queryKey: clavesCatalogos.razas(especieId),
    queryFn: () => api.catalogos.razas(especieId),
    enabled: especieId !== undefined,
    staleTime: UNA_HORA,
  });
}

export function usarTamanos() {
  return useQuery({
    queryKey: clavesCatalogos.tamanos(),
    queryFn: () => api.catalogos.tamanos(),
    staleTime: UNA_HORA,
  });
}

export function usarColores() {
  return useQuery({
    queryKey: clavesCatalogos.colores(),
    queryFn: () => api.catalogos.colores(),
    staleTime: UNA_HORA,
  });
}

export function usarTemperamentos() {
  return useQuery({
    queryKey: clavesCatalogos.temperamentos(),
    queryFn: () => api.catalogos.temperamentos(),
    staleTime: UNA_HORA,
  });
}

/**
 * Opciones que de verdad se pueden elegir.
 *
 * Un catalogo trae tambien las opciones dadas de baja, porque hay
 * mascotas viejas que todavia apuntan a ellas y la ficha tiene que poder
 * mostrar su nombre. Lo que no se puede es ofrecerlas para algo nuevo.
 *
 * El valor actual es la excepcion: si se esta editando una mascota cuya
 * raza se dio de baja, esa raza se queda en la lista. Si no, al abrir el
 * formulario el desplegable no encontraria su valor, caeria en blanco y
 * guardar borraria el dato sin que nadie lo pidiera.
 */
export function opcionesElegibles<T extends OpcionCatalogo>(
  opciones: readonly T[] | undefined,
  valorActual?: number,
): readonly T[] {
  if (!opciones) return [];
  return opciones.filter((o) => o.activo || o.id === valorActual);
}
