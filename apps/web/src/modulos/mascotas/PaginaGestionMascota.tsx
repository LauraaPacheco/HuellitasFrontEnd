import { FormularioMascota } from './FormularioMascota';
import { MODO_DEMO } from '@/lib/api';
import { PaginaMascotaReal } from './PaginaMascotaReal';
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

export function PaginaGestionMascota() { return MODO_DEMO ? <PaginaGestionMascotaDemo /> : <PaginaMascotaReal />; }

function PaginaGestionMascotaDemo() {
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
