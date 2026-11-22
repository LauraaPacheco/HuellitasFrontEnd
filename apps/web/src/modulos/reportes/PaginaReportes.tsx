import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clock, Hand, MapPin, Navigation, PawPrint } from 'lucide-react';
import {
  ErrorHttp, ESTADO_REPORTE, ETIQUETA_TIPO_REPORTE, EstadoReporte, NivelRol, TipoReporte, formatearFechaHora, haceCuanto,
  type ReporteResumen,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { MapaReportes, tieneUbicacion } from './MapaReportes';
import '@/componentes/ui/Campo/campo.css';
import '@/modulos/apoyos/apoyos.css';
import './reportes.css';

type Filtro = 'sin-tomar' | 'atencion' | 'todos';
const FILTROS: readonly { valor: Filtro; texto: string }[] = [
  { valor: 'sin-tomar', texto: 'Sin tomar' },
  { valor: 'atencion', texto: 'En atención' },
  { valor: 'todos', texto: 'Todos' },
];
const TIPOS = [TipoReporte.Herido, TipoReporte.Maltrato, TipoReporte.EnCalle, TipoReporte.Otro];
/** Estados a los que el refugio puede pasar un reporte que ya tomó. */
const CIERRES = [EstadoReporte.Rescatado, EstadoReporte.NoEncontrado, EstadoReporte.Cerrado];

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);

function cumpleFiltro(r: ReporteResumen, filtro: Filtro) {
  if (filtro === 'sin-tomar') return r.estado === EstadoReporte.Recibido && !r.refugioAsignado;
  if (filtro === 'atencion') return r.estado === EstadoReporte.EnAtencion;
  return true;
}

/** Prioritarios primero, luego los más recientes. */
const ordenar = (a: ReporteResumen, b: ReporteResumen) =>
  Number(b.esPrioritario) - Number(a.esPrioritario) || b.fechaReporte.localeCompare(a.fechaReporte);

/**
 * HU-REP-02: los refugios ven en el mapa de Cali lo que reportan los
 * ciudadanos desde la app (animales en la calle, heridos o maltratados)
 * y toman los casos que pueden atender.
 */
