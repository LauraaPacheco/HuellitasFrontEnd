import { PasosPublicacion, RevisionPublicacion } from './PublicacionPorPasos';
import { GestionMultimedia } from './GestionMultimedia';
import { Calendario } from '@/componentes/ui/Calendario/Calendario';
import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ErrorHttp, EstadoMascota, EstadoVerificacion, ESTADO_MASCOTA, Procedencia, Sexo, validarMascota, estadosManualesMascota, type CrearMascotaDto, type Mascota, type OpcionCatalogo } from '@huellitas/shared';
import { usarMascota, usarCrearBorradorMascota, usarEditarMascota, usarCambiarEstadoMascota } from '@/casos/mascotas';
import { usarEspecies, usarRazas, usarTamanos, usarColores, usarTemperamentos, opcionesElegibles } from '@/casos/catalogos';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import { SelectorCatalogo } from '@/componentes/ui/SelectorCatalogo';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Insignia } from '@/componentes/ui/Insignia';
import { Modal } from '@/componentes/ui/Modal/Modal';
import './mascotas.css';

const errorTexto = (error: Error) => error instanceof ErrorHttp ? error.detalle ?? error.message : error.message;

export function PaginaGestionMascota() {
  const { id: parametro } = useParams();
  const ubicacion = useLocation();
  const navegar = useNavigate();
  const [multimediaPendiente, setMultimediaPendiente] = useState(false);
  const id = parametro === undefined ? undefined : Number(parametro);
  const { usuario } = useSesion();
  const refugioId = usuario?.refugioId;
  const refugio = useQuery({ queryKey: ['refugios', 'publicacion', refugioId], queryFn: () => api.refugios.obtener(refugioId!), enabled: !!refugioId, retry: false });
  const mascota = usarMascota(id !== undefined && Number.isSafeInteger(id) && id > 0 ? id : undefined);
  const volver = <Link className="boton boton--secundario mascota-enlace" to="/mascotas">← Volver a mascotas</Link>;
  if (!refugioId) return <EstadoVacio titulo="Tu cuenta no tiene un refugio asociado" descripcion="Solicita al administrador que revise la asociación." accion={volver} />;
  if (id !== undefined && (!Number.isSafeInteger(id) || id <= 0)) return <EstadoVacio titulo="No encontramos esa mascota" descripcion="Vuelve al listado y selecciona una mascota válida." accion={volver} />;
  if (refugio.isPending || (id !== undefined && mascota.isPending)) return <p>Cargando información…</p>;
  if (refugio.isError || (id !== undefined && mascota.isError)) return <EstadoVacio titulo="No pudimos cargar la información" descripcion="Revisa tu conexión o el identificador de la mascota." accion={<><Boton onClick={() => { void refugio.refetch(); if (id) void mascota.refetch(); }}>Reintentar</Boton>{volver}</>} />;
  if (refugio.data?.estadoVerificacion !== EstadoVerificacion.Verificado || !refugio.data.activo) return <EstadoVacio titulo="Tu refugio necesita estar verificado" descripcion="El administrador debe verificarlo antes de publicar o gestionar mascotas." accion={volver} />;
  if (mascota.data && mascota.data.refugioId !== refugioId) return <EstadoVacio ilustracion="bloqueo" titulo="Esta mascota pertenece a otro refugio" descripcion="Solo puedes gestionar las mascotas de tu refugio." accion={volver} />;
  const asistente = !id || mascota.data?.estado === EstadoMascota.Borrador;
  const valorPaso = new URLSearchParams(ubicacion.search).get('paso');
  const paso = !id ? 1 : valorPaso === 'fotos' ? 2 : valorPaso === 'revision' ? 3 : 1;
  function irPaso(destino: number) {
    if (!id || multimediaPendiente) return;
    navegar(`/mascotas/${id}/editar?paso=${destino === 1 ? 'informacion' : destino === 2 ? 'fotos' : 'revision'}`);
    window.scrollTo({ top: 0 });
  }
  return <>
    <Encabezado titulo={asistente ? (mascota.data ? `Publicar a ${mascota.data.nombre}` : 'Publicar mascota') : `Editar a ${mascota.data?.nombre ?? 'tu mascota'}`} resumen={asistente ? 'Completa los pasos y revisa la ficha antes de publicarla.' : 'Actualiza su información y sus fotos.'} acciones={volver} />
    {ubicacion.state?.mensaje && <p role="status" className="mascotas-mensaje">{ubicacion.state.mensaje}</p>}
    {asistente && <PasosPublicacion paso={paso} bloqueado={multimediaPendiente} alCambiar={irPaso} />}
    {(!asistente || paso === 1) && <FormularioMascota key={id ?? 'nueva'} mascota={mascota.data} asistente={asistente}
      alContinuar={guardada => { navegar(`/mascotas/${guardada.id}/editar?paso=fotos`, { replace: !id }); window.scrollTo({ top: 0 }); }} />}
    {mascota.data && (!asistente || paso === 2) && <>
      {asistente && <p className="publicacion-aviso">La ficha sigue en borrador. Puedes añadir fotos y videos o continuar sin archivos por ahora.</p>}
      <GestionMultimedia mascota={mascota.data} enfocar={!asistente && ubicacion.hash === '#multimedia'} alCambiarActividad={setMultimediaPendiente} />
      {asistente && <><div className="publicacion-navegacion"><Boton disabled={multimediaPendiente} onClick={() => irPaso(1)}>← Anterior</Boton><Boton variante="primario" disabled={multimediaPendiente} onClick={() => irPaso(3)}>Continuar a revisión →</Boton></div>{multimediaPendiente && <p role="status" className="mascota-ayuda">Carga o descarta los archivos seleccionados y termina la operación antes de cambiar de paso.</p>}</>}
    </>}
    {asistente && paso === 3 && mascota.data && <RevisionPublicacion mascota={mascota.data} alVolver={irPaso} alCambiarActividad={setMultimediaPendiente} />}

  </>;
}

