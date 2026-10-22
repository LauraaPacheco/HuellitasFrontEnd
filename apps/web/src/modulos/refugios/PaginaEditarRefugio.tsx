import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, ESTADO_VERIFICACION, normalizarRefugio, validarRefugio, type EditarRefugioDto, type Refugio } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Campo } from '@/componentes/ui/Campo';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import './refugios.css';

const mensajeError = (error: Error) => error instanceof ErrorHttp ? error.detalle ?? error.message : error.message;

export function PaginaEditarRefugio() {
  const { usuario } = useSesion();
  const id = usuario?.refugioId;
  const consulta = useQuery({ queryKey: ['refugios', 'edicion', id], queryFn: () => api.refugios.obtener(id!), enabled: !!id, retry: false, gcTime: 0 });
  return <>
    <Encabezado titulo="Mi refugio" resumen="Actualiza la información pública y los requisitos de adopción." />
    {!id ? <EstadoVacio titulo="Tu cuenta no tiene un refugio asociado" descripcion="Solicita al administrador que revise la asociación antes de editar o publicar mascotas." />
      : consulta.isPending ? <p>Cargando tu refugio…</p>
      : consulta.isError ? <EstadoVacio titulo="No pudimos cargar tu refugio" descripcion="Revisa tu conexión y vuelve a intentarlo." accion={<Boton onClick={() => void consulta.refetch()}>Reintentar</Boton>} />
      : consulta.data && <><FormularioRefugio key={consulta.data.id} refugio={consulta.data} /><GestionRequisitos refugio={consulta.data} /></>}
  </>;
}

function FormularioRefugio({ refugio }: { refugio: Refugio }) {
  const cliente = useQueryClient();
  const [datos, setDatos] = useState<EditarRefugioDto>({
    nombre: refugio.nombre, direccion: refugio.direccion, telefono: refugio.telefono ?? '', correo: refugio.correo ?? '',
    encargado: refugio.encargado ?? '', redesSociales: refugio.redesSociales ?? '', descripcion: refugio.descripcion ?? '',
  });
  const [errorLocal, setErrorLocal] = useState('');
  const guardar = useMutation({ mutationFn: () => api.refugios.editar(refugio.id, normalizarRefugio(datos)),
    onSuccess: () => { void cliente.invalidateQueries({ queryKey: ['refugios'] }); } });
  function cambiar(campo: keyof EditarRefugioDto, valor: string) {
    setDatos(prev => ({ ...prev, [campo]: valor })); guardar.reset(); setErrorLocal('');
  }
  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (guardar.isPending) return;
    const error = validarRefugio(datos); setErrorLocal(error ?? '');
    if (!error) guardar.mutate();
  }
  return <section className="refugio-panel"><h2>Perfil del refugio</h2>
    <div className="refugio-estado"><Insignia estado={ESTADO_VERIFICACION[refugio.estadoVerificacion]} /></div>
    <p>NIT: {refugio.nit}. La edición de contacto no cambia el estado de verificación.</p>
    <form className="refugio-form" onSubmit={enviar} noValidate>
      <fieldset disabled={guardar.isPending}>
        <Campo id="refugio-nombre" etiqueta="Nombre del refugio" valor={datos.nombre} alCambiar={v => cambiar('nombre', v)} />
        <Campo id="refugio-direccion" etiqueta="Dirección" valor={datos.direccion} alCambiar={v => cambiar('direccion', v)} />
        <Campo id="refugio-telefono" etiqueta="Teléfono" tipo="tel" valor={datos.telefono} alCambiar={v => cambiar('telefono', v)} ayuda="10 dígitos" />
        <Campo id="refugio-correo" etiqueta="Correo de contacto" tipo="email" valor={datos.correo} alCambiar={v => cambiar('correo', v)} />
        <Campo id="refugio-encargado" etiqueta="Persona encargada" valor={datos.encargado} alCambiar={v => cambiar('encargado', v)} />
        <Campo id="refugio-redes" etiqueta="Redes sociales (opcional)" valor={datos.redesSociales ?? ''} alCambiar={v => cambiar('redesSociales', v)} />
        <label className="campo" htmlFor="refugio-descripcion">Descripción (opcional)
          <textarea className="campo__control" id="refugio-descripcion" value={datos.descripcion ?? ''} onChange={e => cambiar('descripcion', e.target.value)} />
        </label>
      </fieldset>
      {(errorLocal || guardar.isError) && <p role="alert" className="refugio-error">{errorLocal || (guardar.error && mensajeError(guardar.error))}</p>}
      {guardar.isSuccess && <p role="status">La información del refugio se guardó.</p>}
      <Boton tipo="submit" variante="primario" cargando={guardar.isPending}>Guardar información</Boton>
    </form>
    <p><Link className="boton boton--primario refugio-enlace" to={`/refugios/${refugio.id}`} state={{ volverA: '/mi-refugio' }}>Ver perfil público <span aria-hidden="true">↗</span></Link></p>
  </section>;
}

