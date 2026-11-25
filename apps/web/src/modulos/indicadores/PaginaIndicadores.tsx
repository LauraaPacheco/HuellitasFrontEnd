import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Clock, HeartHandshake, Inbox, Megaphone, PawPrint, House } from 'lucide-react';
import {
  ESTADO_MASCOTA, ESTADO_REPORTE, ESTADO_SOLICITUD, ETIQUETA_TIPO_REPORTE, EstadoMascota, EstadoReporte, EstadoSolicitud,
  NivelRol, TIPOS_REPORTE_ORDEN, type Paginado,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import '@/modulos/apoyos/apoyos.css';
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

type Periodo = 30 | 90 | 0;
const PERIODOS: readonly { valor: Periodo; texto: string }[] = [
  { valor: 30, texto: 'Últimos 30 días' },
  { valor: 90, texto: 'Últimos 90 días' },
  { valor: 0, texto: 'Todo' },
];
const ESPERANDO = [EstadoSolicitud.Enviada, EstadoSolicitud.EnRevision];
const enPeriodo = (iso: string, dias: Periodo) => dias === 0 || Date.now() - new Date(iso).getTime() <= dias * 86_400_000;

/**
 * HU-ADM-04: indicadores de la gestión, armados con los endpoints que ya
 * existen. El refugio ve los suyos; el administrador, lo que es público
 * (los totales globales de adopciones y usuarios necesitan un endpoint).
 */
export function PaginaIndicadores() {
  const { usuario } = useSesion();
  return usuario?.rol.nivel === NivelRol.Administrador ? <IndicadoresAdmin /> : <IndicadoresRefugio />;
}

function IndicadoresRefugio() {
  const [periodo, setPeriodo] = useState<Periodo>(30);
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

  const calculo = useMemo(() => {
    if (!datos.data) return null;
    const { mascotas, solicitudes, reportes } = datos.data;
    const delPeriodo = solicitudes.filter((s) => enPeriodo(s.fechaEnvio, periodo));
    const esperando = solicitudes.filter((s) => ESPERANDO.includes(s.estado));
    const mios = reportes?.filter((r) => r.asignadoAMi) ?? null;
    return {
      disponibles: mascotas.filter((m) => m.estado === EstadoMascota.Disponible).length,
      adopciones: delPeriodo.filter((s) => s.estado === EstadoSolicitud.Finalizada).length,
      recibidas: delPeriodo.length,
      esperando: esperando.length,
      promedioEspera: esperando.length ? Math.round(esperando.reduce((t, s) => t + s.diasSinRespuesta, 0) / esperando.length) : null,
      mascotasPorEstado: [EstadoMascota.Disponible, EstadoMascota.EnProceso, EstadoMascota.Adoptada, EstadoMascota.NoDisponible, EstadoMascota.Borrador]
        .map((e) => ({ clave: String(e), etiqueta: ESTADO_MASCOTA[e].etiqueta, valor: mascotas.filter((m) => m.estado === e).length })),
      solicitudesPorEstado: Object.values(EstadoSolicitud).filter((e): e is EstadoSolicitud => typeof e === 'number')
        .map((e) => ({ clave: String(e), etiqueta: ESTADO_SOLICITUD[e].etiqueta, valor: delPeriodo.filter((s) => s.estado === e).length })),
      reportesPorEstado: mios && [EstadoReporte.EnAtencion, EstadoReporte.Rescatado, EstadoReporte.NoEncontrado, EstadoReporte.Cerrado]
        .map((e) => ({ clave: String(e), etiqueta: ESTADO_REPORTE[e].etiqueta, valor: mios.filter((r) => r.estado === e).length })),
      reportesLibres: reportes?.filter((r) => !r.asignadoAMi && r.estado === EstadoReporte.Recibido).length ?? null,
    };
  }, [datos.data, periodo]);

  return (
    <>
      <Encabezado titulo="Indicadores" resumen="Cómo va la gestión de tu refugio: mascotas, solicitudes y reportes que atiendes." />
      {datos.isPending ? (
        <EstadoCargando mensaje="Calculando indicadores…" />
      ) : datos.isError || !calculo ? (
        <EstadoError titulo="No pudimos calcular los indicadores" error={datos.error} alReintentar={() => void datos.refetch()} reintentando={datos.isFetching} />
      ) : (
        <>
          <div className="apoyos-pestanas" role="group" aria-label="Período de las solicitudes">
            {PERIODOS.map((p) => (
              <button key={p.valor} type="button" className="apoyos-pestana" aria-pressed={periodo === p.valor} onClick={() => setPeriodo(p.valor)}>{p.texto}</button>
            ))}
          </div>
          <div className="indicadores-cifras">
            <Cifra icono={PawPrint} valor={calculo.disponibles} etiqueta="Mascotas disponibles" />
            <Cifra icono={HeartHandshake} valor={calculo.adopciones} etiqueta="Adopciones finalizadas" nota="de solicitudes enviadas en el período" />
            <Cifra icono={Inbox} valor={calculo.esperando} etiqueta="Solicitudes por responder" nota={calculo.promedioEspera === null ? undefined : `llevan ${calculo.promedioEspera} ${calculo.promedioEspera === 1 ? 'día' : 'días'} en promedio`} />
            {calculo.reportesLibres !== null && <Cifra icono={Megaphone} valor={calculo.reportesLibres} etiqueta="Reportes sin tomar en Cali" />}
          </div>
          <div className="indicadores-graficas">
            <Barras titulo="Mascotas por estado" datos={calculo.mascotasPorEstado} />
            <Barras titulo="Solicitudes por estado" subtitulo={`${calculo.recibidas} recibidas en el período`} datos={calculo.solicitudesPorEstado} />
            {calculo.reportesPorEstado && <Barras titulo="Reportes que tomaste" datos={calculo.reportesPorEstado} />}
          </div>
          <p className="indicadores-nota"><Clock size={14} strokeWidth={1.75} aria-hidden="true" /> El tiempo promedio de respuesta exacto necesita un dato del servidor; aquí se muestra cuánto llevan esperando las solicitudes abiertas.</p>
        </>
      )}
    </>
  );
}

function IndicadoresAdmin() {
  const datos = useQuery({
    queryKey: ['indicadores', 'admin'],
    queryFn: async () => {
      const [reportes, refugios, mascotas] = await Promise.all([
        api.reportes.mapa(),
        api.refugios.listar({ pagina: 1, tamanoPagina: 1 }),
        api.mascotas.buscar({ pagina: 1, tamanoPagina: 1 }),
      ]);
      return { reportes, refugios: refugios.total, mascotas: mascotas.total };
    },
    retry: false,
  });
  const d = datos.data;
  return (
    <>
      <Encabezado titulo="Indicadores" resumen="Lo que se puede medir hoy en toda la plataforma." />
      {datos.isPending ? (
        <EstadoCargando mensaje="Calculando indicadores…" />
      ) : datos.isError || !d ? (
        <EstadoError titulo="No pudimos calcular los indicadores" error={datos.error} alReintentar={() => void datos.refetch()} reintentando={datos.isFetching} />
      ) : (
        <>
          <div className="indicadores-cifras">
            <Cifra icono={House} valor={d.refugios} etiqueta="Refugios verificados" />
            <Cifra icono={PawPrint} valor={d.mascotas} etiqueta="Mascotas en el catálogo" />
            <Cifra icono={Megaphone} valor={d.reportes.length} etiqueta="Reportes activos" />
          </div>
          <div className="indicadores-graficas">
            <Barras titulo="Reportes activos por tipo" datos={TIPOS_REPORTE_ORDEN.map((t) => ({ clave: String(t), etiqueta: ETIQUETA_TIPO_REPORTE[t], valor: d.reportes.filter((r) => r.tipo === t).length }))} />
            <Barras titulo="Reportes activos por estado" datos={[EstadoReporte.Recibido, EstadoReporte.EnAtencion, EstadoReporte.Rescatado].map((e) => ({ clave: String(e), etiqueta: ESTADO_REPORTE[e].etiqueta, valor: d.reportes.filter((r) => r.estado === e).length }))} />
          </div>
          <p className="indicadores-nota"><Clock size={14} strokeWidth={1.75} aria-hidden="true" /> Las adopciones por período, los usuarios y los reportes por zona necesitan un endpoint del servidor (HU-ADM-04).</p>
        </>
      )}
    </>
  );
}

function Cifra({ icono: Icono, valor, etiqueta, nota }: { icono: typeof PawPrint; valor: number; etiqueta: string; nota?: string }) {
  return (
    <div className="indicadores-cifra">
      <span className="indicadores-cifra__icono" aria-hidden="true"><Icono size={20} strokeWidth={1.75} /></span>
      <p className="indicadores-cifra__valor">{valor.toLocaleString('es-CO')}</p>
      <p className="indicadores-cifra__etiqueta">{etiqueta}</p>
      {nota && <p className="indicadores-cifra__nota">{nota}</p>}
    </div>
  );
}

/**
 * Barras horizontales de una sola serie: un solo tono (es magnitud, no
 * identidad), el valor escrito al lado y la etiqueta en texto, así que se
 * lee sin depender del color y funciona como tabla.
 */
function Barras({ titulo, subtitulo, datos }: { titulo: string; subtitulo?: string; datos: readonly { clave: string; etiqueta: string; valor: number }[] }) {
  const maximo = Math.max(1, ...datos.map((d) => d.valor));
  const total = datos.reduce((t, d) => t + d.valor, 0);
  return (
    <section className="indicadores-barras" aria-label={titulo}>
      <h2>{titulo}</h2>
      {subtitulo && <p className="indicadores-barras__sub">{subtitulo}</p>}
      {total === 0 ? (
        <p className="indicadores-barras__sub">Todavía no hay datos.</p>
      ) : (
        <dl>
          {datos.map((d) => (
            <div key={d.clave} className="indicadores-fila" title={`${d.etiqueta}: ${d.valor}`}>
              <dt>{d.etiqueta}</dt>
              <dd>
                <span className="indicadores-fila__pista">{d.valor > 0 && <span className="indicadores-fila__barra" style={{ width: `${(d.valor / maximo) * 100}%` }} />}</span>
                <span className="indicadores-fila__valor">{d.valor}</span>
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