function FormularioMascota({ mascota, asistente, alContinuar }: { mascota?: Mascota; asistente: boolean; alContinuar: (guardada: Mascota) => void }) {
  const navegar = useNavigate();
  const [datos, setDatos] = useState<CrearMascotaDto>(() => mascota ? {
    nombre: mascota.nombre, especieId: mascota.especieId, razaId: mascota.razaId ?? undefined,
    tamanoId: mascota.tamanoId, colorId: mascota.colorId, sexo: mascota.sexo,
    edadAproximada: mascota.edadAproximada ?? undefined, descripcion: mascota.descripcion ?? '',
    esterilizada: mascota.esterilizada, procedencia: mascota.procedencia, fechaIngreso: mascota.fechaIngreso.slice(0, 10),
    temperamentoIds: mascota.temperamentos.map(t => t.id),
  } : { nombre: '', especieId: 0, tamanoId: 0, colorId: 0, sexo: Sexo.Macho, esterilizada: false,
    procedencia: Procedencia.Rescate, fechaIngreso: new Date().toLocaleDateString('sv-SE'), temperamentoIds: [] });
  const [errores, setErrores] = useState<Record<string, string>>({});
  const especies = usarEspecies(); const razas = usarRazas(datos.especieId || undefined);
  const tamanos = usarTamanos(); const colores = usarColores(); const temperamentos = usarTemperamentos();
  const crear = usarCrearBorradorMascota(); const editar = usarEditarMascota(mascota?.id ?? 0);
  const guardar = mascota ? editar : crear;
  const catalogos = [especies, tamanos, colores, temperamentos, ...(datos.especieId ? [razas] : [])];
  const requeridos = [{ consulta: especies, valor: datos.especieId }, { consulta: tamanos, valor: datos.tamanoId }, { consulta: colores, valor: datos.colorId }];
  const catalogosListos = catalogos.every(c => c.isSuccess) && requeridos.every(({ consulta, valor }) => opcionesElegibles(consulta.data, valor).length > 0);
  function cambiar<K extends keyof CrearMascotaDto>(campo: K, valor: CrearMascotaDto[K]) {
    setDatos(anterior => ({ ...anterior, [campo]: valor, ...(campo === 'especieId' ? { razaId: undefined } : {}) }));
    setErrores({}); guardar.reset();
  }
  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (guardar.isPending || !catalogosListos) return;
    const nuevos = validarMascota(datos); setErrores(nuevos);
    if (!Object.keys(nuevos).length) guardar.mutate(datos, { onSuccess: guardada => asistente ? alContinuar(guardada) : navegar('/mascotas', { state: { mensaje: 'Los cambios se guardaron.' } }) });
  }
  function selector(campo: 'especieId' | 'razaId' | 'tamanoId' | 'colorId', etiqueta: string, consulta: typeof especies, requerido = true) {
    return <SelectorCatalogo id={`mascota-${campo}`} etiqueta={etiqueta} opciones={consulta.data as readonly OpcionCatalogo[] | undefined}
      valor={datos[campo] || undefined} alCambiar={valor => cambiar(campo, valor ?? (requerido ? 0 : undefined))}
      cargando={consulta.isFetching} errorCarga={consulta.isError} alReintentar={() => void consulta.refetch()}
      requerido={requerido} error={errores[campo]} textoVacio={requerido ? 'Selecciona una opción' : 'No especificar raza'}
      bloqueadoPor={campo === 'razaId' && !datos.especieId ? 'Elige primero una especie' : undefined} />;
  }
  return <div className="mascota-gestion">
    {mascota && !asistente && <GestionEstado mascota={mascota} />}
    <form className="mascota-formulario" onSubmit={enviar} noValidate>
      <fieldset disabled={guardar.isPending}>
        <legend>Información de la mascota</legend>
        <p className="mascota-ayuda">Nombre, especie, tamaño, color y fecha de ingreso son obligatorios. La edad se expresa en años y puede incluir decimales.</p>
        <div className="mascota-formulario__grid">
          <Campo id="mascota-nombre" etiqueta="Nombre" valor={datos.nombre} alCambiar={v => cambiar('nombre', v)} requerido error={errores.nombre} />
          {selector('especieId', 'Especie', especies)}
          {selector('razaId', 'Raza (opcional)', razas, false)}
          {selector('tamanoId', 'Tamaño', tamanos)}
          {selector('colorId', 'Color', colores)}
          <label className="campo"><span className="campo__etiqueta">Sexo</span><select className="campo__control" value={datos.sexo} onChange={e => cambiar('sexo', Number(e.target.value) as Sexo)}><option value={Sexo.Macho}>Macho</option><option value={Sexo.Hembra}>Hembra</option></select></label>
          <Campo id="mascota-edad" etiqueta="Edad aproximada en años (opcional)" tipo="number" valor={datos.edadAproximada?.toString() ?? ''} alCambiar={v => cambiar('edadAproximada', v === '' ? undefined : Number(v))} error={errores.edadAproximada} />
          <Calendario id="mascota-ingreso" etiqueta="Fecha de ingreso" valor={datos.fechaIngreso} alCambiar={v => cambiar('fechaIngreso', v)} error={errores.fechaIngreso} />
          <label className="campo"><span className="campo__etiqueta">Procedencia</span><select className="campo__control" value={datos.procedencia} onChange={e => cambiar('procedencia', Number(e.target.value) as Procedencia)}><option value={Procedencia.Rescate}>Rescate</option><option value={Procedencia.EntregaVoluntaria}>Entrega voluntaria</option><option value={Procedencia.ReporteCiudadano}>Reporte ciudadano</option></select></label>
        </div>
        <label className="mascota-opcion"><input type="checkbox" checked={datos.esterilizada} onChange={e => cambiar('esterilizada', e.target.checked)} /> Está esterilizad@</label>
        <label className="campo"><span className="campo__etiqueta">Descripción (opcional)</span><textarea className="campo__control" rows={4} value={datos.descripcion ?? ''} onChange={e => cambiar('descripcion', e.target.value)} placeholder="Cuéntanos cómo es y qué necesita en su nuevo hogar" /></label>
        <fieldset className="mascota-temperamentos"><legend>Temperamentos (opcional)</legend>
          {temperamentos.isPending ? <p>Cargando temperamentos…</p> : temperamentos.isError ? <Boton onClick={() => void temperamentos.refetch()}>Reintentar temperamentos</Boton>
            : <div className="mascota-temperamentos__opciones">{temperamentos.data?.filter(t => t.activo || datos.temperamentoIds.includes(t.id)).map(t => <label className="mascota-opcion" key={t.id}><input type="checkbox" disabled={!t.activo} checked={datos.temperamentoIds.includes(t.id)} onChange={e => cambiar('temperamentoIds', e.target.checked ? [...datos.temperamentoIds, t.id] : datos.temperamentoIds.filter(id => id !== t.id))} />{t.nombre}{!t.activo ? ' (dado de baja)' : ''}</label>)}</div>}
          {temperamentos.isSuccess && !temperamentos.data.length && <p>No hay temperamentos disponibles.</p>}
        </fieldset>
        {!catalogosListos && <p className="mascota-ayuda">Espera a que carguen los catálogos. Si no hay especies, tamaños o colores, el administrador debe configurarlos antes de publicar.</p>}
        {Object.keys(errores).length > 0 && <p role="alert" className="campo__error">Revisa los campos indicados antes de guardar.</p>}
        {guardar.isError && <p role="alert" className="campo__error">{errorTexto(guardar.error)}</p>}
        <div className="mascota-acciones"><Boton variante="primario" tipo="submit" cargando={guardar.isPending} disabled={!catalogosListos}>{asistente ? 'Guardar y continuar →' : 'Guardar cambios'}</Boton><Link className="boton boton--secundario mascota-enlace" to="/mascotas">{asistente && mascota ? 'Salir y conservar borrador' : 'Cancelar'}</Link></div>
      </fieldset>
    </form>
  </div>;
}