function GestionRequisitos({ refugio }: { refugio: Refugio }) {
  const cliente = useQueryClient();
  const [descripcion, setDescripcion] = useState('');
  const [obligatorio, setObligatorio] = useState(true);
  const [edicion, setEdicion] = useState<number | null>(null);
  const [borrado, setBorrado] = useState<number | null>(null);
  const [errorLocal, setErrorLocal] = useState('');
  const [mensaje, setMensaje] = useState('');
  const guardar = useMutation({
    mutationFn: async (accion: 'guardar' | 'eliminar') => {
      if (accion === 'eliminar') {
        if (borrado === null) throw new Error('Selecciona un requisito.');
        await api.refugios.eliminarRequisito(refugio.id, borrado);
      } else if (edicion !== null) {
        await api.refugios.editarRequisito(refugio.id, edicion, { descripcion: descripcion.trim(), esObligatorio: obligatorio });
      } else await api.refugios.guardarRequisito(refugio.id, descripcion.trim(), obligatorio);
    },
    onSuccess: (_data, accion) => {
      setMensaje(accion === 'eliminar' ? 'Requisito eliminado.' : 'Requisito guardado.');
      setDescripcion(''); setEdicion(null); setBorrado(null); setObligatorio(true);
      void cliente.invalidateQueries({ queryKey: ['refugios'] });
    },
  });
  return <section className="refugio-panel"><h2>Requisitos de adopción</h2>
    <p>Distingue los requisitos obligatorios de las recomendaciones para que el adoptante conozca las condiciones.</p>
    {refugio.requisitos.filter(r => r.activo).length === 0 ? <p>Todavía no agregaste requisitos.</p> : <ol className="refugio-lista">
      {[...refugio.requisitos].filter(r => r.activo).sort((a,b) => a.orden-b.orden).map(r => <li key={r.id}>
        {r.descripcion} <strong>({r.esObligatorio ? 'Obligatorio' : 'Opcional'})</strong>
        <div className="refugio-acciones">
          <Boton disabled={guardar.isPending} onClick={() => { setEdicion(r.id); setBorrado(null); setDescripcion(r.descripcion); setObligatorio(r.esObligatorio); setMensaje(''); setErrorLocal(''); guardar.reset(); }}>Editar requisito: {r.descripcion}</Boton>
          <Boton variante="peligro" disabled={guardar.isPending} onClick={() => { setBorrado(r.id); setMensaje(''); guardar.reset(); }}>Eliminar requisito: {r.descripcion}</Boton>
        </div>
        {borrado === r.id && <div role="group" aria-label="Confirmar eliminación del requisito">
          <p>¿Quieres eliminar este requisito del perfil?</p>
          <Boton variante="peligro" cargando={guardar.isPending} onClick={() => guardar.mutate('eliminar')}>Confirmar eliminación</Boton>{' '}
          <Boton disabled={guardar.isPending} onClick={() => setBorrado(null)}>Cancelar eliminación</Boton>
        </div>}
      </li>)}
    </ol>}
    <form className="refugio-form" onSubmit={e => {
      e.preventDefault(); if (guardar.isPending) return;
      if (!descripcion.trim()) return setErrorLocal('Describe el requisito.');
      setErrorLocal(''); guardar.mutate('guardar');
    }} noValidate>
      <fieldset disabled={guardar.isPending}>
        <Campo id="nuevo-requisito" etiqueta={edicion === null ? 'Nuevo requisito' : 'Editar requisito'} valor={descripcion} alCambiar={v => { setDescripcion(v); setMensaje(''); }} />
        <label><input type="checkbox" checked={obligatorio} onChange={e => setObligatorio(e.target.checked)} /> Es obligatorio</label>
      </fieldset>
      <div className="refugio-acciones">
        <Boton tipo="submit" variante="primario" cargando={guardar.isPending}>{edicion === null ? 'Agregar requisito' : 'Guardar requisito'}</Boton>
        {edicion !== null && <Boton disabled={guardar.isPending} onClick={() => { setEdicion(null); setDescripcion(''); setObligatorio(true); setErrorLocal(''); }}>Cancelar edición</Boton>}
      </div>
    </form>
    {(errorLocal || guardar.isError) && <p role="alert" className="refugio-error">{errorLocal || (guardar.error && mensajeError(guardar.error))}</p>}
    {mensaje && <p role="status">{mensaje}</p>}
  </section>;
}
