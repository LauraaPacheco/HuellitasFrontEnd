import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlarmClock, Cat, Check, CircleAlert, CircleCheck, Dog, Hourglass, House, PawPrint, Send } from 'lucide-react';
import {
  ErrorHttp, ESTADO_SEGUIMIENTO, ETIQUETA_RESULTADO_SEGUIMIENTO, EstadoSeguimiento, EstadoSolicitud, ResultadoSeguimiento,
  formatearFecha, type SeguimientoAdopcion, type SolicitudResumen,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import '@/modulos/cuenta/cuenta.css';
import '@/modulos/apoyos/apoyos.css';
import './trazabilidad.css';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);

/**
 * HU-TRA-05 (vista del refugio): cada adopción finalizada tiene un plan de
 * 3 seguimientos (1, 3 y 6 meses). El adoptante los envía desde la app y
 * el refugio los evalúa como conformes o que requieren atención.
 *
 * Las adopciones salen de la bandeja (solicitudes finalizadas). Para
 * consultar el plan hace falta el ID de la adopción, que el backend aún no
 * incluye en la solicitud: mientras no llegue se explica qué falta.
 */
export function PaginaSeguimientos() {
  const consulta = useQuery({
    queryKey: ['solicitudes', 'finalizadas'],
    queryFn: () => api.adopcion.listar({ tamanoPagina: 100 }),
    retry: false,
  });
  const finalizadas = consulta.data?.items.filter((s) => s.estado === EstadoSolicitud.Finalizada) ?? [];
  const conAdopcion = finalizadas.filter((s) => s.adopcionId);

  return (
    <>
      <Encabezado titulo="Seguimientos" resumen="Cómo les va a tus mascotas adoptadas: reportes a 1, 3 y 6 meses de la adopción." />
      {consulta.isPending ? (
        <EstadoCargando mensaje="Cargando adopciones…" />
      ) : consulta.isError ? (
        <EstadoError titulo="No pudimos cargar las adopciones" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      ) : finalizadas.length === 0 ? (
        <EstadoVacio ilustracion="trio" titulo="Aún no tienes adopciones finalizadas" descripcion="Cuando finalices una adopción, aquí verás su plan de seguimiento." />
      ) : conAdopcion.length === 0 ? (
        <EstadoVacio
          titulo="Falta un dato del servidor"
          descripcion={`Tienes ${finalizadas.length} ${finalizadas.length === 1 ? 'adopción finalizada' : 'adopciones finalizadas'}, pero el servidor todavía no envía el número de adopción, que se necesita para consultar su seguimiento.`}
        />
      ) : (
        <ul className="seguimientos">
          {conAdopcion.map((s) => <PlanAdopcion key={s.id} solicitud={s} />)}
        </ul>
      )}
    </>
  );
}

const MESES_PLAN = ['1 mes', '3 meses', '6 meses'];
const DIA = 86_400_000;
const inicioDia = (iso: string) => { const d = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso); return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); };

/** Foto de la mascota, o un perro o un gato según la especie; huella si no se sabe. */
function AvatarMascota({ mascotaId, nombre }: { mascotaId?: number; nombre: string }) {
  const ficha = useQuery({ queryKey: ['mascota', mascotaId], queryFn: () => api.mascotas.obtenerFicha(mascotaId!), enabled: !!mascotaId, retry: false, staleTime: 5 * 60_000 });
  const foto = ficha.data?.fotos[0];
  const especie = ficha.data?.especie.toLowerCase() ?? '';
  const Icono = especie.includes('gat') ? Cat : especie.includes('perr') ? Dog : PawPrint;
  return foto
    ? <img className="seguimientos__avatar" src={foto} alt={`Foto de ${nombre}`} referrerPolicy="no-referrer" />
    : <span className="seguimientos__avatar" aria-hidden="true"><Icono size={22} strokeWidth={1.75} /></span>;
}