function GestionEstado({ mascota }: { mascota: Mascota }) {
  const [destino, setDestino] = useState<EstadoMascota>();
  const [motivo, setMotivo] = useState('');
  const cambiar = usarCambiarEstadoMascota(mascota.id);
  const baja = destino === EstadoMascota.NoDisponible;
  const cerrar = () => { setDestino(undefined); setMotivo(''); cambiar.reset(); };
  return <section className="mascota-estado" aria-label="Estado de publicación">
    <div className="mascota-estado__informacion"><span className="mascota-estado__icono" aria-hidden="true">{mascota.estado === EstadoMascota.Adoptada ? '♡' : mascota.estado === EstadoMascota.NoDisponible ? 'Ⅱ' : mascota.estado === EstadoMascota.EnProceso ? '…' : '✓'}</span><div><h2>Estado de la publicación</h2><div className="mascota-estado__resumen"><Insignia estado={ESTADO_MASCOTA[mascota.estado]} /><p>{mascota.estado === EstadoMascota.Disponible ? 'Disponible para encontrar un hogar.' : mascota.estado === EstadoMascota.NoDisponible ? 'Publicación desactivada temporalmente.' : mascota.estado === EstadoMascota.Adoptada ? 'Ya encontró un hogar. La adopción está finalizada.' : 'Tiene un proceso de adopción en curso.'}</p></div>{mascota.motivoBaja && <p className="mascota-estado__motivo">Motivo: {mascota.motivoBaja}</p>}{!estadosManualesMascota(mascota.estado).length && <p className="mascota-estado__nota">El estado se gestiona desde la solicitud de adopción.</p>}</div></div>
    {estadosManualesMascota(mascota.estado).map(estado => <Boton key={estado} variante="secundario" onClick={() => { cambiar.reset(); setDestino(estado); }}>{estado === EstadoMascota.NoDisponible ? 'Desactivar publicación' : 'Reactivar publicación'}</Boton>)}
    {destino !== undefined && <Modal titulo={baja ? `Desactivar publicación de ${mascota.nombre}` : `Reactivar publicación de ${mascota.nombre}`} alCerrar={cerrar} ocupado={cambiar.isPending} compacto>
      <form onSubmit={e => { e.preventDefault(); if (!cambiar.isPending && (!baja || motivo.trim())) cambiar.mutate({ nuevoEstado: destino, motivo }, { onSuccess: cerrar }); }}>
        <p>{baja ? 'La publicación pasará a No disponible. Puedes reactivarla después y sus datos se conservarán.' : 'Volverá a estar disponible para adopción.'}</p>
        {baja && <Campo id="motivo-desactivacion" etiqueta="Motivo de la desactivación" valor={motivo} alCambiar={setMotivo} requerido />}
        {cambiar.isError && <p role="alert" className="campo__error">{errorTexto(cambiar.error)}</p>}
        <div className="mascota-acciones"><Boton variante="primario" tipo="submit" cargando={cambiar.isPending} disabled={baja && !motivo.trim()}>Confirmar</Boton><Boton disabled={cambiar.isPending} onClick={cerrar}>Cancelar</Boton></div>
      </form>
    </Modal>}
  </section>;
}
