import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, EstadoMascota, ESTADO_MASCOTA, ETIQUETA_SEXO, type CrearMascotaDto } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { FormularioMascota } from './FormularioMascota';
import { FotosPorUrl } from './FotosPorUrl';
import { PasosPublicacion } from './PublicacionPorPasos';
import { usarEspecies, usarRazas, usarTamanos, usarColores } from '@/casos/catalogos';
import { clavesMascotas } from '@/casos/mascotas';
const errorTexto = (e: Error) => e instanceof ErrorHttp ? e.detalle ?? e.message : e.message;
const volver = <Link to="/mascotas" className="boton boton--secundario">← Volver a mascotas</Link>;

export function PaginaMascotaReal() {
  const { id } = useParams();
  return id ? <FichaReal id={Number(id)} /> : <NuevaMascotaReal />;
}
function NuevaMascotaReal() {
  const [paso, setPaso] = useState(1); const [datos, setDatos] = useState<CrearMascotaDto>();
  const navegar = useNavigate(); const cache = useQueryClient();
  const especies = usarEspecies(); const razas = usarRazas(datos?.especieId); const tamanos = usarTamanos(); const colores = usarColores();
  const publicar = useMutation({ mutationFn: () => api.mascotas.registrar(datos!), onSuccess: async () => { await cache.invalidateQueries({queryKey: clavesMascotas.todo}); navegar('/mascotas', { replace: true, state: { mensaje: `${datos?.nombre} se registró correctamente y está disponible.` } }); } });
  function cambiar(p: number) { if (!publicar.isPending) { setPaso(p); window.scrollTo({top:0}); } }
  return <><Encabezado titulo="Publicar mascota" resumen="Revisa la ficha antes de confirmar su publicación." acciones={volver} />
    <PasosPublicacion paso={paso} alCambiar={cambiar} bloqueado={publicar.isPending} />
    {paso === 1 && <FormularioMascota modoReal asistente datosIniciales={datos} alGuardarLocal={d => {setDatos(previo => ({ ...d, fotosUrls: previo?.fotosUrls })); cambiar(2);}} />}
    {paso === 2 && datos && <section className="publicacion-revision"><h2>Fotos</h2><p>Por ahora las fotos se agregan con su enlace público. La subida de archivos y los videos llegarán cuando el servidor los reciba.</p><FotosPorUrl fotos={datos.fotosUrls ?? []} alCambiar={fotosUrls => setDatos({ ...datos, fotosUrls })} /><p className="publicacion-aviso">Tu información se conserva mientras recorres estos pasos. Todavía no se ha publicado ni guardado un borrador en el servidor.</p><div className="publicacion-navegacion"><Boton onClick={() => cambiar(1)}>← Anterior</Boton><Boton variante="primario" onClick={() => cambiar(3)}>Continuar a revisión →</Boton></div></section>}
    {paso === 3 && datos && <section className="publicacion-revision"><h2>Revisa su publicación</h2><dl className="publicacion-datos">
      <div><dt>Nombre</dt><dd>{datos.nombre}</dd></div><div><dt>Especie y raza</dt><dd>{especies.data?.find(e=>e.id===datos.especieId)?.nombre} · {razas.data?.find(e=>e.id===datos.razaId)?.nombre ?? 'Sin raza definida'}</dd></div>
      <div><dt>Tamaño y color</dt><dd>{tamanos.data?.find(e=>e.id===datos.tamanoId)?.nombre} · {colores.data?.find(e=>e.id===datos.colorId)?.nombre}</dd></div><div><dt>Sexo y edad</dt><dd>{ETIQUETA_SEXO[datos.sexo]} · {datos.edadAproximada === undefined ? 'Edad no especificada' : `${datos.edadAproximada} años`}</dd></div><div><dt>Esterilizad@</dt><dd>{datos.esterilizada?'Sí':'No'}</dd></div>
    </dl><p>{datos.descripcion || 'Sin descripción.'}</p>
    {(datos.fotosUrls ?? []).length > 0 ? <ul className="multimedia__rejilla" aria-label="Fotos de la publicación">{datos.fotosUrls!.map((foto, i) => <li key={foto} className="multimedia__tarjeta"><div className="multimedia__vista"><img src={foto} alt={`Foto ${i + 1} de ${datos.nombre}`} referrerPolicy="no-referrer" /></div><div className="multimedia__detalle"><p>{i === 0 ? <strong>Foto principal</strong> : `Foto ${i + 1}`}</p></div></li>)}</ul> : <p className="multimedia__vacio">Se publicará sin fotos.</p>}
    <p className="publicacion-aviso">Al confirmar se registrará como Disponible. La fecha de ingreso se asigna automáticamente. Los datos aún no enviados se perderán si sales o recargas.</p>{publicar.isError && <p role="alert" className="campo__error">{errorTexto(publicar.error)}</p>}<div className="publicacion-navegacion"><Boton disabled={publicar.isPending} onClick={()=>cambiar(2)}>← Anterior</Boton><Boton variante="primario" cargando={publicar.isPending} onClick={()=>publicar.mutate()}>Publicar mascota</Boton></div></section>}
  </>;
}
function FichaReal({id}:{id:number}) {
  const cache = useQueryClient(); const [estado,setEstado]=useState<EstadoMascota>(); const [motivo,setMotivo]=useState('');
  const ficha=useQuery({queryKey:['ficha-real',id], queryFn:()=>api.mascotas.obtenerFicha(id),enabled:Number.isSafeInteger(id)&&id>0,retry:false});
  const cambio=useMutation({mutationFn:()=>api.mascotas.cambiarEstado(id,{nuevoEstado:estado!,motivo}),onSuccess:async()=>{await ficha.refetch();await cache.invalidateQueries({queryKey:clavesMascotas.todo});setEstado(undefined);setMotivo('');}});
  return <><Encabezado titulo={ficha.data?.nombre ?? 'Ficha de mascota'} acciones={volver} />
    {!Number.isSafeInteger(id)||id<=0 ? <p>El identificador de la mascota no es válido.</p> : ficha.isPending ? <p>Cargando ficha…</p> : ficha.isError ? <p role="alert">No pudimos consultar la ficha. <Boton onClick={()=>void ficha.refetch()}>Reintentar</Boton></p> : ficha.data && <section className="publicacion-revision"><Insignia estado={ESTADO_MASCOTA[ficha.data.estado]} /><p>{ficha.data.especie} · {ficha.data.raza ?? 'Sin raza definida'} · {ETIQUETA_SEXO[ficha.data.sexo]}</p><p>{ficha.data.descripcion}</p><div className="multimedia__rejilla">{ficha.data.fotos.map((foto,i)=><img key={`${foto}-${i}`} src={foto} alt={`Foto ${i+1} de ${ficha.data!.nombre}`} style={{width:'100%',borderRadius:16}} />)}</div><p className="publicacion-aviso">La edición completa de esta ficha y la carga de archivos todavía no están disponibles. Puedes consultar sus datos y cambiar su disponibilidad.</p>
      {ficha.data.estado === EstadoMascota.Disponible && <Boton onClick={()=>{cambio.reset();setEstado(EstadoMascota.NoDisponible);}}>Desactivar publicación</Boton>}
      {ficha.data.estado === EstadoMascota.NoDisponible && <Boton onClick={()=>{cambio.reset();setEstado(EstadoMascota.Disponible);}}>Reactivar publicación</Boton>}
    </section>}
    {estado !== undefined && <Modal titulo={estado === EstadoMascota.NoDisponible?'Desactivar publicación':'Reactivar publicación'} compacto ocupado={cambio.isPending} alCerrar={()=>setEstado(undefined)}><p>¿Confirmas el cambio de disponibilidad?</p>{estado===EstadoMascota.NoDisponible && <label className="campo">Motivo<textarea className="campo__control" value={motivo} onChange={e=>setMotivo(e.target.value)} /></label>}{cambio.isError && <p role="alert" className="campo__error">{errorTexto(cambio.error)}</p>}<div className="publicacion-navegacion"><Boton disabled={cambio.isPending} onClick={()=>setEstado(undefined)}>Cancelar</Boton><Boton variante="primario" cargando={cambio.isPending} disabled={estado===EstadoMascota.NoDisponible&&!motivo.trim()} onClick={()=>cambio.mutate()}>Confirmar</Boton></div></Modal>}
  </>;
}
