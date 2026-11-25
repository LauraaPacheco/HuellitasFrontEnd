import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, BellRing } from 'lucide-react';
import { ErrorHttp, etiquetaEstadoSolicitud, formatearFechaHora, type EntradaAuditoria } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import '@/componentes/ui/Campo/campo.css';
import '@/estilos/tabla.css';
import './trazabilidad.css';

const TAMANO = 20;
const ENTIDADES: Record<string, string> = { SolicitudAdopcion: 'Solicitud de adopción', ReporteCiudadano: 'Reporte ciudadano' };
const ACCIONES: Record<string, string> = { CambioEstado: 'Cambio de estado', Creacion: 'Creación', Actualizacion: 'Actualización', Eliminacion: 'Eliminación' };

/** Los valores de un cambio de estado llegan como nombre de enum; el resto se muestra tal cual. */
function valor(entrada: EntradaAuditoria, texto: string | null) {
  if (texto === null || texto === '') return '—';
  return entrada.entidad === 'SolicitudAdopcion' ? etiquetaEstadoSolicitud(texto) : texto;
}

/**
 * HU-TRA-03: registro de auditoría (solo administrador). Quién cambió qué
 * y cuándo, del más reciente al más antiguo.
 */
export function PaginaAuditoria() {
  const [pagina, setPagina] = useState(1);
  const consulta = useQuery({
    queryKey: ['auditoria', pagina],
    queryFn: () => api.trazabilidad.auditoria({ pagina, tamanoPagina: TAMANO }),
    placeholderData: (previo) => previo,
    retry: false,
  });
  const datos = consulta.data;
  const cache = useQueryClient();
  // HU-TRA-06: el backend no tiene tarea programada, así que el admin las lanza desde aquí.
  const alertas = useMutation({
    mutationFn: () => api.trazabilidad.procesarAlertas(),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ['auditoria'] }),
  });

  return (
    <>
      <Encabezado
        titulo="Auditoría"
        resumen="Cada cambio de estado queda registrado con quién lo hizo y cuándo."
        acciones={(
          <Boton cargando={alertas.isPending} onClick={() => alertas.mutate()} title="Revisa los seguimientos post-adopción vencidos y avisa a adoptantes y refugios">
            <BellRing size={16} strokeWidth={1.75} aria-hidden="true" /> Procesar alertas de seguimiento
          </Boton>
        )}
      />
      {alertas.isSuccess && (
        <p role="status" className="auditoria-aviso">
          {alertas.data} Se avisó a quienes tienen un seguimiento post-adopción vencido.
        </p>
      )}
      {alertas.isError && (
        <p role="alert" className="campo__error">
          {alertas.error instanceof ErrorHttp ? alertas.error.detalle ?? alertas.error.message : 'No pudimos procesar las alertas.'}
        </p>
      )}
      {consulta.isPending ? (
        <EstadoCargando mensaje="Cargando auditoría…" />
      ) : consulta.isError ? (
        <EstadoError titulo="No pudimos cargar la auditoría" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      ) : !datos || datos.items.length === 0 ? (
        <EstadoVacio titulo="Todavía no hay registros" descripcion="Cuando haya cambios en solicitudes o reportes, aparecerán aquí." />
      ) : (
        <>
          <div className="tabla-scroll">
            <table className="tabla tabla--tarjetas">
              <thead>
                <tr><th scope="col">Fecha</th><th scope="col">Responsable</th><th scope="col">Acción</th><th scope="col">Registro</th><th scope="col">Cambio</th></tr>
              </thead>
              <tbody>
                {datos.items.map((e) => (
                  <tr key={e.id}>
                    <td className="tabla__c-titulo">{formatearFechaHora(e.fecha)}</td>
                    <td className="tabla__c-dato" data-etiqueta="Responsable">{e.responsable}</td>
                    <td className="tabla__c-dato" data-etiqueta="Acción">{ACCIONES[e.accion] ?? e.accion}</td>
                    <td className="tabla__c-dato" data-etiqueta="Registro">{ENTIDADES[e.entidad] ?? e.entidad}{e.idEntidad !== null ? ` #${e.idEntidad}` : ''}</td>
                    <td className="tabla__c-ancho" data-etiqueta="Cambio">
                      <span className="auditoria__cambio">
                        <span>{valor(e, e.valorAnterior)}</span>
                        <ArrowRight size={14} strokeWidth={2} aria-label="pasó a" />
                        <strong>{valor(e, e.valorNuevo)}</strong>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {datos.totalPaginas > 1 && (
            <nav className="trazabilidad-paginas" aria-label="Páginas de la auditoría">
              <Boton disabled={pagina <= 1 || consulta.isFetching} onClick={() => setPagina((p) => p - 1)}>Anterior</Boton>
              <span>Página {datos.pagina} de {datos.totalPaginas}</span>
              <Boton disabled={pagina >= datos.totalPaginas || consulta.isFetching} onClick={() => setPagina((p) => p + 1)}>Siguiente</Boton>
            </nav>
          )}
        </>
      )}
    </>
  );
}