export function PaginaReportes() {
  const { usuario } = useSesion();
  const esRefugio = usuario?.rol.nivel === NivelRol.Refugio;
  const refugioId = usuario?.refugioId ?? null;
  const cache = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>('sin-tomar');
  const [tipo, setTipo] = useState<TipoReporte | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  const [mensaje, setMensaje] = useState('');

  const consulta = useQuery({ queryKey: ['reportes', 'mapa'], queryFn: () => api.reportes.mapa(), retry: false });
  // El listado trae el nombre del refugio asignado; con él se sabe cuáles son "míos".
  const miRefugio = useQuery({
    queryKey: ['refugios', 'perfil', refugioId],
    queryFn: () => api.refugios.miPerfil(refugioId!),
    enabled: esRefugio && !!refugioId,
    retry: false,
  });

  const accion = useMutation({
    mutationFn: ({ id, estado }: { id: number; estado?: EstadoReporte }) =>
      estado === undefined ? api.reportes.tomar(id) : api.reportes.cambiarEstado(id, { nuevoEstado: estado }),
    onSuccess: (_d, { estado }) => {
      setMensaje(estado === undefined ? 'Tomaste el reporte. Ya es tuyo: actualiza su estado cuando lo atiendas.' : `Marcaste el reporte como «${ESTADO_REPORTE[estado].etiqueta.toLowerCase()}».`);
      // Se cambia al filtro donde quedó el reporte para que siga a la vista.
      setFiltro(estado === undefined ? 'atencion' : 'todos');
      void cache.invalidateQueries({ queryKey: ['reportes'] });
    },
  });

  const todos = consulta.data ?? [];
  const visibles = useMemo(
    () => todos.filter((r) => cumpleFiltro(r, filtro) && (tipo === null || r.tipo === tipo)).sort(ordenar),
    [todos, filtro, tipo],
  );
  const ubicados = useMemo(() => visibles.filter(tieneUbicacion), [visibles]);
  const actual = visibles.find((r) => r.id === seleccionado) ?? null;
  const conteo = (f: Filtro) => todos.filter((r) => cumpleFiltro(r, f)).length;
  const urgentes = todos.filter((r) => r.esPrioritario && r.estado === EstadoReporte.Recibido && !r.refugioAsignado).length;

  // Sin el módulo en el servidor, la ruta responde 404: se explica en vez de mostrar un error.
  const sinModulo = consulta.error instanceof ErrorHttp && (consulta.error.estadoHttp === 404 || consulta.error.estadoHttp === 405);

  return (
    <>
      <Encabezado
        titulo="Reportes ciudadanos"
        resumen="Lo que reportan los ciudadanos desde la app: animales en la calle, heridos o maltratados en Cali."
      />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}
      {accion.isError && <p role="alert" className="campo__error">{errorTexto(accion.error)}</p>}

      {consulta.isPending ? (
        <EstadoCargando mensaje="Cargando reportes…" />
      ) : sinModulo ? (
        <EstadoVacio
          ilustracion="confundido"
          titulo="Los reportes todavía no llegan al panel"
          descripcion="El servidor aún no publica el módulo de reportes ciudadanos. Cuando esté, aquí verás el mapa con cada caso."
        />
      ) : consulta.isError ? (
        <EstadoError titulo="No pudimos cargar los reportes" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
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
              {FILTROS.map((f) => (
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
                <li><span className="pin pin--cerrado" aria-hidden="true"><span /></span> Cerrado</li>
              </ul>
            </div>

            <div className="reportes-vista__lado">
              {actual && (
                <DetalleReporte
                  reporte={actual}
                  esRefugio={esRefugio}
                  esMio={!!actual.refugioAsignado && actual.refugioAsignado === miRefugio.data?.nombre}
                  ocupado={accion.isPending}
                  alTomar={() => accion.mutate({ id: actual.id })}
                  alCambiar={(estado) => accion.mutate({ id: actual.id, estado })}
                  alCerrar={() => setSeleccionado(null)}
                />
              )}

              {visibles.length === 0 ? (
                <EstadoVacio
                  ilustracion="trio"
                  titulo={filtro === 'sin-tomar' ? 'No hay reportes sin tomar' : 'No hay reportes con este filtro'}
                  descripcion={filtro === 'sin-tomar' ? 'Todos los casos ya tienen un refugio. Te avisaremos cuando llegue uno nuevo.' : 'Prueba con otro estado o tipo.'}
                />
              ) : (
                <ul className="reportes-lista" aria-label="Reportes">
                  {visibles.map((r) => (
                    <li key={r.id}>
                      <button type="button" className="reporte-fila" aria-current={r.id === seleccionado || undefined}
                        onClick={() => { setSeleccionado(r.id === seleccionado ? null : r.id); setMensaje(''); }}>
                        <span className={`reporte-fila__icono reporte-fila__icono--${r.esPrioritario ? 'urgente' : 'normal'}`} aria-hidden="true">
                          {r.esPrioritario ? <AlertTriangle size={18} strokeWidth={2} /> : <PawPrint size={18} strokeWidth={1.75} />}
                        </span>
                        <span className="reporte-fila__texto">
                          <span className="reporte-fila__titulo">
                            {ETIQUETA_TIPO_REPORTE[r.tipo]} <span className="reporte-fila__numero">{r.numeroReporte}</span>
                          </span>
                          <span className="reporte-fila__meta">
                            {r.direccion ?? r.zona ?? 'Sin dirección'} · {haceCuanto(r.fechaReporte)}
                            {!tieneUbicacion(r) && ' · sin ubicación en el mapa'}
                          </span>
                        </span>
                        <Insignia estado={ESTADO_REPORTE[r.estado]} />
                      </button>
                    </li>
                  ))}
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
  readonly reporte: ReporteResumen;
  readonly esRefugio: boolean;
  readonly esMio: boolean;
  readonly ocupado: boolean;
  readonly alTomar: () => void;
  readonly alCambiar: (estado: EstadoReporte) => void;
  readonly alCerrar: () => void;
}

function DetalleReporte({ reporte: r, esRefugio, esMio, ocupado, alTomar, alCambiar, alCerrar }: PropsDetalle) {
  const [estado, setEstado] = useState<EstadoReporte>(EstadoReporte.Rescatado);
  const sinTomar = r.estado === EstadoReporte.Recibido && !r.refugioAsignado;
  const abierto = r.estado === EstadoReporte.Recibido || r.estado === EstadoReporte.EnAtencion;
  const comoLlegar = tieneUbicacion(r) ? `https://www.google.com/maps/dir/?api=1&destination=${r.latitud},${r.longitud}` : null;

  return (
    <article className="reporte-detalle" aria-labelledby={`reporte-${r.id}`}>
      <header className="reporte-detalle__cabecera">
        <div>
          <p className="reporte-detalle__numero">{r.numeroReporte}{r.esPrioritario && <span className="reporte-detalle__urgente">Urgente</span>}</p>
          <h2 id={`reporte-${r.id}`}>{ETIQUETA_TIPO_REPORTE[r.tipo]}</h2>
        </div>
        <Insignia estado={ESTADO_REPORTE[r.estado]} />
      </header>

      {r.descripcion && <p className="reporte-detalle__descripcion">{r.descripcion}</p>}

      <dl className="reporte-detalle__datos">
        <div><dt><MapPin size={16} strokeWidth={1.75} aria-hidden="true" /> Dónde</dt><dd>{[r.direccion, r.zona].filter(Boolean).join(' · ') || 'Sin dirección'}</dd></div>
        <div><dt><Clock size={16} strokeWidth={1.75} aria-hidden="true" /> Reportado</dt><dd>{formatearFechaHora(r.fechaReporte)}</dd></div>
        <div><dt><Hand size={16} strokeWidth={1.75} aria-hidden="true" /> Refugio</dt><dd>{r.refugioAsignado ?? 'Nadie lo ha tomado'}</dd></div>
      </dl>

      {r.tipo === TipoReporte.Maltrato && (
        <p className="reporte-detalle__nota">Si confirmas el maltrato, denúncialo también ante la Policía (línea 123) o la Fiscalía (Ley 1774 de 2016).</p>
      )}

      <div className="reporte-detalle__acciones">
        {esRefugio && sinTomar && (
          <Boton variante="primario" disabled={ocupado} onClick={alTomar}><Hand size={16} strokeWidth={2} aria-hidden="true" /> Tomar reporte</Boton>
        )}
        {esRefugio && esMio && abierto && (
          <div className="reporte-detalle__estado">
            <label className="visualmente-oculto" htmlFor={`estado-${r.id}`}>Nuevo estado</label>
            <select id={`estado-${r.id}`} className="campo__control" value={estado} onChange={(e) => setEstado(Number(e.target.value) as EstadoReporte)} disabled={ocupado}>
              {CIERRES.map((e) => <option key={e} value={e}>{ESTADO_REPORTE[e].etiqueta}</option>)}
            </select>
            <Boton variante="primario" disabled={ocupado} onClick={() => alCambiar(estado)}>Actualizar</Boton>
          </div>
        )}
        {comoLlegar && (
          <a className="boton boton--secundario" href={comoLlegar} target="_blank" rel="noreferrer">
            <Navigation size={16} strokeWidth={1.75} aria-hidden="true" /> Cómo llegar
          </a>
        )}
        <Boton variante="texto" onClick={alCerrar}>Cerrar</Boton>
      </div>
    </article>
  );
}
