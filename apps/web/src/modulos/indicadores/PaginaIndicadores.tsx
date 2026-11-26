import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Clock, HeartHandshake, House, Megaphone, PawPrint } from 'lucide-react';
import {
  COLOR_TIPO_REPORTE, ESTADO_MASCOTA, ESTADO_REPORTE, ESTADO_SOLICITUD, ETIQUETA_TIPO_REPORTE, EstadoMascota, EstadoReporte,
  EstadoSolicitud, NivelRol, TIPOS_REPORTE_ORDEN, type Paginado, type SolicitudResumen,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import './indicadores.css';

/** Recorre todas las páginas de un listado (con tope, por si el servidor no corta). */
async function todas<T>(pedir: (pagina: number) => Promise<Paginado<T>>, tope = 20): Promise<T[]> {
  const items: T[] = [];
  for (let pagina = 1; pagina <= tope; pagina++) {
    const r = await pedir(pagina);
    items.push(...r.items);
    if (pagina >= r.totalPaginas || r.items.length === 0) break;
  }
  return items;
}

type Periodo = 7 | 30 | 90;
const PERIODOS: readonly { valor: Periodo; texto: string }[] = [
  { valor: 7, texto: 'Semana' },
  { valor: 30, texto: 'Mes' },
  { valor: 90, texto: 'Trimestre' },
];
/** Los períodos son móviles: cuentan hacia atrás desde hoy. */
const FRASE_PERIODO: Record<Periodo, string> = { 7: 'los últimos 7 días', 30: 'los últimos 30 días', 90: 'los últimos 90 días' };
const DIA = 86_400_000;
const ESPERANDO = [EstadoSolicitud.Enviada, EstadoSolicitud.EnRevision];
const CERRADAS = [EstadoSolicitud.Finalizada, EstadoSolicitud.Rechazada, EstadoSolicitud.Cancelada, EstadoSolicitud.Cerrada];
const SEMANAS = 12;

/** Cuántas caen en [hace dias*2, hace dias) y en [hace dias, ahora). */
function porPeriodo<T>(items: readonly T[], fecha: (x: T) => string, dias: Periodo) {
  const ahora = Date.now();
  const edad = (x: T) => ahora - new Date(fecha(x)).getTime();
  return {
    actual: items.filter((x) => edad(x) <= dias * DIA),
    anterior: items.filter((x) => edad(x) > dias * DIA && edad(x) <= dias * 2 * DIA),
  };
}

/** Variación porcentual; null si no hay base para comparar. */
const variacion = (actual: number, anterior: number) => (anterior === 0 ? null : Math.round(((actual - anterior) / anterior) * 100));

/** Solicitudes recibidas en cada una de las últimas 12 semanas (la última es la actual). */
function porSemana(solicitudes: readonly SolicitudResumen[]) {
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const lunes = new Date(hoy); lunes.setDate(hoy.getDate() - ((hoy.getDay() + 6) % 7));
  return Array.from({ length: SEMANAS }, (_, i) => {
    const inicio = new Date(lunes); inicio.setDate(lunes.getDate() - (SEMANAS - 1 - i) * 7);
    const fin = new Date(inicio); fin.setDate(inicio.getDate() + 7);
    const valor = solicitudes.filter((s) => { const f = new Date(s.fechaEnvio); return f >= inicio && f < fin; }).length;
    return { clave: inicio.toISOString(), etiqueta: inicio.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', ''), valor };
  });
}

/**
 * HU-ADM-04: indicadores de la gestión, armados con los endpoints que ya
 * existen. El refugio ve los suyos; el administrador, lo que es público
 * (los totales globales de adopciones y usuarios necesitan un endpoint).
 */
export function PaginaIndicadores() {
  const { usuario } = useSesion();
  const [periodo, setPeriodo] = useState<Periodo>(30);
  const esAdmin = usuario?.rol.nivel === NivelRol.Administrador;
  return (
    <>
      <Encabezado
        titulo="Indicadores"
        resumen={esAdmin ? 'Lo que se puede medir hoy en toda la plataforma.' : 'Cómo va la gestión de tu refugio: mascotas, solicitudes y reportes que atiendes.'}
        acciones={esAdmin ? undefined : <SelectorPeriodo valor={periodo} alCambiar={setPeriodo} />}
      />
      {esAdmin ? <IndicadoresAdmin /> : <IndicadoresRefugio periodo={periodo} />}
    </>
  );
}

function SelectorPeriodo({ valor, alCambiar }: { valor: Periodo; alCambiar: (p: Periodo) => void }) {
  return (
    <div className="ind-periodo" role="radiogroup" aria-label="Período">
      {PERIODOS.map((p) => (
        <button key={p.valor} type="button" role="radio" aria-checked={valor === p.valor} onClick={() => alCambiar(p.valor)}>{p.texto}</button>
      ))}
    </div>
  );
}

function IndicadoresRefugio({ periodo }: { periodo: Periodo }) {
  const datos = useQuery({
    queryKey: ['indicadores', 'refugio'],
    queryFn: async () => {
      const [mascotas, solicitudes, reportes] = await Promise.all([
        todas((pagina) => api.mascotas.inventario({ pagina, tamanoPagina: 100 })),
        todas((pagina) => api.adopcion.listar({ pagina, tamanoPagina: 100 })),
        todas((pagina) => api.reportes.bandeja({ pagina, tamanoPagina: 100 })).catch(() => null),
      ]);
      return { mascotas, solicitudes, reportes };
    },
    retry: false,
  });

  const c = useMemo(() => {
    if (!datos.data) return null;
    const { mascotas, solicitudes, reportes } = datos.data;
    const recibidas = porPeriodo(solicitudes, (s) => s.fechaEnvio, periodo);
    const adopciones = {
      actual: recibidas.actual.filter((s) => s.estado === EstadoSolicitud.Finalizada).length,
      anterior: recibidas.anterior.filter((s) => s.estado === EstadoSolicitud.Finalizada).length,
    };
    const cerradas = recibidas.actual.filter((s) => CERRADAS.includes(s.estado)).length;
    const esperando = solicitudes.filter((s) => ESPERANDO.includes(s.estado));
    const mios = reportes?.filter((r) => r.asignadoAMi) ?? null;
    return {
      mascotas: {
        disponibles: mascotas.filter((m) => m.estado === EstadoMascota.Disponible).length,
        total: mascotas.length,
        adoptadas: mascotas.filter((m) => m.estado === EstadoMascota.Adoptada).length,
        porEstado: [EstadoMascota.Disponible, EstadoMascota.EnProceso, EstadoMascota.Adoptada, EstadoMascota.NoDisponible, EstadoMascota.Borrador]
          .map((e) => ({ clave: String(e), etiqueta: ESTADO_MASCOTA[e].etiqueta, valor: mascotas.filter((m) => m.estado === e).length })),
      },
      recibidas: recibidas.actual.length,
      variacionRecibidas: variacion(recibidas.actual.length, recibidas.anterior.length),
      adopciones: adopciones.actual,
      variacionAdopciones: variacion(adopciones.actual, adopciones.anterior),
      tasaAdopcion: cerradas ? Math.round((adopciones.actual / cerradas) * 100) : null,
      esperando: esperando.length,
      diasEsperando: esperando.length ? Math.round(esperando.reduce((t, s) => t + s.diasSinRespuesta, 0) / esperando.length) : null,
      semanas: porSemana(solicitudes),
      solicitudesPorEstado: Object.values(EstadoSolicitud).filter((e): e is EstadoSolicitud => typeof e === 'number')
        .map((e) => ({ clave: String(e), etiqueta: ESTADO_SOLICITUD[e].etiqueta, valor: recibidas.actual.filter((s) => s.estado === e).length }))
        .filter((x) => x.valor > 0),
      reportesLibres: reportes?.filter((r) => !r.asignadoAMi && r.estado === EstadoReporte.Recibido).length ?? null,
      reportesMios: mios && [EstadoReporte.EnAtencion, EstadoReporte.Rescatado, EstadoReporte.NoEncontrado, EstadoReporte.Cerrado]
        .map((e) => ({ clave: String(e), etiqueta: ESTADO_REPORTE[e].etiqueta, valor: mios.filter((r) => r.estado === e).length })),
    };
  }, [datos.data, periodo]);

  if (datos.isPending) return <EstadoCargando mensaje="Calculando indicadores…" />;
  if (datos.isError || !c) return <EstadoError titulo="No pudimos calcular los indicadores" error={datos.error} alReintentar={() => void datos.refetch()} reintentando={datos.isFetching} />;
  const frase = FRASE_PERIODO[periodo];

  return (
    <div className="ind-bento">
      <Tarjeta titulo="Mascotas" className="ind-bento__mascotas">
        <Cifra valor={c.mascotas.disponibles} unidad="disponibles" />
        {c.mascotas.total > 0 && (
          <div className="ind-proporcion">
            <span className="ind-proporcion__pista"><span style={{ width: `${Math.round((c.mascotas.disponibles / c.mascotas.total) * 100)}%` }} /></span>
            <p className="ind-pie"><strong>{Math.round((c.mascotas.disponibles / c.mascotas.total) * 100)}%</strong> de tu catálogo busca hogar</p>
          </div>
        )}
        <div className="ind-dividido">
          <div><Cifra valor={c.mascotas.total} pequena /><p className="ind-pie">En tu catálogo</p></div>
          <div><Cifra valor={c.mascotas.adoptadas} pequena /><p className="ind-pie">Ya adoptadas</p></div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Solicitudes" className="ind-bento__solicitudes">
        <div className="ind-cabecera-doble">
          <div>
            <p className="ind-pie">Recibidas en {frase}</p>
            <div className="ind-linea"><Cifra valor={c.recibidas} /><Tendencia valor={c.variacionRecibidas} /></div>
          </div>
          <div>
            <p className="ind-pie">Por responder</p>
            <div className="ind-linea"><Cifra valor={c.esperando} />{c.diasEsperando !== null && <span className="ind-insignia ind-insignia--neutra"><Clock size={12} strokeWidth={2} aria-hidden="true" /> {c.diasEsperando} d en promedio</span>}</div>
          </div>
        </div>
        <GraficoSemanas datos={c.semanas} />
        {c.solicitudesPorEstado.length > 0 && (
          <ul className="ind-pildoras" aria-label="Solicitudes del período por estado">
            {c.solicitudesPorEstado.map((e, i) => <li key={e.clave} className={i === 0 ? 'ind-pildora--activa' : undefined}>{e.etiqueta} · {e.valor}</li>)}
          </ul>
        )}
      </Tarjeta>

      <Tarjeta titulo="Adopciones" className="ind-bento__adopciones" destacada icono={<HeartHandshake size={18} strokeWidth={1.75} aria-hidden="true" />}>
        <div className="ind-linea"><Cifra valor={c.adopciones} grande /><Tendencia valor={c.variacionAdopciones} /></div>
        <p className="ind-pie">Finalizadas, de las solicitudes de {frase}</p>
        {c.tasaAdopcion !== null && (
          <div className="ind-tasa">
            <span className="ind-tasa__pista"><span style={{ width: `${c.tasaAdopcion}%` }} /></span>
            <p><strong>{c.tasaAdopcion}%</strong> de las solicitudes cerradas terminó en adopción</p>
          </div>
        )}
      </Tarjeta>

      <Tarjeta titulo="Mascotas por estado" className="ind-bento__estados">
        <Lista datos={c.mascotas.porEstado} />
      </Tarjeta>

      <Tarjeta titulo="Reportes" className="ind-bento__reportes" icono={<Megaphone size={16} strokeWidth={1.75} aria-hidden="true" />}>
        {c.reportesLibres !== null && <><Cifra valor={c.reportesLibres} unidad="sin tomar en Cali" /><p className="ind-pie">Esperan a que un refugio los atienda</p></>}
        {c.reportesMios ? <Lista titulo="Los que tomaste" datos={c.reportesMios} /> : <p className="ind-pie">No pudimos cargar tus reportes.</p>}
      </Tarjeta>

      <div className="ind-bento__mini">
        <Mini etiqueta="Tiempo de espera" valor={c.diasEsperando === null ? '—' : String(c.diasEsperando)} unidad={c.diasEsperando === 1 ? 'día' : 'días'} nota="Promedio de las solicitudes abiertas" />
        <Mini etiqueta="Tasa de adopción" valor={c.tasaAdopcion === null ? '—' : String(c.tasaAdopcion)} unidad="%" nota={`De lo que se cerró en ${frase}`} />
      </div>

      <p className="ind-nota"><Clock size={14} strokeWidth={1.75} aria-hidden="true" /> Las adopciones se cuentan por la fecha de la solicitud y el tiempo de espera es el de las solicitudes abiertas: el servidor todavía no envía la fecha de cierre ni el tiempo de respuesta.</p>
    </div>
  );
}

function IndicadoresAdmin() {
  const datos = useQuery({
    queryKey: ['indicadores', 'admin'],
    queryFn: async () => {
      // El dashboard trae los totales; el mapa, el desglose por tipo para la gráfica.
      const [dashboard, reportes] = await Promise.all([api.administracion.dashboard(), api.reportes.mapa()]);
      return { dashboard, reportes };
    },
    retry: false,
  });
  if (datos.isPending) return <EstadoCargando mensaje="Calculando indicadores…" />;
  if (datos.isError || !datos.data) return <EstadoError titulo="No pudimos calcular los indicadores" error={datos.error} alReintentar={() => void datos.refetch()} reintentando={datos.isFetching} />;
  const { dashboard: d, reportes } = datos.data;
  const porTipo = TIPOS_REPORTE_ORDEN.map((t) => ({ clave: String(t), etiqueta: ETIQUETA_TIPO_REPORTE[t], valor: reportes.filter((r) => r.tipo === t).length, color: COLOR_TIPO_REPORTE[t] }));
  const porEstado = d.reportesPorEstado.map((e) => ({ clave: e.estado, etiqueta: etiquetaEstadoReporte(e.estado), valor: e.total }));
  const dias = Math.round(d.tiempoPromedioAdopcionDias * 10) / 10;

  return (
    <div className="ind-bento">
      <Tarjeta titulo="Plataforma" className="ind-bento__mascotas" icono={<House size={16} strokeWidth={1.75} aria-hidden="true" />}>
        <Cifra valor={d.usuariosRegistrados} unidad="usuarios" />
        <div className="ind-dividido">
          <div><Cifra valor={d.refugiosVerificados} pequena /><p className="ind-pie">Refugios verificados</p></div>
          <div><Cifra valor={d.mascotasDisponibles} pequena /><p className="ind-pie">Mascotas disponibles</p></div>
        </div>
      </Tarjeta>

      <Tarjeta titulo="Reportes activos por tipo" className="ind-bento__solicitudes">
        <GraficoColumnas datos={porTipo} etiqueta="Reportes activos por tipo" />
      </Tarjeta>

      <Tarjeta titulo="Adopciones" className="ind-bento__adopciones" destacada icono={<HeartHandshake size={18} strokeWidth={1.75} aria-hidden="true" />}>
        <Cifra valor={d.adopcionesExitosas} grande />
        <p className="ind-pie">Adopciones exitosas en total</p>
      </Tarjeta>

      <Tarjeta titulo="Reportes por estado" className="ind-bento__estados" icono={<Megaphone size={16} strokeWidth={1.75} aria-hidden="true" />}>
        <Cifra valor={d.reportesCiudadanos} unidad="reportes ciudadanos" />
        <Lista datos={porEstado} />
      </Tarjeta>

      <div className="ind-bento__mini ind-bento__mini--ancho">
        <Mini etiqueta="Tiempo de adopción" valor={dias ? dias.toLocaleString('es-CO') : '—'} unidad={dias === 1 ? 'día' : 'días'} nota="Promedio desde la solicitud hasta la adopción" />
        <Mini etiqueta="Mascotas por refugio" valor={d.refugiosVerificados ? (Math.round((d.mascotasDisponibles / d.refugiosVerificados) * 10) / 10).toLocaleString('es-CO') : '—'} unidad="en promedio" nota="Disponibles por refugio verificado" />
      </div>

      <p className="ind-nota"><Clock size={14} strokeWidth={1.75} aria-hidden="true" /> Los reportes por zona no están en esta versión: el servidor no guarda la zona de cada reporte.</p>
    </div>
  );
}

const ETIQUETAS_ESTADO_REPORTE: Record<string, EstadoReporte> = {
  recibido: EstadoReporte.Recibido, enatencion: EstadoReporte.EnAtencion, rescatado: EstadoReporte.Rescatado, noencontrado: EstadoReporte.NoEncontrado, cerrado: EstadoReporte.Cerrado,
};
function etiquetaEstadoReporte(nombre: string): string {
  const e = ETIQUETAS_ESTADO_REPORTE[nombre.replace(/\s/g, '').toLowerCase()];
  return e === undefined ? nombre : ESTADO_REPORTE[e].etiqueta;
}

/* ----------------------------- Piezas ----------------------------- */

function Tarjeta({ titulo, className, destacada = false, icono, children }: { titulo: string; className?: string; destacada?: boolean; icono?: ReactNode; children: ReactNode }) {
  return (
    <section className={`ind-tarjeta${destacada ? ' ind-tarjeta--destacada' : ''} ${className ?? ''}`} aria-label={titulo}>
      <header className="ind-tarjeta__cabecera">
        <span className="ind-marca" aria-hidden="true" />
        <h2>{titulo}</h2>
        {icono && <span className="ind-tarjeta__icono">{icono}</span>}
      </header>
      {children}
    </section>
  );
}

function Cifra({ valor, unidad, pequena = false, grande = false }: { valor: number; unidad?: string; pequena?: boolean; grande?: boolean }) {
  return (
    <p className={`ind-cifra${pequena ? ' ind-cifra--pequena' : ''}${grande ? ' ind-cifra--grande' : ''}`}>
      {valor.toLocaleString('es-CO')}
      {unidad && <span className="ind-cifra__unidad">{unidad}</span>}
    </p>
  );
}

/** Insignia "↗ 24%" frente al período anterior. Sin base de comparación no se muestra. */
function Tendencia({ valor }: { valor: number | null }) {
  if (valor === null) return null;
  const sube = valor >= 0;
  const Icono = sube ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`ind-insignia${sube ? '' : ' ind-insignia--baja'}`} title="Frente al período anterior">
      <Icono size={12} strokeWidth={2.25} aria-hidden="true" /> {Math.abs(valor)}%
      <span className="visualmente-oculto">{sube ? 'más' : 'menos'} que el período anterior</span>
    </span>
  );
}

