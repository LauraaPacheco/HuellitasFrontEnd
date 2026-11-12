import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, ETIQUETA_SEXO, type CrearMascotaDto } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { FormularioMascota } from './FormularioMascota';
import { FichaGestion } from './FichaGestion';
import { SubirFotos } from './SubirFotos';
import { FotosPorUrl } from './FotosPorUrl';
import { PasosPublicacion } from './PublicacionPorPasos';
import { usarEspecies, usarRazas, usarTamanos, usarColores } from '@/casos/catalogos';
import { clavesMascotas } from '@/casos/mascotas';
const errorTexto = (e: Error) => e instanceof ErrorHttp ? e.detalle ?? e.message : e.message;
const volver = <Link to="/mascotas" className="boton boton--secundario">← Volver a mascotas</Link>;

export function PaginaMascotaReal() {
  const { id } = useParams();
  return id ? <FichaGestion id={Number(id)} /> : <NuevaMascotaReal />;
}
function NuevaMascotaReal() {
  const [subiendo, setSubiendo] = useState(false);
  const [paso, setPaso] = useState(1); const [datos, setDatos] = useState<CrearMascotaDto>();
  const navegar = useNavigate(); const cache = useQueryClient();
  const especies = usarEspecies(); const razas = usarRazas(datos?.especieId); const tamanos = usarTamanos(); const colores = usarColores();
  const publicar = useMutation({ mutationFn: () => api.mascotas.registrar(datos!), onSuccess: async () => { await cache.invalidateQueries({queryKey: clavesMascotas.todo}); navegar('/mascotas', { replace: true, state: { mensaje: `${datos?.nombre} se registró correctamente y está disponible.` } }); } });
  function cambiar(p: number) { if (!publicar.isPending && !subiendo) { setPaso(p); window.scrollTo({top:0}); } }
  return <><Encabezado titulo="Publicar mascota" resumen="Revisa la ficha antes de confirmar su publicación." acciones={volver} />
    <PasosPublicacion paso={paso} alCambiar={cambiar} bloqueado={publicar.isPending || subiendo} />
    {paso === 1 && <FormularioMascota modoReal asistente datosIniciales={datos} alGuardarLocal={d => {setDatos(previo => ({ ...d, fotosUrls: previo?.fotosUrls })); cambiar(2);}} />}
    {paso === 2 && datos && <section className="publicacion-revision"><h2>Fotos</h2><p>Sube imágenes desde tu equipo o agrega enlaces públicos. Los videos aún no están disponibles.</p><SubirFotos fotos={datos.fotosUrls ?? []} alActividad={setSubiendo} alCambiar={fotosUrls => setDatos({ ...datos, fotosUrls })} /><FotosPorUrl deshabilitado={subiendo} fotos={datos.fotosUrls ?? []} alCambiar={fotosUrls => setDatos({ ...datos, fotosUrls })} /><p className="publicacion-aviso">Tu información se conserva mientras recorres estos pasos. Todavía no se ha publicado ni guardado un borrador en el servidor.</p><div className="publicacion-navegacion"><Boton disabled={subiendo} onClick={() => cambiar(1)}>← Anterior</Boton><Boton disabled={subiendo} variante="primario" onClick={() => cambiar(3)}>Continuar a revisión →</Boton></div></section>}
    {paso === 3 && datos && <section className="publicacion-revision"><h2>Revisa su publicación</h2><dl className="publicacion-datos">
      <div><dt>Nombre</dt><dd>{datos.nombre}</dd></div><div><dt>Especie y raza</dt><dd>{especies.data?.find(e=>e.id===datos.especieId)?.nombre} · {razas.data?.find(e=>e.id===datos.razaId)?.nombre ?? 'Sin raza definida'}</dd></div>
      <div><dt>Tamaño y color</dt><dd>{tamanos.data?.find(e=>e.id===datos.tamanoId)?.nombre} · {colores.data?.find(e=>e.id===datos.colorId)?.nombre}</dd></div><div><dt>Sexo y edad</dt><dd>{ETIQUETA_SEXO[datos.sexo]} · {datos.edadAproximada === undefined ? 'Edad no especificada' : `${datos.edadAproximada} años`}</dd></div><div><dt>Esterilizad@</dt><dd>{datos.esterilizada?'Sí':'No'}</dd></div>
    </dl><p>{datos.descripcion || 'Sin descripción.'}</p>
    {(datos.fotosUrls ?? []).length > 0 ? <ul className="multimedia__rejilla" aria-label="Fotos de la publicación">{datos.fotosUrls!.map((foto, i) => <li key={foto} className="multimedia__tarjeta"><div className="multimedia__vista"><img src={foto} alt={`Foto ${i + 1} de ${datos.nombre}`} referrerPolicy="no-referrer" /></div><div className="multimedia__detalle"><p>{i === 0 ? <strong>Foto principal</strong> : `Foto ${i + 1}`}</p></div></li>)}</ul> : <p className="multimedia__vacio">Se publicará sin fotos.</p>}
    <p className="publicacion-aviso">Al confirmar se registrará como Disponible. La fecha de ingreso se asigna automáticamente. Los datos aún no enviados se perderán si sales o recargas.</p>{publicar.isError && <p role="alert" className="campo__error">{errorTexto(publicar.error)}</p>}<div className="publicacion-navegacion"><Boton disabled={publicar.isPending} onClick={()=>cambiar(2)}>← Anterior</Boton><Boton variante="primario" cargando={publicar.isPending} onClick={()=>publicar.mutate()}>Publicar mascota</Boton></div></section>}
  </>;
}
