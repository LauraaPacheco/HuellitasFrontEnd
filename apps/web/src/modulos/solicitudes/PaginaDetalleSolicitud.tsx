import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ESTADO_SOLICITUD, formatearFechaHora } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Insignia } from '@/componentes/ui/Insignia';

export function PaginaDetalleSolicitud() {
  const { id } = useParams<{ id: string }>();
  const solicitudId = Number(id);

  const { data: solicitud, isLoading } = useQuery({
    queryKey: ['solicitud', solicitudId],
    queryFn: () => api.adopcion.obtener(solicitudId),
    enabled: Number.isFinite(solicitudId),
  });

  const { data: linea } = useQuery({
    queryKey: ['solicitud', solicitudId, 'linea-tiempo'],
    queryFn: () => api.adopcion.lineaTiempo(solicitudId),
    enabled: Number.isFinite(solicitudId),
  });

  if (isLoading) return <p style={{ color: 'var(--ink-muted)' }}>Cargando…</p>;
  if (!solicitud) return <p>No encontramos esa solicitud.</p>;

  return (
    <>
      <Encabezado
        titulo={`Solicitud ${solicitud.codigo}`}
        resumen={`Recibida el ${formatearFechaHora(solicitud.fechaEnvio)}`}
        acciones={<Insignia estado={ESTADO_SOLICITUD[solicitud.estado]} />}
      />

      <section
        style={{
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 'var(--space-5)',
        }}
      >
        <h2 style={{ fontFamily: 'var(--fuente-cuerpo)', fontSize: 17 }}>
          Historial de la solicitud
        </h2>
        <ol style={{ listStyle: 'none', margin: 'var(--space-4) 0 0', padding: 0 }}>
          {linea?.map((etapa) => (
            <li
              key={etapa.etiqueta}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: 'var(--space-2) 0',
                color: etapa.estado === 'pendiente' ? 'var(--ink-muted)' : 'var(--ink)',
                fontWeight: etapa.estado === 'actual' ? 700 : 400,
              }}
            >
              <span>{etapa.etiqueta}</span>
              <span style={{ color: 'var(--ink-muted)', fontSize: 13 }}>
                {etapa.fecha ? formatearFechaHora(etapa.fecha) : 'Pendiente'}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </>
  );
}