/**
 * Columnas de las últimas 12 semanas: una sola serie (magnitud), así que un
 * solo tono, con la semana actual resaltada y su valor escrito encima. Cada
 * columna dice su semana y su valor al pasar el puntero.
 */
function GraficoSemanas({ datos }: { datos: readonly { clave: string; etiqueta: string; valor: number }[] }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const ultima = datos.length - 1;
  return (
    <figure className="ind-columnas" aria-label={`Solicitudes recibidas por semana: ${datos.map((d) => `${d.etiqueta}, ${d.valor}`).join('; ')}`}>
      <div className="ind-columnas__area" aria-hidden="true">
        {datos.map((d, i) => (
          <div key={d.clave} className={`ind-columna${i === ultima ? ' ind-columna--actual' : ''}`} title={`Semana del ${d.etiqueta}: ${d.valor} ${d.valor === 1 ? 'solicitud' : 'solicitudes'}`}>
            {i === ultima && <span className="ind-columna__valor">{d.valor}</span>}
            <span className="ind-columna__barra" style={{ height: `${Math.max(6, (d.valor / maximo) * 100)}%` } as CSSProperties} data-vacia={d.valor === 0 || undefined} />
          </div>
        ))}
      </div>
      <figcaption className="ind-columnas__eje" aria-hidden="true">
        <span>{datos[0]?.etiqueta}</span><span>{datos[Math.floor(ultima / 2)]?.etiqueta}</span><span>Esta semana</span>
      </figcaption>
    </figure>
  );
}