/**
 * Riel de progreso: tres paradas (1, 3 y 6 meses) unidas por una barra que
 * se llena hasta el último seguimiento enviado y avanza hacia el siguiente
 * según el tiempo que falta para su fecha.
 */
function RielSeguimiento({ seguimientos }: { seguimientos: readonly SeguimientoAdopcion[] }) {
  const hoy = inicioDia(new Date().toISOString());
  const enviados = seguimientos.filter((g) => g.estado === EstadoSeguimiento.Enviado).length;
  const siguiente = seguimientos[enviados];
  let avance = 0;
  if (enviados >= seguimientos.length) avance = 1;
  else if (siguiente) {
    const tramos = Math.max(seguimientos.length - 1, 1);
    const desde = enviados === 0 ? inicioDia(siguiente.fechaProgramada) - 30 * DIA : inicioDia(seguimientos[enviados - 1]!.fechaProgramada);
    const hasta = inicioDia(siguiente.fechaProgramada);
    const parcial = Math.min(Math.max((hoy - desde) / Math.max(hasta - desde, DIA), 0), 1);
    avance = Math.min(1, (Math.max(enviados - 1, 0) + (enviados === 0 ? 0 : parcial)) / tramos);
  }
  return (
    <div className="riel" role="img" aria-label={`${enviados} de ${seguimientos.length} seguimientos enviados`}>
      <div className="riel__pista">
        <span className="riel__relleno" style={{ width: `calc((100% - 68px) * ${avance})` }} />
        {seguimientos.map((g) => {
          const enviado = g.estado === EstadoSeguimiento.Enviado;
          const vencido = g.estado === EstadoSeguimiento.Vencido;
          const Icono = enviado ? (g.resultado === null ? Send : g.resultado === ResultadoSeguimiento.RequiereAtencion ? CircleAlert : Check) : vencido ? AlarmClock : g === siguiente ? Hourglass : House;
          return (
            <span key={g.id} className={`riel__parada${enviado ? ' riel__parada--hecha' : ''}${vencido ? ' riel__parada--vencida' : ''}${g === siguiente ? ' riel__parada--siguiente' : ''}`}>
              <Icono size={18} strokeWidth={2} aria-hidden="true" />
            </span>
          );
        })}
      </div>
      <div className="riel__etiquetas" aria-hidden="true">
        {seguimientos.map((g, i) => <span key={g.id}>{MESES_PLAN[i] ?? `#${g.numero}`}</span>)}
      </div>
    </div>
  );
}

/** "Próximo reporte" en grande: cuántos días faltan o hace cuánto venció. */
function ProximoReporte({ seguimientos }: { seguimientos: readonly SeguimientoAdopcion[] }) {
  const siguiente = seguimientos.find((g) => g.estado !== EstadoSeguimiento.Enviado);
  if (!siguiente) return <div className="proximo"><p className="proximo__etiqueta">Plan de seguimiento</p><p className="proximo__valor">Completo</p></div>;
  const dias = Math.round((inicioDia(siguiente.fechaProgramada) - inicioDia(new Date().toISOString())) / DIA);
  const vencido = siguiente.estado === EstadoSeguimiento.Vencido || dias < 0;
  return (
    <div className={`proximo${vencido ? ' proximo--vencido' : ''}`}>
      <p className="proximo__etiqueta">{vencido ? `Seguimiento ${siguiente.numero} vencido hace` : `Próximo reporte (seguimiento ${siguiente.numero}) en`}</p>
      <p className="proximo__valor">
        {dias === 0 ? 'Hoy' : <>{String(Math.abs(dias)).padStart(2, '0')}<span className="proximo__unidad"> {Math.abs(dias) === 1 ? 'día' : 'días'}</span></>}
      </p>
      <p className="proximo__fecha">{formatearFecha(siguiente.fechaProgramada)}</p>
    </div>
  );
}

