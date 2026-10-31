import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ErrorHttp,
  ESTADO_SOLICITUD,
  EstadoSolicitud,
  MAX_MOTIVO_RECHAZO,
  formatearFecha,
  type FiltroSolicitud,
  type SolicitudResumen,
} from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Insignia } from '@/componentes/ui/Insignia';
import { Modal } from '@/componentes/ui/Modal/Modal';
import '@/estilos/tabla.css';
import '@/modulos/mascotas/mascotas.css';
import '@/modulos/mascotas/multimedia.css';

/** Solicitudes con esta espera o mas se resaltan en ambar. */
const DIAS_PARA_ALERTA = 5;

/** El backend solo deja decidir sobre solicitudes que siguen abiertas (409 en cualquier otro estado). */
const sePuedeDecidir = (s: SolicitudResumen) =>
  s.estado === EstadoSolicitud.Enviada || s.estado === EstadoSolicitud.EnRevision;

type Decision = { readonly tipo: 'aprobar' | 'rechazar'; readonly solicitud: SolicitudResumen };

export function PaginaBandeja() {
  const cache = useQueryClient();
  const [filtro, setFiltro] = useState<FiltroSolicitud>({ pagina: 1, tamanoPagina: 20 });
  const [decision, setDecision] = useState<Decision>();
  const [texto, setTexto] = useState('');
  const [mensaje, setMensaje] = useState('');

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['solicitudes', filtro],
    queryFn: () => api.adopcion.listar(filtro),
  });

  const decidir = useMutation({
    mutationFn: ({ tipo, solicitud }: Decision) =>
      tipo === 'aprobar'
        ? api.adopcion.aprobar(solicitud.id, { observacion: texto })
        : api.adopcion.rechazar(solicitud.id, { motivo: texto }),
    onSuccess: async (_, { tipo, solicitud }) => {
      setMensaje(`La solicitud ${solicitud.codigo} de ${solicitud.nombreAdoptante} quedó ${tipo === 'aprobar' ? 'aprobada' : 'rechazada'}.`);
      cerrarDecision();
      await cache.invalidateQueries({ queryKey: ['solicitudes'] });
    },
  });

  function abrirDecision(tipo: Decision['tipo'], solicitud: SolicitudResumen) {
    decidir.reset(); setTexto(''); setMensaje(''); setDecision({ tipo, solicitud });
  }
  function cerrarDecision() { setDecision(undefined); setTexto(''); }

  const demoradas = useMemo(
    () => data?.items.filter((s) => s.diasSinRespuesta >= DIAS_PARA_ALERTA).length ?? 0,
    [data],
  );
  const motivoInvalido = decision?.tipo === 'rechazar' && (!texto.trim() || texto.trim().length > MAX_MOTIVO_RECHAZO);

  return (
    <>
      <Encabezado
        titulo="Solicitudes recibidas"
        resumen={
          data
            ? `${data.total} ${data.total === 1 ? 'solicitud' : 'solicitudes'} · ${demoradas} esperan respuesta hace más de ${DIAS_PARA_ALERTA} días`
            : undefined
        }
        acciones={
          // El backend real todavía no filtra la bandeja por estado.
          MODO_DEMO && (
            <>
              <label className="visualmente-oculto" htmlFor="filtro-estado">
                Filtrar por estado
              </label>
              <select
                id="filtro-estado"
                className="filtro-select"
                value={filtro.estado ?? ''}
                onChange={(evento) =>
                  setFiltro((previo) => ({
                    ...previo,
                    pagina: 1,
                    estado: evento.target.value
                      ? (Number(evento.target.value) as EstadoSolicitud)
                      : undefined,
                  }))
                }
              >
                <option value="">Todos los estados</option>
                {Object.entries(ESTADO_SOLICITUD).map(([valor, descriptor]) => (
                  <option key={valor} value={valor}>
                    {descriptor.etiqueta}
                  </option>
                ))}
              </select>
            </>
          )
        }
      />

      {mensaje && <p role="status" className="mascotas-mensaje">{mensaje}</p>}

      {isLoading && <p style={{ color: 'var(--ink-muted)' }}>Cargando solicitudes…</p>}

      {isError && (
        <EstadoVacio
          titulo="No pudimos cargar las solicitudes"
          descripcion={error instanceof ErrorHttp ? error.detalle ?? error.message : 'Revisa tu conexión y vuelve a intentarlo.'}
          accion={<Boton onClick={() => void refetch()}>Reintentar</Boton>}
        />
      )}

      {/* Dos vacios que no son lo mismo: que no haya llegado nada todavia
          no es un problema; que el filtro no encuentre nada si tiene una
          salida, que es quitarlo. */}
      {data && data.items.length === 0 && filtro.estado === undefined && (
        <EstadoVacio
          ilustracion="durmiendo"
          titulo="Todavía no hay solicitudes"
          descripcion="Cuando alguien se postule a una de tus mascotas, la verás aquí."
        />
      )}

      {data && data.items.length === 0 && filtro.estado !== undefined && (
        <EstadoVacio
          ilustracion="confundido"
          titulo="Ninguna solicitud en ese estado"
          descripcion="Prueba con otro estado o mira todas las solicitudes."
          accion={
            <Boton
              onClick={() =>
                setFiltro((previo) => ({ ...previo, pagina: 1, estado: undefined }))
              }
            >
              Ver todas
            </Boton>
          }
        />
      )}

      {data && data.items.length > 0 && (
        <div className="tabla-scroll" role="region" aria-label="Solicitudes recibidas, tabla desplazable" tabIndex={0}><table className="tabla">
          <thead>
            <tr>
              <th scope="col">Adoptante</th>
              <th scope="col">Mascota</th>
              <th scope="col">Recibida</th>
              <th scope="col">Espera</th>
              <th scope="col">Estado</th>
              {!MODO_DEMO && <th scope="col">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {data.items.map((solicitud) => {
              const demorada = solicitud.diasSinRespuesta >= DIAS_PARA_ALERTA;
              return (
                <tr key={solicitud.id}>
                  <td>
                    {/* El detalle y la línea de tiempo aún no existen en el backend real. */}
                    {MODO_DEMO
                      ? <Link to={`/solicitudes/${solicitud.id}`} className="tabla__nombre">{solicitud.nombreAdoptante}</Link>
                      : <span className="tabla__nombre">{solicitud.nombreAdoptante}</span>}
                    <span className="tabla__detalle">
                      {solicitud.perfilCompleto === undefined
                        ? solicitud.codigo
                        : solicitud.perfilCompleto ? 'Perfil completo' : 'Perfil incompleto'}
                    </span>
                  </td>
                  <td>
                    <span className="mascota-miniatura">
                      {solicitud.fotoMascota && <img src={solicitud.fotoMascota} alt="" referrerPolicy="no-referrer" />}
                      {solicitud.nombreMascota}
                    </span>
                  </td>
                  <td className="tabla__detalle">{formatearFecha(solicitud.fechaEnvio)}</td>
                  <td className={demorada ? 'tabla__alerta' : 'tabla__detalle'}>
                    {sePuedeDecidir(solicitud)
                      ? `${solicitud.diasSinRespuesta} ${solicitud.diasSinRespuesta === 1 ? 'día' : 'días'}`
                      : '—'}
                  </td>
                  <td>
                    <Insignia estado={ESTADO_SOLICITUD[solicitud.estado]} />
                  </td>
                  {!MODO_DEMO && (
                    <td>
                      {sePuedeDecidir(solicitud) ? (
                        <span style={{ display: 'flex', gap: 8 }}>
                          <Boton variante="primario" onClick={() => abrirDecision('aprobar', solicitud)}>Aprobar</Boton>
                          <Boton variante="peligro" onClick={() => abrirDecision('rechazar', solicitud)}>Rechazar</Boton>
                        </span>
                      ) : <span className="tabla__detalle">Sin acciones</span>}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}

      {data && data.totalPaginas > 1 && (
        <div className="publicacion-navegacion" style={{ marginTop: 16 }}>
          <Boton disabled={data.pagina <= 1} onClick={() => setFiltro((p) => ({ ...p, pagina: (p.pagina ?? 1) - 1 }))}>← Anterior</Boton>
          <span className="tabla__detalle">Página {data.pagina} de {data.totalPaginas}</span>
          <Boton disabled={data.pagina >= data.totalPaginas} onClick={() => setFiltro((p) => ({ ...p, pagina: (p.pagina ?? 1) + 1 }))}>Siguiente →</Boton>
        </div>
      )}

      {decision && (
        <Modal
          titulo={decision.tipo === 'aprobar' ? 'Aprobar solicitud' : 'Rechazar solicitud'}
          compacto
          ocupado={decidir.isPending}
          alCerrar={cerrarDecision}
        >
          <p>
            {decision.tipo === 'aprobar' ? '¿Apruebas' : '¿Rechazas'} la solicitud <strong>{decision.solicitud.codigo}</strong> de{' '}
            <strong>{decision.solicitud.nombreAdoptante}</strong> para adoptar a <strong>{decision.solicitud.nombreMascota}</strong>?
          </p>
          <label className="campo">
            {decision.tipo === 'aprobar' ? 'Observaciones (opcional)' : 'Motivo del rechazo'}
            <textarea
              className="campo__control"
              value={texto}
              maxLength={decision.tipo === 'rechazar' ? MAX_MOTIVO_RECHAZO : undefined}
              required={decision.tipo === 'rechazar'}
              onChange={(e) => setTexto(e.target.value)}
            />
          </label>
          {decision.tipo === 'rechazar' && (
            <p className="tabla__detalle">El adoptante verá su solicitud como rechazada. Máximo {MAX_MOTIVO_RECHAZO} caracteres.</p>
          )}
          {decidir.isError && (
            <p role="alert" className="campo__error">
              {decidir.error instanceof ErrorHttp ? decidir.error.detalle ?? decidir.error.message : 'No pudimos guardar la decisión.'}
            </p>
          )}
          <div className="publicacion-navegacion">
            <Boton disabled={decidir.isPending} onClick={cerrarDecision}>Cancelar</Boton>
            <Boton
              variante={decision.tipo === 'aprobar' ? 'primario' : 'peligro'}
              cargando={decidir.isPending}
              disabled={motivoInvalido}
              onClick={() => decidir.mutate(decision)}
            >
              {decision.tipo === 'aprobar' ? 'Aprobar' : 'Rechazar'}
            </Boton>
          </div>
        </Modal>
      )}
    </>
  );
}
