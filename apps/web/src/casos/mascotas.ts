import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  CambioEstadoMascotaDto,
  CrearMascotaDto,
  EditarMascotaDto,
  FiltroMascota,
} from '@huellitas/shared';
import { api } from '@/lib/api';

/**
 * Casos de uso de mascotas.
 *
 * Una pantalla no llama a `api.*` directamente: pide un caso de uso. Lo
 * que se gana no es estética, son tres cosas concretas:
 *
 * 1. Las claves de caché viven en un solo sitio. Repartidas por las
 *    pantallas, dos de ellas escriben la misma clave distinto y una deja
 *    de refrescarse sin que nadie entienda por qué.
 * 2. Qué se invalida al guardar se decide aquí. Si crear una mascota
 *    tiene que refrescar la lista, se dice una vez.
 * 3. La pantalla deja de saber que existe HTTP. Para probarla basta con
 *    sustituir el caso de uso.
 */

/**
 * Claves de caché, construidas siempre por aquí.
 *
 * Van de lo general a lo específico (`['mascotas']` → `['mascotas','lista',filtro]`)
 * para poder invalidar un grupo entero con el prefijo: invalidar
 * `['mascotas']` alcanza listas y detalles de una vez.
 */
export const clavesMascotas = {
  todo: ['mascotas'] as const,
  listas: () => [...clavesMascotas.todo, 'lista'] as const,
  lista: (filtro: FiltroMascota) => [...clavesMascotas.listas(), filtro] as const,
  detalles: () => [...clavesMascotas.todo, 'detalle'] as const,
  detalle: (id: number) => [...clavesMascotas.detalles(), id] as const,
};

/** Listado paginado, con los filtros de búsqueda. */
export function usarMascotas(filtro: FiltroMascota) {
  return useQuery({
    queryKey: clavesMascotas.lista(filtro),
    queryFn: () => api.mascotas.buscar(filtro),
    // Al cambiar de filtro o de página, deja ver el resultado anterior en
    // vez de vaciar la tabla: evita el salto de la pantalla en blanco.
    placeholderData: (previo) => previo,
  });
}

/** Una mascota completa. */
export function usarMascota(id: number | undefined) {
  return useQuery({
    queryKey: clavesMascotas.detalle(id ?? 0),
    queryFn: () => api.mascotas.obtener(id!),
    enabled: id !== undefined,
  });
}

export function usarCrearMascota() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (datos: CrearMascotaDto) => api.mascotas.crear(datos),
    onSuccess: () => {
      // La mascota nueva tiene que aparecer en la lista sin recargar.
      void cliente.invalidateQueries({ queryKey: clavesMascotas.listas() });
    },
  });
}

export function usarEditarMascota(id: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (datos: EditarMascotaDto) => api.mascotas.editar(id, datos),
    onSuccess: () => {
      // Cambia el detalle y también cómo se ve en la lista.
      void cliente.invalidateQueries({ queryKey: clavesMascotas.detalle(id) });
      void cliente.invalidateQueries({ queryKey: clavesMascotas.listas() });
    },
  });
}

export function usarCambiarEstadoMascota(id: number) {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: (datos: CambioEstadoMascotaDto) => api.mascotas.cambiarEstado(id, datos),
    onSuccess: () => {
      void cliente.invalidateQueries({ queryKey: clavesMascotas.todo });
    },
  });
}

/** Catálogos para los filtros y el formulario. Cambian poco. */
export function usarEspecies() {
  return useQuery({
    queryKey: ['catalogos', 'especies'],
    queryFn: () => api.mascotas.especies(),
    staleTime: 60 * 60 * 1000,
  });
}