function PlanAdopcion({ solicitud: s }: { solicitud: SolicitudResumen }) {
  const cache = useQueryClient();
  const clave = ['plan-seguimiento', s.adopcionId];
  const plan = useQuery({ queryKey: clave, queryFn: () => api.trazabilidad.planSeguimiento(s.adopcionId!), retry: false });
  const evaluar = useMutation({
    mutationFn: ({ id, resultado }: { id: number; resultado: ResultadoSeguimiento }) => api.trazabilidad.evaluarSeguimiento(id, resultado),
    onSuccess: () => void cache.invalidateQueries({ queryKey: clave }),
  });
  const seguimientos = plan.data?.seguimientos ?? [];
  const enviados = seguimientos.filter((g) => g.estado === EstadoSeguimiento.Enviado);
  const porRevisar = enviados.filter((g) => g.resultado === null).length;

  return (
    <li className="cuenta__tarjeta seguimientos__tarjeta">
      <div className="seguimientos__cabecera">
        <AvatarMascota mascotaId={s.mascotaId} nombre={s.nombreMascota} />
        <div className="seguimientos__identidad">
          <h2 className="cuenta__titulo">{s.nombreMascota}</h2>
          <p className="cuenta__descripcion">Adoptado por {s.nombreAdoptante} · {s.codigo}</p>
        </div>
        {porRevisar > 0 && <span className="seguimientos__aviso">{porRevisar} por revisar</span>}
      </div>

      {plan.isPending ? (
        <EstadoCargando variante="compacto" mensaje="Cargando plan…" />
      ) : plan.isError ? (
        <p role="alert">{errorTexto(plan.error)} <Boton onClick={() => void plan.refetch()}>Reintentar</Boton></p>
      ) : (
        <>
          <RielSeguimiento seguimientos={seguimientos} />
          <ProximoReporte seguimientos={seguimientos} />
          {enviados.length > 0 && (
            <ol className="seguimientos__lista" aria-label="Seguimientos enviados">
              {enviados.map((g) => (
                <li key={g.id} className="seguimientos__item">
                  <div className="seguimientos__fila">
                    <strong>Seguimiento {g.numero}</strong>
                    {g.resultado !== null ? (
                      <span className={`seguimientos__resultado${g.resultado === ResultadoSeguimiento.RequiereAtencion ? ' seguimientos__resultado--alerta' : ''}`}>
                        {g.resultado === ResultadoSeguimiento.RequiereAtencion ? <CircleAlert size={16} aria-hidden="true" /> : <CircleCheck size={16} aria-hidden="true" />}
                        {ETIQUETA_RESULTADO_SEGUIMIENTO[g.resultado]}
                      </span>
                    ) : <Insignia estado={ESTADO_SEGUIMIENTO[g.estado]} />}
                  </div>
                  <p className="seguimientos__meta">Enviado el {formatearFecha(g.fechaEnvio)}</p>
                  {g.fotos.length > 0 && (
                    <ul className="seguimientos__fotos" aria-label={`Fotos del seguimiento ${g.numero}`}>
                      {g.fotos.map((f, i) => <li key={f}><a href={f} target="_blank" rel="noopener noreferrer"><img src={f} alt={`Foto ${i + 1}`} referrerPolicy="no-referrer" /></a></li>)}
                    </ul>
                  )}
                  {g.resultado === null && (
                    <div className="apoyos-tarjeta__acciones">
                      <Boton variante="primario" disabled={evaluar.isPending} onClick={() => evaluar.mutate({ id: g.id, resultado: ResultadoSeguimiento.Conforme })}>Conforme</Boton>
                      <Boton disabled={evaluar.isPending} onClick={() => evaluar.mutate({ id: g.id, resultado: ResultadoSeguimiento.RequiereAtencion })}>Requiere atención</Boton>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          )}
        </>
      )}
      {evaluar.isError && <p role="alert" className="campo__error">{errorTexto(evaluar.error)}</p>}
    </li>
  );
}
