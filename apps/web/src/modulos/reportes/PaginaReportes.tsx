import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, Hand, MapPin, Navigation, PawPrint, Pencil, Phone, Signpost, Trash2, User } from 'lucide-react';
import {
  ErrorHttp, ESTADO_REPORTE, ETIQUETA_TIPO_REPORTE, EstadoReporte, NivelRol, TipoReporte, esReportePrioritario, estadoPideMotivo,
  formatearFechaHora, haceCuanto, type DetalleReporte, type PinReporte, type ReporteBandeja,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { MapaReportes, type ReporteUbicado } from './MapaReportes';
import { ModalConvertirMascota, ModalEditarReporte, ModalEliminarReporte } from './ModalesReporte';
import '@/componentes/ui/Campo/campo.css';
import '@/modulos/apoyos/apoyos.css';
import './reportes.css';

type Filtro = 'sin-tomar' | 'mios' | 'atencion' | 'todos';
const TIPOS = [TipoReporte.Herido, TipoReporte.Maltrato, TipoReporte.EnCalle, TipoReporte.Otro];
/** Desde En atención; No encontrado y Cerrado piden motivo. */
const CIERRES = [EstadoReporte.Rescatado, EstadoReporte.NoEncontrado, EstadoReporte.Cerrado];

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);

/**
 * Lo que el panel sabe de un reporte. El backend lo reparte: el mapa trae
 * la ubicación de todos y la bandeja (solo refugios) trae descripción,
 * fecha y si el reporte es tuyo. Aquí se juntan por id.
 */
interface Fila {
  readonly id: number;
  readonly numeroReporte: string;
  readonly tipo: TipoReporte;
  readonly estado: EstadoReporte;
  readonly pin: PinReporte | null;
  readonly bandeja: ReporteBandeja | null;
}

function juntar(pines: readonly PinReporte[], bandeja: readonly ReporteBandeja[]): Fila[] {
  const filas = new Map<number, Fila>();
  for (const p of pines) filas.set(p.id, { id: p.id, numeroReporte: p.numeroReporte, tipo: p.tipo, estado: p.estado, pin: p, bandeja: null });
  for (const b of bandeja) {
    const previa = filas.get(b.id);
    // La bandeja es más reciente para el estado de los reportes propios.
    filas.set(b.id, { id: b.id, numeroReporte: b.numeroReporte, tipo: b.tipo, estado: b.estado, pin: previa?.pin ?? null, bandeja: b });
  }
  return [...filas.values()];
}

function cumpleFiltro(f: Fila, filtro: Filtro) {
  if (filtro === 'sin-tomar') return f.estado === EstadoReporte.Recibido;
  if (filtro === 'mios') return f.bandeja?.asignadoAMi === true;
  if (filtro === 'atencion') return f.estado === EstadoReporte.EnAtencion;
  return true;
}

/** Urgentes sin tomar primero, luego los más recientes. */
const peso = (f: Fila) => (f.estado === EstadoReporte.Recibido && esReportePrioritario(f.tipo) ? 0 : f.estado === EstadoReporte.Recibido ? 1 : 2);
const ordenar = (a: Fila, b: Fila) => peso(a) - peso(b) || (b.bandeja?.fechaReporte ?? '').localeCompare(a.bandeja?.fechaReporte ?? '') || b.id - a.id;

/**
 * HU-REP-02 a 04: los refugios ven en el mapa de Cali lo que reportan los
 * ciudadanos, toman los casos que pueden atender, los cierran y crean la
 * ficha de la mascota rescatada. El administrador además edita y elimina.
 */
