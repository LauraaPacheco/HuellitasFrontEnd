import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, type MascotaResumen, type Paginado } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';

export const CLAVE_FAVORITOS = ['favoritos'] as const;

/**
 * Favoritos del adoptante (HU-MAS-07).
 *
 * El backend no marca la ficha como favorita, así que se trae la lista (una
 * página amplia) y de ahí sale el conjunto de IDs. El corazón cambia al
 * instante y, si el servidor falla, vuelve a su estado anterior.
 */
export function useFavoritos() {
  const { usuario, puedeActuar } = useSesion();
  const cliente = useQueryClient();
  const clave = [...CLAVE_FAVORITOS, usuario?.id] as const;

  const consulta = useQuery({
    queryKey: clave,
    queryFn: () => api.mascotas.misFavoritos({ tamanoPagina: 100 }),
    enabled: puedeActuar,
    staleTime: 30_000,
  });

  const ids = new Set(consulta.data?.items.map((m) => m.id) ?? []);

  const cambio = useMutation({
    mutationFn: ({ mascota, marcar }: { mascota: MascotaResumen | { id: number }; marcar: boolean }) =>
      marcar ? api.mascotas.marcarFavorito(mascota.id) : api.mascotas.quitarFavorito(mascota.id),
    onMutate: async ({ mascota, marcar }) => {
      await cliente.cancelQueries({ queryKey: clave });
      const anterior = cliente.getQueryData<Paginado<MascotaResumen>>(clave);
      if (anterior) {
        const items = marcar
          ? 'nombre' in mascota ? [mascota, ...anterior.items.filter((m) => m.id !== mascota.id)] : anterior.items
          : anterior.items.filter((m) => m.id !== mascota.id);
        cliente.setQueryData(clave, { ...anterior, items, total: items.length });
      }
      return { anterior };
    },
    onError: (error, { marcar }, contexto) => {
      // 409 al marcar o 404 al quitar: el servidor ya estaba como se quería.
      const yaEstaba = error instanceof ErrorHttp && error.estadoHttp === (marcar ? 409 : 404);
      if (!yaEstaba && contexto?.anterior) cliente.setQueryData(clave, contexto.anterior);
    },
    onSettled: () => void cliente.invalidateQueries({ queryKey: CLAVE_FAVORITOS }),
  });

  return {
    disponible: puedeActuar,
    consulta,
    esFavorito: (id: number) => ids.has(id),
    alternar: (mascota: MascotaResumen | { id: number }) => cambio.mutate({ mascota, marcar: !ids.has(mascota.id) }),
    error: cambio.error,
  };
}
