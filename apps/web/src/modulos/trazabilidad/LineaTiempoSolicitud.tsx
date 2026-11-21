import { useQuery } from '@tanstack/react-query';
import { etiquetaEstadoSolicitud, formatearFechaHora } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import './trazabilidad.css';

/**
 * HU-TRA-01: los cambios de estado de una solicitud, del primero al
 * último, con quién los hizo y la observación que dejó.
 */
export function LineaTiempoSolicitud({ solicitudId }: { solicitudId: number }) {
  const consulta = useQuery({
    queryKey: ['linea-tiempo', solicitudId],
    queryFn: () => api.trazabilidad.lineaTiempo(solicitudId),
    retry: false,
  });

  if (consulta.isPending) return <EstadoCargando variante="compacto" mensaje="Cargando historial…" />;
  if (consulta.isError) {
    return <p role="alert">No pudimos cargar el historial. <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton></p>;
  }
  if (consulta.data.length === 0) return <p className="linea__meta">Todavía no hay cambios registrados para esta solicitud.</p>;

  return (
    <ol className="linea" aria-label="Historial de la solicitud">
      {consulta.data.map((e, i) => (
        <li key={`${e.fecha}-${i}`} className="linea__evento">
          <span className="linea__punto" aria-hidden="true" />
          <div>
            <p className="linea__titulo">{etiquetaEstadoSolicitud(e.estadoNuevo)}</p>
            <p className="linea__meta">{formatearFechaHora(e.fecha)} · {e.responsable}</p>
            {e.observacion && <p className="linea__nota">{e.observacion}</p>}
          </div>
        </li>
      ))}
    </ol>
  );
}
