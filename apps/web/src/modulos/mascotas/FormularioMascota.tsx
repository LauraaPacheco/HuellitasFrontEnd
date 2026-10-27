import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ErrorHttp, EstadoMascota, ESTADO_MASCOTA, Procedencia, Sexo, validarMascota, estadosManualesMascota, type CrearMascotaDto, type Mascota, type OpcionCatalogo } from '@huellitas/shared';
import { usarCrearBorradorMascota, usarEditarMascota, usarCambiarEstadoMascota } from '@/casos/mascotas';
import { usarEspecies, usarRazas, usarTamanos, usarColores, usarTemperamentos, opcionesElegibles } from '@/casos/catalogos';
import { Calendario } from '@/componentes/ui/Calendario/Calendario';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import { SelectorCatalogo } from '@/componentes/ui/SelectorCatalogo';
import { Insignia } from '@/componentes/ui/Insignia';
import { Modal } from '@/componentes/ui/Modal/Modal';
import './mascotas.css';
const errorTexto = (error: Error) => error instanceof ErrorHttp ? error.detalle ?? error.message : error.message;

export function FormularioMascota({ mascota, asistente, alContinuar, modoReal = false, datosIniciales, alGuardarLocal }: { mascota?: Mascota; asistente: boolean; alContinuar?: (guardada: Mascota) => void; modoReal?: boolean; datosIniciales?: CrearMascotaDto; alGuardarLocal?: (datos: CrearMascotaDto) => void }) {
  const navegar = useNavigate();
  const [datos, setDatos] = useState<CrearMascotaDto>(() => datosIniciales ?? (mascota ? {
    nombre: mascota.nombre, especieId: mascota.especieId, razaId: mascota.razaId ?? undefined,
    tamanoId: mascota.tamanoId, colorId: mascota.colorId, sexo: mascota.sexo,
    edadAproximada: mascota.edadAproximada ?? undefined, descripcion: mascota.descripcion ?? '',
    esterilizada: mascota.esterilizada, procedencia: mascota.procedencia, fechaIngreso: mascota.fechaIngreso.slice(0, 10),
    temperamentoIds: mascota.temperamentos.map(t => t.id),
  } : { nombre: '', especieId: 0, tamanoId: 0, colorId: 0, sexo: Sexo.Macho, esterilizada: false,
    procedencia: Procedencia.Rescate, fechaIngreso: new Date().toLocaleDateString('sv-SE'), temperamentoIds: [] }));
  const [errores, setErrores] = useState<Record<string, string>>({});
  const especies = usarEspecies(); const razas = usarRazas(datos.especieId || undefined);
  const tamanos = usarTamanos(); const colores = usarColores(); const temperamentos = usarTemperamentos();
  const crear = usarCrearBorradorMascota(); const editar = usarEditarMascota(mascota?.id ?? 0);
  const guardar = mascota ? editar : crear;
  const catalogos = [especies, tamanos, colores, ...(!modoReal ? [temperamentos] : []), ...(datos.especieId ? [razas] : [])];
  const requeridos = [{ consulta: especies, valor: datos.especieId }, { consulta: tamanos, valor: datos.tamanoId }, { consulta: colores, valor: datos.colorId }];
  const catalogosListos = catalogos.every(c => c.isSuccess) && requeridos.every(({ consulta, valor }) => opcionesElegibles(consulta.data, valor).length > 0);
  function cambiar<K extends keyof CrearMascotaDto>(campo: K, valor: CrearMascotaDto[K]) {
    setDatos(anterior => ({ ...anterior, [campo]: valor, ...(campo === 'especieId' ? { razaId: undefined } : {}) }));
    setErrores({}); guardar.reset();
  }
  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (guardar.isPending || !catalogosListos) return;
    const nuevos = validarMascota(datos);
    if (modoReal && datos.edadAproximada !== undefined && (!Number.isInteger(datos.edadAproximada) || datos.edadAproximada > 255)) nuevos.edadAproximada = 'Indica un número entero entre 0 y 255 años.';
    setErrores(nuevos);
    if (!Object.keys(nuevos).length && alGuardarLocal) { alGuardarLocal(datos); return; }
    if (!Object.keys(nuevos).length) guardar.mutate(datos, { onSuccess: guardada => asistente ? alContinuar?.(guardada) : navegar('/mascotas', { state: { mensaje: 'Los cambios se guardaron.' } }) });
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
        <p className="mascota-ayuda">{modoReal ? 'Completa nombre, especie, tamaño y color. La edad se expresa en años enteros.' : 'Nombre, especie, tamaño, color y fecha de ingreso son obligatorios. La edad se expresa en años y puede incluir decimales.'}</p>
        <div className="mascota-formulario__grid">
          <Campo id="mascota-nombre" etiqueta="Nombre" valor={datos.nombre} alCambiar={v => cambiar('nombre', v)} requerido error={errores.nombre} />
          {selector('especieId', 'Especie', especies)}
          {selector('razaId', 'Raza (opcional)', razas, false)}
          {selector('tamanoId', 'Tamaño', tamanos)}
          {selector('colorId', 'Color', colores)}
          <label className="campo"><span className="campo__etiqueta">Sexo</span><select className="campo__control" value={datos.sexo} onChange={e => cambiar('sexo', Number(e.target.value) as Sexo)}><option value={Sexo.Macho}>Macho</option><option value={Sexo.Hembra}>Hembra</option></select></label>
          <Campo id="mascota-edad" etiqueta="Edad aproximada en años (opcional)" tipo="number" valor={datos.edadAproximada?.toString() ?? ''} alCambiar={v => cambiar('edadAproximada', v === '' ? undefined : Number(v))} error={errores.edadAproximada} />
          {!modoReal && <Calendario id="mascota-ingreso" etiqueta="Fecha de ingreso" valor={datos.fechaIngreso} alCambiar={v => cambiar('fechaIngreso', v)} error={errores.fechaIngreso} />}
          <label className="campo"><span className="campo__etiqueta">Procedencia</span><select className="campo__control" value={datos.procedencia} onChange={e => cambiar('procedencia', Number(e.target.value) as Procedencia)}><option value={Procedencia.Rescate}>Rescate</option><option value={Procedencia.EntregaVoluntaria}>Entrega voluntaria</option><option value={Procedencia.ReporteCiudadano}>Reporte ciudadano</option></select></label>
        </div>
        <label className="mascota-opcion"><input type="checkbox" checked={datos.esterilizada} onChange={e => cambiar('esterilizada', e.target.checked)} /> Está esterilizad@</label>
        <label className="campo"><span className="campo__etiqueta">Descripción (opcional)</span><textarea className="campo__control" rows={4} value={datos.descripcion ?? ''} onChange={e => cambiar('descripcion', e.target.value)} placeholder="Cuéntanos cómo es y qué necesita en su nuevo hogar" /></label>
        {!modoReal && <fieldset className="mascota-temperamentos"><legend>Temperamentos (opcional)</legend>
          {temperamentos.isPending ? <p>Cargando temperamentos…</p> : temperamentos.isError ? <Boton onClick={() => void temperamentos.refetch()}>Reintentar temperamentos</Boton>
            : <div className="mascota-temperamentos__opciones">{temperamentos.data?.filter(t => t.activo || datos.temperamentoIds.includes(t.id)).map(t => <label className="mascota-opcion" key={t.id}><input type="checkbox" disabled={!t.activo} checked={datos.temperamentoIds.includes(t.id)} onChange={e => cambiar('temperamentoIds', e.target.checked ? [...datos.temperamentoIds, t.id] : datos.temperamentoIds.filter(id => id !== t.id))} />{t.nombre}{!t.activo ? ' (dado de baja)' : ''}</label>)}</div>}
          {temperamentos.isSuccess && !temperamentos.data.length && <p>No hay temperamentos disponibles.</p>}
        </fieldset>}
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
