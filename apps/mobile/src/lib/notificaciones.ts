import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificacionUsuario, Paginado } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';

/**
 * Notificaciones del usuario (HU-TRA-04). Se consultan cada minuto mientras
 * hay sesión; marcar una como leída cambia al instante y vuelve atrás si
 * el servidor falla.
 */
export function useNotificaciones() {
  const { usuario } = useSesion();
  const cliente = useQueryClient();
  const clave = ['notificaciones', usuario?.id] as const;

  const consulta = useQuery({
    queryKey: clave,
    queryFn: () => api.trazabilidad.notificaciones({ tamanoPagina: 30 }),
    enabled: !!usuario,
    refetchInterval: 60_000,
    retry: false,
  });

  const leer = useMutation({
    mutationFn: (n: NotificacionUsuario) => api.trazabilidad.marcarLeida(n.id),
    onMutate: (n) => {
      const anterior = cliente.getQueryData<Paginado<NotificacionUsuario>>(clave);
      if (anterior) cliente.setQueryData(clave, { ...anterior, items: anterior.items.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) });
      return { anterior };
    },
    onError: (_e, _n, contexto) => { if (contexto?.anterior) cliente.setQueryData(clave, contexto.anterior); },
  });

  const items = consulta.data?.items ?? [];
  return {
    consulta,
    items,
    sinLeer: items.filter((n) => !n.leida).length,
    leer: (n: NotificacionUsuario) => { if (!n.leida) leer.mutate(n); },
    leerTodas: () => items.filter((n) => !n.leida).forEach((n) => leer.mutate(n)),
  };
}
