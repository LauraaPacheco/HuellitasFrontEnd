import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ESTADO_SOLICITUD,
  EstadoSolicitud,
  formatearFecha,
  type FiltroSolicitud,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Insignia } from '@/componentes/ui/Insignia';
import './bandeja.css';

/** Solicitudes con esta espera o mas se resaltan en ambar. */
const DIAS_PARA_ALERTA = 5;

export function PaginaBandeja() {
  const [filtro, setFiltro] = useState<FiltroSolicitud>({ pagina: 1, tamanoPagina: 20 });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['solicitudes', filtro],
    queryFn: () => api.adopcion.listar(filtro),
  });

  const demoradas = useMemo(
    () => data?.items.filter((s) => s.diasSinRespuesta >= DIAS_PARA_ALERTA).length ?? 0,
    [data],
  );

  return (
    <>
      <Encabezado
        titulo="Solicitudes recibidas"
        resumen={
          data
            ? `${data.total} activas · ${demoradas} esperan respuesta hace más de ${DIAS_PARA_ALERTA} días`
            : undefined
        }
        acciones={
          <>
            <label className="visualmente-oculto" htmlFor="filtro-estado">
              Filtrar por estado
            </label>
            <select
              id="filtro-estado"
              className="bandeja__select"
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
        }
      />

      {isLoading && <p style={{ color: 'var(--ink-muted)' }}>Cargando solicitudes…</p>}

      {isError && (
        <EstadoVacio
          titulo="No pudimos cargar las solicitudes"
          descripcion="Revisa tu conexión y vuelve a intentarlo."
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
        <table className="bandeja">
          <thead>
            <tr>
              <th scope="col">Adoptante</th>
              <th scope="col">Mascota</th>
              <th scope="col">Recibida</th>
              <th scope="col">Espera</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((solicitud) => {
              const demorada = solicitud.diasSinRespuesta >= DIAS_PARA_ALERTA;
              return (
                <tr key={solicitud.id}>
                  <td>
                    <Link to={`/solicitudes/${solicitud.id}`} className="bandeja__nombre">
                      {solicitud.nombreAdoptante}
                    </Link>
                    <span className="bandeja__detalle">
                      {solicitud.perfilCompleto ? 'Perfil completo' : 'Perfil incompleto'}
                    </span>
                  </td>
                  <td>{solicitud.nombreMascota}</td>
                  <td className="bandeja__detalle">{formatearFecha(solicitud.fechaEnvio)}</td>
                  <td className={demorada ? 'bandeja__demora' : 'bandeja__detalle'}>
                    {solicitud.diasSinRespuesta} {solicitud.diasSinRespuesta === 1 ? 'día' : 'días'}
                  </td>
                  <td>
                    <Insignia estado={ESTADO_SOLICITUD[solicitud.estado]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
