import { visitaVigente, formatearFechaHora, type VisitaResumen } from '@huellitas/shared';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  BadgeCheck,
  CalendarClock,
  Check,
  Download,
  FileText,
  MoreHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { ErrorHttp, EstadoSolicitud, Modalidad, formatearFecha, type SolicitudResumen } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { SelectorFechaHora } from '@/componentes/ui/SelectorFechaHora/SelectorFechaHora';
import './bandeja.css';

const detalle = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);

type Accion = 'visita' | 'finalizar' | 'soportes';

const TITULOS: Record<Accion, string> = {
  visita: 'Agendar visita',
  finalizar: 'Finalizar adopción',
  soportes: 'Soportes de la solicitud',
};

/**
 * Acciones de una fila de la bandeja.
 *
 * A la vista solo lo que toca hacer según el estado (aprobar o rechazar,
 * finalizar, descargar la constancia). Lo demás va en el menú "Más
 * acciones" para que la fila no se llene de botones.
 */
export function AccionesSolicitud({
  solicitud: s,
  alDecidir,
  visitas = [],
  errorVisitas = false,
}: {
  solicitud: SolicitudResumen;
  visitas?: readonly VisitaResumen[];
  errorVisitas?: boolean;
  /** Solo llega si la solicitud sigue abierta y se puede aprobar o rechazar. */
  alDecidir?: (tipo: 'aprobar' | 'rechazar') => void;
}) {
  const cache = useQueryClient();
  const [accion, setAccion] = useState<Accion>();
  const [fecha, setFecha] = useState('');
  const [modalidad, setModalidad] = useState(Modalidad.Presencial);
  const [mensaje, setMensaje] = useState('');

  const revision = useMutation({
    mutationFn: () => api.adopcion.marcarEnRevision(s.id),
    onSuccess: async () => {
      setMensaje('La solicitud está en revisión. El adoptante podrá ver este estado.');
      await cache.invalidateQueries({ queryKey: ['solicitudes'] });
    },
  });

  const documentos = useQuery({
    queryKey: ['soportes', s.id],
    queryFn: () => api.adopcion.documentos(s.id),
    enabled: accion === 'soportes',
    retry: false,
  });

  const cambio = useMutation({
    mutationFn: () =>
      accion === 'finalizar'
        ? api.adopcion.finalizar(s.id)
        : api.adopcion.agendarVisita({ solicitudId: s.id, fecha, modalidad }),
    onSuccess: async () => {
      setMensaje(accion === 'finalizar' ? 'Adopción finalizada.' : 'Visita agendada.');
      setAccion(undefined);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['visitas-refugio'] }),
        cache.invalidateQueries({ queryKey: ['solicitudes'] }),
        cache.invalidateQueries({ queryKey: ['mascotas'] }),
        cache.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
      ]);
    },
  });

  const pdf = useMutation({
    mutationFn: () => api.adopcion.descargarConstancia(s.id),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement('a');
      enlace.href = url;
      enlace.download = `Constancia-${s.id}.pdf`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  });

  function abrir(valor: Accion) {
    cambio.reset();
    setMensaje('');
    setFecha('');
    setAccion(valor);
  }

  const visita = visitaVigente(visitas, s.id);
  const abierta = s.estado === EstadoSolicitud.Enviada || s.estado === EstadoSolicitud.EnRevision;
  const masAcciones: OpcionMenu[] = [
    ...(abierta && !visita ? [{ etiqueta: 'Agendar visita', icono: CalendarClock, alElegir: () => abrir('visita') }] : []),
    { etiqueta: 'Ver soportes', icono: FileText, alElegir: () => abrir('soportes') },
  ];

  return (
    <>
      {visita && <div className="sol-acciones__aviso" role="status">
        <strong>Visita {visita.estado === 'Confirmada' ? 'aceptada por el adoptante' : visita.estado === 'Reprogramada' ? 'rechazada: pendiente de nueva fecha' : visita.estado === 'Propuesta' ? 'pendiente de respuesta' : visita.estado.toLowerCase()}</strong>
        <p>{formatearFechaHora(visita.fecha)} · {visita.modalidad}</p>
      </div>}
      {errorVisitas && s.estado === EstadoSolicitud.EntrevistaVisita && <p role="alert">No pudimos consultar la respuesta a la visita. Inténtalo de nuevo.</p>}
      <div className="sol-acciones">
        {!MODO_DEMO && s.estado === EstadoSolicitud.Enviada && (
          <Boton className="sol-acciones__boton" cargando={revision.isPending} onClick={() => revision.mutate()}>
            <FileText size={16} strokeWidth={1.75} aria-hidden="true" />
            Poner en revisión
          </Boton>
        )}
        {alDecidir && (
          <>
            <Boton variante="primario" className="sol-acciones__boton" disabled={revision.isPending} onClick={() => alDecidir('aprobar')}>
              <Check size={16} strokeWidth={2.25} aria-hidden="true" />
              Aprobar
            </Boton>
            <Boton variante="peligro" className="sol-acciones__boton" disabled={revision.isPending} onClick={() => alDecidir('rechazar')}>
              <X size={16} strokeWidth={2.25} aria-hidden="true" />
              Rechazar
            </Boton>
          </>
        )}
        {s.estado === EstadoSolicitud.Aprobada && (
          <Boton variante="primario" className="sol-acciones__boton" onClick={() => abrir('finalizar')}>
            <BadgeCheck size={16} strokeWidth={2} aria-hidden="true" />
            Finalizar adopción
          </Boton>
        )}
        {s.estado === EstadoSolicitud.Finalizada && (
          <Boton className="sol-acciones__boton" cargando={pdf.isPending} onClick={() => pdf.mutate()}>
            <Download size={16} strokeWidth={2} aria-hidden="true" />
            Constancia
          </Boton>
        )}
        {s.estado === EstadoSolicitud.EntrevistaVisita && visita?.estado !== 'Confirmada' && (
          <span
            className="sol-acciones__nota"
            title="El adoptante debe aceptar la visita para continuar."
          >
            <CalendarClock size={16} strokeWidth={1.75} aria-hidden="true" />
            {visita?.estado === 'Reprogramada' ? 'Pendiente de nueva fecha' : 'Esperando confirmación de visita'}
          </span>
        )}
        <MenuMas etiqueta={`Más acciones para la solicitud ${s.codigo}`} opciones={masAcciones} />
      </div>

      {mensaje && <p role="status" className="sol-acciones__aviso">{mensaje}</p>}
      {revision.isError && <p role="alert" className="sol-acciones__aviso campo__error">{detalle(revision.error)}</p>}
      {pdf.isError && <p role="alert" className="sol-acciones__aviso campo__error">{detalle(pdf.error)}</p>}

      {accion && (
        <Modal titulo={TITULOS[accion]} compacto ocupado={cambio.isPending} alCerrar={() => setAccion(undefined)}>
          <p className="sol-modal__contexto">
            {s.codigo} · {s.nombreMascota} · {s.nombreAdoptante}
          </p>
          {accion === 'finalizar' && (
            <p>
              ¿Confirmas que la adopción se completó? La mascota quedará adoptada y las otras solicitudes activas se
              cerrarán automáticamente.
            </p>
          )}
          {accion === 'visita' && (
            <>
              <SelectorFechaHora etiqueta="Fecha y hora de la visita" valor={fecha} alCambiar={setFecha} />
              <label className="campo">
                Modalidad
                <select className="campo__control" value={modalidad} onChange={(e) => setModalidad(Number(e.target.value))}>
                  <option value={0}>Presencial</option>
                  <option value={1}>Virtual</option>
                </select>
              </label>
              <p className="sol-modal__nota">
                La fecha usa la hora local de este equipo. El backend todavía no devuelve la visita al adoptante ni
                permite aprobar después de agendar; acuerda el horario con él por un canal de contacto.
              </p>
            </>
          )}
          {accion === 'soportes' ? (
            documentos.isPending ? (
              <EstadoCargando variante="compacto" mensaje="Cargando documentos…" />
            ) : documentos.isError ? (
              <p role="alert">
                {detalle(documentos.error)} <Boton onClick={() => void documentos.refetch()}>Reintentar</Boton>
              </p>
            ) : documentos.data?.length ? (
              <ul className="sol-soportes">
                {documentos.data.map((d) => (
                  <li key={d.documentoId}>
                    <FileText size={18} strokeWidth={1.75} aria-hidden="true" />
                    {/^https:\/\//i.test(d.archivoUrl) ? (
                      <a href={d.archivoUrl} target="_blank" rel="noopener noreferrer">{d.tipo}</a>
                    ) : (
                      <span>{d.tipo}</span>
                    )}
                    <span className="sol-soportes__fecha">{formatearFecha(d.fechaCarga)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>El adoptante aún no adjuntó soportes.</p>
            )
          ) : (
            <>
              {cambio.isError && <p role="alert" className="campo__error">{detalle(cambio.error)}</p>}
              <div className="publicacion-navegacion">
                <Boton disabled={cambio.isPending} onClick={() => setAccion(undefined)}>Cancelar</Boton>
                <Boton
                  variante="primario"
                  cargando={cambio.isPending}
                  disabled={accion === 'visita' && !(Date.parse(fecha) > Date.now())}
                  onClick={() => cambio.mutate()}
                >
                  Confirmar
                </Boton>
              </div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}

interface OpcionMenu {
  readonly etiqueta: string;
  readonly icono: LucideIcon;
  readonly alElegir: () => void;
}

/**
 * Menú "⋯" con las acciones secundarias.
 *
 * Usa el popover nativo: se dibuja por encima de todo (la tabla tiene
 * desplazamiento propio y lo recortaría) y cierra solo con Escape o al
 * tocar fuera. La posición se calcula al abrir, pegada al botón.
 */
function MenuMas({ etiqueta, opciones }: { etiqueta: string; opciones: readonly OpcionMenu[] }): ReactNode {
  const id = useId();
  const boton = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);

  useEffect(() => {
    const capa = menu.current;
    if (!capa) return;
    const alCambiar = (evento: Event) => {
      const abre = (evento as ToggleEvent).newState === 'open';
      setAbierto(abre);
      if (!abre || !boton.current) return;
      const caja = boton.current.getBoundingClientRect();
      const ancho = capa.offsetWidth;
      const alto = capa.offsetHeight;
      const izquierda = Math.max(8, Math.min(caja.right - ancho, innerWidth - ancho - 8));
      const arriba = caja.bottom + 6 + alto > innerHeight ? caja.top - alto - 6 : caja.bottom + 6;
      capa.style.left = `${izquierda}px`;
      capa.style.top = `${Math.max(8, arriba)}px`;
      capa.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    };
    capa.addEventListener('toggle', alCambiar);
    return () => capa.removeEventListener('toggle', alCambiar);
  }, []);

  // Si la página se desplaza el menú quedaría flotando lejos del botón.
  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => menu.current?.hidePopover();
    addEventListener('scroll', cerrar, { capture: true, passive: true });
    addEventListener('resize', cerrar);
    return () => {
      removeEventListener('scroll', cerrar, { capture: true });
      removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  function elegir(opcion: OpcionMenu) {
    menu.current?.hidePopover();
    boton.current?.focus();
    opcion.alElegir();
  }

  function moverFoco(evento: React.KeyboardEvent) {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    evento.preventDefault();
    const items = [...(menu.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? [])];
    const actual = items.indexOf(document.activeElement as HTMLButtonElement);
    const siguiente = (actual + (evento.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[siguiente]?.focus();
  }

  return (
    <>
      <button
        ref={boton}
        type="button"
        className={`sol-acciones__mas${abierto ? ' sol-acciones__mas--abierto' : ''}`}
        aria-label={etiqueta}
        title="Más acciones"
        aria-haspopup="menu"
        aria-expanded={abierto}
        // React 18 no tipa el popover nativo; va como atributo HTML.
        {...{ popovertarget: id }}
      >
        <MoreHorizontal size={20} strokeWidth={2} aria-hidden="true" />
      </button>
      <div ref={menu} id={id} {...{ popover: 'auto' }} role="menu" aria-label={etiqueta} className="sol-menu" onKeyDown={moverFoco}>
        {opciones.map((opcion) => (
          <button key={opcion.etiqueta} type="button" role="menuitem" className="sol-menu__item" onClick={() => elegir(opcion)}>
            <opcion.icono size={18} strokeWidth={1.75} aria-hidden="true" />
            {opcion.etiqueta}
          </button>
        ))}
      </div>
    </>
  );
}