export function PaginaReportes() {
  const { usuario } = useSesion();
  const esRefugio = usuario?.rol.nivel === NivelRol.Refugio;
  const esAdmin = usuario?.rol.nivel === NivelRol.Administrador;
  const cache = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>('sin-tomar');
  const [tipo, setTipo] = useState<TipoReporte | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState('');

  const pines = useQuery({ queryKey: ['reportes', 'mapa'], queryFn: () => api.reportes.mapa(), retry: false });
  // La bandeja es solo de refugios: un administrador sin refugio recibe 400.
  const bandeja = useQuery({ queryKey: ['reportes', 'bandeja'], queryFn: () => api.reportes.bandeja({ tamanoPagina: 100 }), enabled: esRefugio && !!usuario?.refugioId, retry: false });

  const refrescar = (texto: string) => {
    setMensaje(texto);
    void cache.invalidateQueries({ queryKey: ['reportes'] });
  };

  const filas = useMemo(() => juntar(pines.data ?? [], bandeja.data?.items ?? []), [pines.data, bandeja.data]);
  const visibles = useMemo(() => filas.filter((f) => cumpleFiltro(f, filtro) && (tipo === null || f.tipo === tipo)).sort(ordenar), [filas, filtro, tipo]);
  const ubicados = useMemo(() => visibles.flatMap((f): ReporteUbicado[] => (f.pin ? [f.pin] : [])), [visibles]);
  const actual = filas.find((f) => f.id === seleccionado) ?? null;
  const conteo = (f: Filtro) => filas.filter((x) => cumpleFiltro(x, f)).length;
  const urgentes = filas.filter((f) => f.estado === EstadoReporte.Recibido && esReportePrioritario(f.tipo)).length;
  const filtros: readonly { valor: Filtro; texto: string }[] = [
    { valor: 'sin-tomar', texto: 'Sin tomar' },
    esRefugio ? { valor: 'mios', texto: 'Mis casos' } : { valor: 'atencion', texto: 'En atención' },
    { valor: 'todos', texto: 'Todos' },
  ];

  const cargando = pines.isPending || (bandeja.fetchStatus === 'fetching' && bandeja.isPending);
  const error = pines.error ?? bandeja.error;

  return (
    <>
      <Encabezado
        titulo="Reportes ciudadanos"
        resumen="Lo que reportan los ciudadanos desde la app: animales en la calle, heridos o maltratados en Cali."
      />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}

      {cargando ? (
        <EstadoCargando mensaje="Cargando reportes…" />
      ) : error ? (
        <EstadoError titulo="No pudimos cargar los reportes" error={error} alReintentar={() => { void pines.refetch(); void bandeja.refetch(); }} reintentando={pines.isFetching || bandeja.isFetching} />
      ) : (
        <>
          {urgentes > 0 && (
            <p className="reportes-alerta" role="status">
              <AlertTriangle size={18} strokeWidth={2} aria-hidden="true" />
              {urgentes === 1 ? 'Hay 1 caso urgente sin refugio.' : `Hay ${urgentes} casos urgentes sin refugio.`}
            </p>
          )}

          <div className="reportes-filtros">
            <div className="apoyos-pestanas" role="group" aria-label="Filtrar por estado">
              {filtros.map((f) => (
                <button key={f.valor} type="button" className="apoyos-pestana" aria-pressed={filtro === f.valor}
                  onClick={() => { setFiltro(f.valor); setSeleccionado(null); }}>
                  {f.texto} · {conteo(f.valor)}
                </button>
              ))}
            </div>
            <label className="reportes-tipo">
              <span>Tipo</span>
              <select className="campo__control" value={tipo ?? ''} onChange={(e) => { setTipo(e.target.value === '' ? null : Number(e.target.value) as TipoReporte); setSeleccionado(null); }}>
                <option value="">Todos</option>
                {TIPOS.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_REPORTE[t]}</option>)}
              </select>
            </label>
          </div>

          <div className="reportes-vista">
            <div className="reportes-vista__mapa">
              <MapaReportes reportes={ubicados} seleccionado={seleccionado} alSeleccionar={(id) => { setSeleccionado(id); setMensaje(''); }} />
              <ul className="reportes-leyenda" aria-label="Colores del mapa">
                <li><span className="pin pin--urgente" aria-hidden="true"><span /></span> Urgente</li>
                <li><span className="pin pin--nuevo" aria-hidden="true"><span /></span> Sin tomar</li>
                <li><span className="pin pin--atencion" aria-hidden="true"><span /></span> En atención</li>
                <li><span className="pin pin--cerrado" aria-hidden="true"><span /></span> Rescatado</li>
              </ul>
            </div>

            <div className="reportes-vista__lado">
              {actual && (
                <DetalleReporteVista
                  key={actual.id}
                  fila={actual}
                  esRefugio={esRefugio}
                  esAdmin={esAdmin}
                  alCambiar={(texto, filtroNuevo) => { if (filtroNuevo) setFiltro(filtroNuevo); refrescar(texto); }}
                  alCerrar={() => setSeleccionado(null)}
                />
              )}

              {visibles.length === 0 ? (
                <EstadoVacio
                  ilustracion="trio"
                  titulo={filtro === 'sin-tomar' ? 'No hay reportes sin tomar' : 'No hay reportes con este filtro'}
                  descripcion={filtro === 'sin-tomar' ? 'Todos los casos ya tienen un refugio.' : 'Prueba con otro estado o tipo.'}
                />
              ) : (
                <ul className="reportes-lista" aria-label="Reportes">
                  {visibles.map((f) => {
                    const urgente = esReportePrioritario(f.tipo);
                    return (
                      <li key={f.id}>
                        <button type="button" className="reporte-fila" aria-current={f.id === seleccionado || undefined}
                          onClick={() => { setSeleccionado(f.id === seleccionado ? null : f.id); setMensaje(''); }}>
                          <span className={`reporte-fila__icono reporte-fila__icono--${urgente ? 'urgente' : 'normal'}`} aria-hidden="true">
                            {urgente ? <AlertTriangle size={18} strokeWidth={2} /> : <PawPrint size={18} strokeWidth={1.75} />}
                          </span>
                          <span className="reporte-fila__texto">
                            <span className="reporte-fila__titulo">
                              {ETIQUETA_TIPO_REPORTE[f.tipo]} <span className="reporte-fila__numero">{f.numeroReporte}</span>
                            </span>
                            <span className="reporte-fila__meta">
                              {f.bandeja ? `${f.bandeja.descripcion} · ${haceCuanto(f.bandeja.fechaReporte)}` : 'Toca para ver el detalle'}
                              {f.bandeja?.asignadoAMi && ' · tu caso'}
                              {!f.pin && ' · sin ubicación en el mapa'}
                            </span>
                          </span>
                          <Insignia estado={ESTADO_REPORTE[f.estado]} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

interface PropsDetalle {
  readonly fila: Fila;
  readonly esRefugio: boolean;
  readonly esAdmin: boolean;
  readonly alCambiar: (mensaje: string, filtro?: Filtro) => void;
  readonly alCerrar: () => void;
}

type Modal = 'convertir' | 'editar' | 'eliminar' | null;

function DetalleReporteVista({ fila, esRefugio, esAdmin, alCambiar, alCerrar }: PropsDetalle) {
  const [estado, setEstado] = useState<EstadoReporte>(EstadoReporte.Rescatado);
  const [motivo, setMotivo] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const consulta = useQuery({ queryKey: ['reportes', 'detalle', fila.id], queryFn: () => api.reportes.obtener(fila.id), retry: false });
  const r: DetalleReporte | undefined = consulta.data;
  // El detalle completo solo llega al refugio asignado, al admin o a quien reportó.
  const esMio = fila.bandeja?.asignadoAMi === true || (esRefugio && r?.completo === true);
  const puedeGestionar = esAdmin || esMio;

  const accion = useMutation({
    mutationFn: (tipo: 'tomar' | 'estado') => tipo === 'tomar' ? api.reportes.tomar(fila.id) : api.reportes.cambiarEstado(fila.id, { nuevoEstado: estado, motivo }),
    onSuccess: (_d, tipo) => {
      setMotivo('');
      if (tipo === 'tomar') alCambiar('Tomaste el reporte. Ya es tu caso: actualiza su estado cuando lo atiendas.', esRefugio ? 'mios' : 'atencion');
      else alCambiar(`Marcaste el reporte como «${ESTADO_REPORTE[estado].etiqueta.toLowerCase()}».`, 'todos');
    },
  });

  const cerrarModal = (texto?: string) => { setModal(null); if (texto) alCambiar(texto); };
  const comoLlegar = r ? `https://www.google.com/maps/dir/?api=1&destination=${r.latitud},${r.longitud}` : null;

  return (
    <article className="reporte-detalle" aria-labelledby={`reporte-${fila.id}`}>
      <header className="reporte-detalle__cabecera">
        <div>
          <p className="reporte-detalle__numero">{fila.numeroReporte}{esReportePrioritario(fila.tipo) && <span className="reporte-detalle__urgente">Urgente</span>}</p>
          <h2 id={`reporte-${fila.id}`}>{ETIQUETA_TIPO_REPORTE[fila.tipo]}</h2>
        </div>
        <Insignia estado={ESTADO_REPORTE[r?.estado ?? fila.estado]} />
      </header>

      {consulta.isPending ? (
        <EstadoCargando mensaje="Cargando el detalle…" />
      ) : consulta.isError || !r ? (
        <p role="alert" className="campo__error">{consulta.error ? errorTexto(consulta.error) : 'No pudimos cargar el detalle.'}</p>
      ) : (
        <>
          <p className="reporte-detalle__descripcion">{r.descripcion}</p>
          {r.fotos.length > 0 && (
            <div className="reporte-detalle__fotos">
              {r.fotos.map((f, i) => <a key={f} href={f} target="_blank" rel="noreferrer"><img src={f} alt={`Foto ${i + 1} del reporte`} referrerPolicy="no-referrer" /></a>)}
            </div>
          )}

          <dl className="reporte-detalle__datos">
            {r.completo && <div><dt><MapPin size={16} strokeWidth={1.75} aria-hidden="true" /> Dirección</dt><dd>{r.direccion ?? 'Sin dirección'}</dd></div>}
            {r.puntoReferencia && <div><dt><Signpost size={16} strokeWidth={1.75} aria-hidden="true" /> Referencia</dt><dd>{r.puntoReferencia}</dd></div>}
            <div><dt><Clock size={16} strokeWidth={1.75} aria-hidden="true" /> Reportado</dt><dd>{formatearFechaHora(r.fechaReporte)}</dd></div>
            {r.completo && <div><dt><Hand size={16} strokeWidth={1.75} aria-hidden="true" /> Refugio</dt><dd>{r.refugioAsignado ?? 'Nadie lo ha tomado'}</dd></div>}
            {r.completo && <div><dt><User size={16} strokeWidth={1.75} aria-hidden="true" /> Reportó</dt><dd>{r.reportanteNombre ?? 'Anónimo'}</dd></div>}
            {r.reportanteTelefono && <div><dt><Phone size={16} strokeWidth={1.75} aria-hidden="true" /> Teléfono</dt><dd><a href={`tel:${r.reportanteTelefono}`}>{r.reportanteTelefono}</a></dd></div>}
          </dl>
          {!r.completo && <p className="reporte-detalle__nota">La dirección y el contacto de quien reportó se ven cuando tomas el reporte.</p>}

          {r.tipo === TipoReporte.Maltrato && (
            <p className="reporte-detalle__nota">Si confirmas el maltrato, denúncialo también ante la Policía (línea 123) o la Fiscalía (Ley 1774 de 2016).</p>
          )}
          {r.mascotaId !== null && (
            <p className="reporte-detalle__nota">Ya tiene ficha: <Link to={`/public/mascotas/${r.mascotaId}`}>ver la mascota</Link>.</p>
          )}

          {(esRefugio || esAdmin) && r.estado === EstadoReporte.Recibido && (
            <Boton variante="primario" disabled={accion.isPending} onClick={() => accion.mutate('tomar')}><Hand size={16} strokeWidth={2} aria-hidden="true" /> Tomar reporte</Boton>
          )}

          {puedeGestionar && r.estado === EstadoReporte.EnAtencion && (
            <div className="reporte-detalle__estado">
              <label className="campo"><span className="campo__etiqueta">Actualizar estado</span>
                <select className="campo__control" value={estado} onChange={(e) => setEstado(Number(e.target.value) as EstadoReporte)} disabled={accion.isPending}>
                  {CIERRES.map((e) => <option key={e} value={e}>{ESTADO_REPORTE[e].etiqueta}</option>)}
                </select></label>
              {estadoPideMotivo(estado) && (
                <label className="campo"><span className="campo__etiqueta">Motivo</span>
                  <textarea className="campo__control apoyos-area" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)}
                    placeholder={estado === EstadoReporte.NoEncontrado ? 'Fuimos al lugar y no estaba…' : 'Por qué se cierra el caso'} /></label>
              )}
              <Boton variante="primario" disabled={accion.isPending || (estadoPideMotivo(estado) && !motivo.trim())} onClick={() => accion.mutate('estado')}>Actualizar</Boton>
            </div>
          )}

          {esRefugio && esMio && r.estado === EstadoReporte.Rescatado && r.mascotaId === null && (
            <Boton variante="primario" onClick={() => setModal('convertir')}><PawPrint size={16} strokeWidth={2} aria-hidden="true" /> Crear ficha de la mascota</Boton>
          )}

          {accion.isError && <p role="alert" className="campo__error">{errorTexto(accion.error)}</p>}

          <div className="reporte-detalle__acciones">
            {comoLlegar && (
              <a className="boton boton--secundario" href={comoLlegar} target="_blank" rel="noreferrer">
                <Navigation size={16} strokeWidth={1.75} aria-hidden="true" /> Cómo llegar
              </a>
            )}
            {esAdmin && r.mascotaId === null && (
              <>
                <Boton onClick={() => setModal('editar')}><Pencil size={16} strokeWidth={1.75} aria-hidden="true" /> Editar</Boton>
                <Boton variante="peligro" onClick={() => setModal('eliminar')}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /> Eliminar</Boton>
              </>
            )}
            <Boton variante="texto" onClick={alCerrar}>Cerrar</Boton>
          </div>
        </>
      )}

      {modal === 'convertir' && r && <ModalConvertirMascota reporte={r} alCerrar={() => cerrarModal()} alCrear={() => cerrarModal('Creamos la ficha de la mascota. Ya está en tu catálogo como disponible.')} />}
      {modal === 'editar' && r && <ModalEditarReporte reporte={r} alCerrar={() => cerrarModal()} alGuardar={() => cerrarModal('Guardamos los cambios del reporte.')} />}
      {modal === 'eliminar' && r && <ModalEliminarReporte reporte={r} alCerrar={() => cerrarModal()} alEliminar={() => { cerrarModal('El reporte se eliminó.'); alCerrar(); }} />}
    </article>
  );
}