/** Columnas por categoría (admin): el color es el del tipo de reporte, con su nombre debajo. */
function GraficoColumnas({ datos, etiqueta }: { datos: readonly { clave: string; etiqueta: string; valor: number; color: string }[]; etiqueta: string }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <figure className="ind-columnas ind-columnas--categorias" aria-label={`${etiqueta}: ${datos.map((d) => `${d.etiqueta}, ${d.valor}`).join('; ')}`}>
      <div className="ind-columnas__area" aria-hidden="true">
        {datos.map((d) => (
          <div key={d.clave} className="ind-columna" title={`${d.etiqueta}: ${d.valor}`}>
            <span className="ind-columna__valor">{d.valor}</span>
            <span className="ind-columna__barra" style={{ height: `${Math.max(6, (d.valor / maximo) * 100)}%`, background: d.valor > 0 ? d.color : undefined }} data-vacia={d.valor === 0 || undefined} />
          </div>
        ))}
      </div>
      <figcaption className="ind-columnas__eje ind-columnas__eje--categorias" aria-hidden="true">
        {datos.map((d) => <span key={d.clave}>{d.etiqueta}</span>)}
      </figcaption>
    </figure>
  );
}

/** Filas tipo lista de chequeo: etiqueta, barra fina y valor. */
function Lista({ titulo, datos }: { titulo?: string; datos: readonly { clave: string; etiqueta: string; valor: number }[] }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  return (
    <div className="ind-lista">
      {titulo && <p className="ind-lista__titulo">{titulo}</p>}
      <dl>
        {datos.map((d) => (
          <div key={d.clave} className="ind-fila" title={`${d.etiqueta}: ${d.valor}`}>
            <dt>{d.etiqueta}</dt>
            <dd>
              <span className="ind-fila__pista">{d.valor > 0 && <span style={{ width: `${(d.valor / maximo) * 100}%` }} />}</span>
              <span className="ind-fila__valor">{d.valor}</span>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Mini({ etiqueta, valor, unidad, nota }: { etiqueta: string; valor: string; unidad: string; nota: string }) {
  return (
    <div className="ind-mini">
      <p className="ind-pie">{etiqueta}</p>
      <p className="ind-cifra">{valor}<span className="ind-cifra__unidad">{unidad}</span></p>
      <p className="ind-mini__nota">{nota}</p>
    </div>
  );
}
