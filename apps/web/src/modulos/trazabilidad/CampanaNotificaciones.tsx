import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, BellOff } from 'lucide-react';
import { haceCuanto, type NotificacionUsuario, type Paginado } from '@huellitas/shared';
import { api } from '@/lib/api';
import './notificaciones.css';

const CLAVE = ['notificaciones'] as const;

/**
 * HU-TRA-04: campana con las notificaciones del usuario. Muestra cuántas
 * hay sin leer; al abrirla se listan y tocar una la marca como leída.
 * Se consulta cada minuto mientras la pestaña está a la vista.
 *
 * Usa el popover nativo (como el menú "Más acciones" de la bandeja) para
 * quedar por encima de todo; la posición se calcula al abrir.
 */
export function CampanaNotificaciones({ className = '' }: { className?: string }) {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const cache = useQueryClient();

  const consulta = useQuery({
    queryKey: CLAVE,
    queryFn: () => api.trazabilidad.notificaciones({ tamanoPagina: 20 }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const items = consulta.data?.items ?? [];
  const sinLeer = items.filter((n) => !n.leida).length;

  const leer = useMutation({
    mutationFn: (n: NotificacionUsuario) => api.trazabilidad.marcarLeida(n.id),
    onMutate: (n) => {
      const anterior = cache.getQueryData<Paginado<NotificacionUsuario>>(CLAVE);
      if (anterior) cache.setQueryData(CLAVE, { ...anterior, items: anterior.items.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) });
      return { anterior };
    },
    onError: (_e, _n, contexto) => { if (contexto?.anterior) cache.setQueryData(CLAVE, contexto.anterior); },
  });

  function leerTodas() {
    items.filter((n) => !n.leida).forEach((n) => leer.mutate(n));
  }

  useEffect(() => {
    const capa = panel.current;
    if (!capa) return;
    const alCambiar = (evento: Event) => {
      const abre = (evento as ToggleEvent).newState === 'open';
      setAbierto(abre);
      if (!abre || !boton.current) return;
      void consulta.refetch();
      const caja = boton.current.getBoundingClientRect();
      const ancho = Math.min(360, innerWidth - 16);
      capa.style.width = `${ancho}px`;
      const alto = capa.offsetHeight;
      const izquierda = Math.max(8, Math.min(caja.left, innerWidth - ancho - 8));
      // Debajo del botón si cabe; si no (la campana del menú lateral está abajo), encima.
      const arriba = caja.bottom + 8 + alto > innerHeight ? caja.top - alto - 8 : caja.bottom + 8;
      capa.style.left = `${izquierda}px`;
      capa.style.top = `${Math.max(8, arriba)}px`;
    };
    capa.addEventListener('toggle', alCambiar);
    return () => capa.removeEventListener('toggle', alCambiar);
    // consulta.refetch es estable entre renders.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={`campana ${className}`}
        aria-label={sinLeer ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
        title="Notificaciones"
        aria-haspopup="dialog"
        aria-expanded={abierto}
        {...{ popovertarget: id }}
      >
        <Bell size={18} strokeWidth={1.75} aria-hidden="true" />
        {sinLeer > 0 && <span className="campana__contador" aria-hidden="true">{sinLeer > 9 ? '9+' : sinLeer}</span>}
      </button>
      <div ref={panel} id={id} {...{ popover: 'auto' }} role="dialog" aria-label="Notificaciones" className="notificaciones">
        <div className="notificaciones__cabecera">
          <h2 className="notificaciones__titulo">Notificaciones</h2>
          {sinLeer > 0 && <button type="button" className="notificaciones__todas" onClick={leerTodas}>Marcar todas como leídas</button>}
        </div>
        {consulta.isPending ? (
          <p className="notificaciones__vacio">Cargando…</p>
        ) : consulta.isError ? (
          <p className="notificaciones__vacio" role="alert">No pudimos cargar tus notificaciones.</p>
        ) : items.length === 0 ? (
          <p className="notificaciones__vacio"><BellOff size={20} strokeWidth={1.75} aria-hidden="true" /> No tienes notificaciones.</p>
        ) : (
          <ul className="notificaciones__lista">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notificaciones__item${n.leida ? '' : ' notificaciones__item--nueva'}`}
                  aria-label={`${n.leida ? '' : 'Sin leer. '}${n.mensaje}`}
                  onClick={() => { if (!n.leida) leer.mutate(n); }}
                >
                  {!n.leida && <span className="notificaciones__punto" aria-hidden="true" />}
                  <span className="notificaciones__texto">
                    <span>{n.mensaje}</span>
                    <span className="notificaciones__fecha">{haceCuanto(n.fecha)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
