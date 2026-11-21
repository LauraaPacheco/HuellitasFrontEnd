import { useQuery } from '@tanstack/react-query';
import { ETIQUETA_TIPO_EVENTO, formatearFechaHora } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import '@/modulos/cuenta/cuenta.css';
import './trazabilidad.css';

const VISIBLES = 8;

/**
 * HU-TRA-02: la bitácora pública de la mascota (ingreso, cambios de
 * estado, atenciones clínicas, adopción), la más reciente primero.
 */
export function HistoriaMascota({ mascotaId }: { mascotaId: number }) {
  const consulta = useQuery({
    queryKey: ['historia-mascota', mascotaId],
    queryFn: () => api.trazabilidad.historialMascota(mascotaId),
    retry: false,
  });

  return (
    <section className="cuenta__tarjeta" aria-labelledby="historia-titulo">
      <div>
        <h2 id="historia-titulo" className="cuenta__titulo">Su historia</h2>
        <p className="cuenta__descripcion">Todo lo que ha pasado desde que llegó al refugio. También lo ven los adoptantes.</p>
      </div>
      {consulta.isPending ? (
        <EstadoCargando variante="compacto" mensaje="Cargando historia…" />
      ) : consulta.isError ? (
        <p role="alert">No pudimos cargar la historia. <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton></p>
      ) : consulta.data.length === 0 ? (
        <p className="cuenta__aviso">Todavía no hay eventos registrados.</p>
      ) : (
        <>
          <ol className="linea">
            {consulta.data.slice(0, VISIBLES).map((e, i) => (
              <li key={`${e.fecha}-${i}`} className="linea__evento">
                <span className="linea__punto" aria-hidden="true" />
                <div>
                  <p className="linea__titulo">{ETIQUETA_TIPO_EVENTO[e.tipo]}</p>
                  <p className="linea__meta">{formatearFechaHora(e.fecha)}</p>
                  <p className="linea__nota">{e.descripcion}</p>
                </div>
              </li>
            ))}
          </ol>
          {consulta.data.length > VISIBLES && <p className="linea__meta">Y {consulta.data.length - VISIBLES} eventos anteriores.</p>}
        </>
      )}
    </section>
  );
}
