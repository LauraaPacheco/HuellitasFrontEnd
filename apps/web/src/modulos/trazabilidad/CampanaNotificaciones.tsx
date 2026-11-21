import { useEffect, useId, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  AlarmClock, Archive, BadgeCheck, Bell, BellOff, CalendarCheck, CircleX, ClipboardCheck, HeartHandshake, Inbox, Search, Send, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import { describirNotificacion, haceCuanto, type NotificacionUsuario, type Paginado, type TipoAviso } from '@huellitas/shared';
import { api } from '@/lib/api';
import './notificaciones.css';

const CLAVE = ['notificaciones'] as const;

const ICONOS: Record<TipoAviso, LucideIcon> = {
  enviada: Send, revision: Search, visita: CalendarCheck, aprobada: BadgeCheck, rechazada: CircleX,
  finalizada: HeartHandshake, cerrada: Archive, seguimiento: ClipboardCheck, seguimientoVencido: AlarmClock,
  nuevaSolicitud: Inbox, refugio: ShieldCheck, general: Bell,
};
/** En el panel web solo tienen pantalla la bandeja y la verificación de refugios. */
const RUTAS_DESTINO = { bandeja: '/solicitudes', refugios: '/refugios', solicitudes: null } as const;

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
  const [pestana, setPestana] = useState<'sinLeer' | 'todas'>('sinLeer');
  const cache = useQueryClient();
  const navegar = useNavigate();

  const consulta = useQuery({
    queryKey: CLAVE,
    queryFn: () => api.trazabilidad.notificaciones({ tamanoPagina: 20 }),
    refetchInterval: 60_000,
    refetchIntervalInBackground: false,
    retry: false,
  });
  const items = consulta.data?.items ?? [];
  const sinLeer = items.filter((n) => !n.leida).length;
  const visibles = pestana === 'sinLeer' ? items.filter((n) => !n.leida) : items;

  const leer = useMutation({
    mutationFn: (n: NotificacionUsuario) => api.trazabilidad.marcarLeida(n.id),
    onMutate: (n) => {
      const anterior = cache.getQueryData<Paginado<NotificacionUsuario>>(CLAVE);
      if (anterior) cache.setQueryData(CLAVE, { ...anterior, items: anterior.items.map((x) => (x.id === n.id ? { ...x, leida: true } : x)) });
      return { anterior };
    },
    onError: (_e, _n, contexto) => { if (contexto?.anterior) cache.setQueryData(CLAVE, contexto.anterior); },
  });

  function abrir(n: NotificacionUsuario) {
    if (!n.leida) leer.mutate(n);
    const destino = describirNotificacion(n).destino;
    const ruta = destino ? RUTAS_DESTINO[destino] : null;
    if (ruta) { panel.current?.hidePopover(); navegar(ruta); }
  }

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
      // Abre en "Sin leer" si hay algo nuevo; si no, directo en "Todas".
      setPestana(capa.dataset.sinLeer === '0' ? 'todas' : 'sinLeer');
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
      <div ref={panel} id={id} {...{ popover: 'auto' }} role="dialog" aria-label="Notificaciones" className="notificaciones" data-sin-leer={sinLeer}>
        <div className="notificaciones__cabecera">
          <h2 className="notificaciones__titulo">Notificaciones</h2>
          {sinLeer > 0 && <button type="button" className="notificaciones__todas" onClick={leerTodas}>Marcar todas como leídas</button>}
        </div>
        <div className="notificaciones__pestanas" role="tablist" aria-label="Filtrar notificaciones">
          <button type="button" role="tab" aria-selected={pestana === 'sinLeer'} className="notificaciones__pestana" onClick={() => setPestana('sinLeer')}>
            Sin leer {sinLeer > 0 && <span className="notificaciones__cuenta notificaciones__cuenta--fuerte">{sinLeer}</span>}
          </button>
          <button type="button" role="tab" aria-selected={pestana === 'todas'} className="notificaciones__pestana" onClick={() => setPestana('todas')}>
            Todas {items.length > 0 && <span className="notificaciones__cuenta">{items.length}</span>}
          </button>
        </div>
        {consulta.isPending ? (
          <p className="notificaciones__vacio">Cargando…</p>
        ) : consulta.isError ? (
          <p className="notificaciones__vacio" role="alert">No pudimos cargar tus notificaciones.</p>
        ) : visibles.length === 0 ? (
          <div className="notificaciones__vacio">
            <span className="notificaciones__vacio-icono" aria-hidden="true"><BellOff size={22} strokeWidth={1.75} /></span>
            <p>{pestana === 'sinLeer' && items.length ? 'Estás al día. No tienes avisos sin leer.' : 'Aún no tienes notificaciones.'}</p>
          </div>
        ) : (
          <ul className="notificaciones__lista" role="tabpanel">
            {visibles.map((n) => {
              const aviso = describirNotificacion(n);
              const Icono = ICONOS[aviso.tipo];
              const ruta = aviso.destino ? RUTAS_DESTINO[aviso.destino] : null;
              return (
                <li key={n.id} className={`notificaciones__item${n.leida ? '' : ' notificaciones__item--nueva'}`}>
                  <span className={`notificaciones__icono notificaciones__icono--${aviso.tono}`} aria-hidden="true"><Icono size={18} strokeWidth={1.9} /></span>
                  <div className="notificaciones__texto">
                    {/* El botón cubre toda la fila (ver CSS); la acción va encima. */}
                    <button type="button" className="notificaciones__principal" onClick={() => abrir(n)}
                      aria-label={`${n.leida ? '' : 'Nuevo. '}${aviso.detalle}. ${haceCuanto(n.fecha)}, ${aviso.categoria}`}>
                      <span className="notificaciones__frase">
                        {aviso.frase.map((x, i) => (x.resaltado ? <strong key={i}>{x.texto}</strong> : <span key={i}>{x.texto}</span>))}
                      </span>
                    </button>
                    <span className="notificaciones__meta" aria-hidden="true">{haceCuanto(n.fecha)} · {aviso.categoria}</span>
                    {aviso.nota && <span className="notificaciones__nota">{aviso.nota}</span>}
                    {aviso.accion && ruta && (
                      <span className="notificaciones__acciones">
                        <button type="button" className="notificaciones__accion" onClick={() => abrir(n)}>{aviso.accion}</button>
                      </span>
                    )}
                  </div>
                  {!n.leida && <span className="notificaciones__punto" aria-hidden="true" />}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
