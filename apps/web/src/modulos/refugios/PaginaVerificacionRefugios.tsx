import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, EstadoVerificacion, ESTADO_VERIFICACION, type Refugio } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { Campo } from '@/componentes/ui/Campo';
import '@/estilos/tabla.css';
import './refugios.css';

export function PaginaVerificacionRefugios() {
  const cliente = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [seleccion, setSeleccion] = useState<Refugio | null>(null);
  const [decision, setDecision] = useState<'verificar' | 'rechazar' | 'suspender' | null>(null);
  const [motivo, setMotivo] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [errorLocal, setErrorLocal] = useState('');
  const consulta = useQuery({ queryKey: ['refugios', 'revision', pagina], queryFn: () => api.refugios.listar({ pagina, tamanoPagina: 10 }), retry: false });
  const guardar = useMutation({
    mutationFn: async () => {
      if (!seleccion || !decision) throw new Error('Selecciona una decisión.');
      if (decision !== 'verificar' && !motivo.trim()) throw new Error('Escribe el motivo de la decisión.');
      if (decision === 'verificar') await api.refugios.verificar(seleccion.id);
      else if (decision === 'rechazar') await api.refugios.rechazar(seleccion.id, { motivo: motivo.trim() });
      else await api.refugios.suspender(seleccion.id, { motivo: motivo.trim() });
    },
    onSuccess: () => {
      setMensaje(decision === 'verificar' ? 'Refugio verificado.' : decision === 'rechazar' ? 'Solicitud rechazada.' : 'Refugio suspendido.');
      setSeleccion(null); setDecision(null); setMotivo('');
      void cliente.invalidateQueries({ queryKey: ['refugios'] });
    },
  });
  function elegir(refugio: Refugio) {
    setSeleccion(refugio); setDecision(null); setMotivo(''); setErrorLocal(''); setMensaje(''); guardar.reset();
  }
  return <>
    <Encabezado titulo="Verificación de refugios" resumen="Revisa la información antes de habilitar la publicación de mascotas." />
    {mensaje && <p role="status">{mensaje}</p>}
    {consulta.isPending && <p>Cargando solicitudes de refugios…</p>}
    {consulta.isError && <EstadoVacio titulo="No pudimos cargar los refugios" descripcion="Revisa tu conexión y vuelve a intentarlo." accion={<Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>} />}
    {consulta.data && consulta.data.items.length === 0 && <EstadoVacio titulo="Sin solicitudes de refugios" descripcion="Las solicitudes de registro aparecerán aquí para su revisión." />}
    {!!consulta.data?.items.length && <div className="refugio-tabla"><table className="tabla">
      <thead><tr><th scope="col">Refugio</th><th scope="col">NIT</th><th scope="col">Estado</th><th scope="col">Acción</th></tr></thead>
      <tbody>{consulta.data.items.map(refugio => <tr key={refugio.id}>
        <td>{refugio.nombre}</td><td>{refugio.nit}</td><td><Insignia estado={ESTADO_VERIFICACION[refugio.estadoVerificacion]} /></td>
        <td><Boton variante="primario" className="refugio-revisar" aria-label={`Revisar ${refugio.nombre}`} disabled={guardar.isPending} onClick={() => elegir(refugio)}>Revisar <span aria-hidden="true">↗</span></Boton></td>
      </tr>)}</tbody>
    </table></div>}
    {consulta.data && consulta.data.totalPaginas > 1 && <div className="refugio-acciones">
      <Boton disabled={pagina === 1 || guardar.isPending} onClick={() => { setPagina(p => p - 1); setSeleccion(null); }}>Anterior</Boton>
      <span>Página {pagina} de {consulta.data.totalPaginas}</span>
      <Boton disabled={pagina >= consulta.data.totalPaginas || guardar.isPending} onClick={() => { setPagina(p => p + 1); setSeleccion(null); }}>Siguiente</Boton>
    </div>}
    {seleccion && <Modal titulo={seleccion.nombre} alCerrar={() => setSeleccion(null)} ocupado={guardar.isPending}>
      <div className="refugio-resumen-modal"><Insignia estado={ESTADO_VERIFICACION[seleccion.estadoVerificacion]} /><span>Revisión del refugio</span></div>
      <dl className="refugio-datos">
        <div><dt>NIT</dt><dd>{seleccion.nit}</dd></div><div><dt>Persona encargada</dt><dd>{seleccion.encargado ?? 'Sin información'}</dd></div>
        <div><dt>Dirección</dt><dd>{seleccion.direccion}</dd></div><div><dt>Teléfono</dt><dd>{seleccion.telefono ?? 'Sin información'}</dd></div>
        <div><dt>Correo</dt><dd>{seleccion.correo ?? 'Sin información'}</dd></div><div><dt>Redes sociales</dt><dd>{seleccion.redesSociales || 'Sin información'}</dd></div>
        <div><dt>Descripción</dt><dd>{seleccion.descripcion || 'Sin descripción'}</dd></div>
      </dl>
      {seleccion.motivoRechazo && <p>Motivo registrado: {seleccion.motivoRechazo}</p>}
      <div className="refugio-acciones"><Link className="boton boton--secundario refugio-enlace" to={`/refugios/${seleccion.id}`} state={{ volverA: '/refugios' }}>Ver perfil completo <span aria-hidden="true">↗</span></Link></div>
      {seleccion.estadoVerificacion === EstadoVerificacion.Pendiente && <>
        <div className="refugio-acciones">
          <Boton variante="primario" disabled={guardar.isPending} onClick={() => { setDecision('verificar'); guardar.reset(); setErrorLocal(''); }}>Verificar refugio</Boton>
          <Boton variante="peligro" disabled={guardar.isPending} onClick={() => { setDecision('rechazar'); guardar.reset(); setErrorLocal(''); }}>Rechazar solicitud</Boton>
        </div>
      </>}
      {seleccion.estadoVerificacion === EstadoVerificacion.Verificado && <div className="refugio-acciones">
        <Boton variante="peligro" onClick={() => { setDecision('suspender'); setMotivo(''); guardar.reset(); setErrorLocal(''); }}>Suspender refugio</Boton>
      </div>}
      {seleccion.estadoVerificacion === EstadoVerificacion.Suspendido && <p>El refugio está suspendido. La reactivación requiere un flujo definido con el equipo.</p>}
      <footer className="modal__pie"><Boton disabled={guardar.isPending} onClick={() => setSeleccion(null)}>Volver a la lista</Boton></footer>
    </Modal>}
    {seleccion && decision && <Modal compacto ocupado={guardar.isPending}
      titulo={decision === 'verificar' ? 'Verificar refugio' : decision === 'rechazar' ? 'Rechazar solicitud' : 'Suspender refugio'}
      alCerrar={() => { setDecision(null); guardar.reset(); }}>
      <p>{decision === 'verificar' ? <>¿Confirmas la verificación de <strong>{seleccion.nombre}</strong>?</>
        : decision === 'rechazar' ? <>Indica por qué se rechaza la solicitud de <strong>{seleccion.nombre}</strong>.</>
          : <>¿Quieres suspender a <strong>{seleccion.nombre}</strong>? Su perfil dejará de estar disponible al público. Registra el motivo de la revisión.</>}</p>
      {decision !== 'verificar' && <Campo id="motivo-decision" etiqueta={decision === 'rechazar' ? 'Motivo del rechazo' : 'Motivo de la suspensión'} valor={motivo} alCambiar={setMotivo} />}
      {errorLocal && <p role="alert" className="refugio-error">{errorLocal}</p>}
      {guardar.isError && <p role="alert" className="refugio-error">{guardar.error instanceof ErrorHttp ? guardar.error.detalle ?? guardar.error.message : guardar.error.message}</p>}
      <footer className="modal__pie">
        <Boton disabled={guardar.isPending} onClick={() => { setDecision(null); guardar.reset(); }}>Cancelar</Boton>
        <Boton variante={decision === 'verificar' ? 'primario' : 'peligro'} cargando={guardar.isPending} onClick={() => {
          if (decision !== 'verificar' && !motivo.trim()) return setErrorLocal('Escribe el motivo de la decisión.');
          setErrorLocal(''); guardar.mutate();
        }}>Confirmar {decision === 'verificar' ? 'verificación' : decision === 'rechazar' ? 'rechazo' : 'suspensión'}</Boton>
      </footer>
    </Modal>}
  </>;
}
