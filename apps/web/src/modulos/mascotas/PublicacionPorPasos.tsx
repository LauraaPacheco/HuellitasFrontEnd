import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, TipoMultimedia, ETIQUETA_SEXO, ETIQUETA_PROCEDENCIA, type Mascota } from '@huellitas/shared';
import { usarEspecies, usarRazas, usarTamanos, usarColores } from '@/casos/catalogos';
import { clavesMascotas } from '@/casos/mascotas';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import './publicacion.css';

const pasos = ['Información', 'Fotos y videos', 'Revisión'];
export function PasosPublicacion({ paso, alCambiar, bloqueado }: { paso: number; alCambiar: (paso: number) => void; bloqueado: boolean }) {
  return <div className="publicacion-progreso"><div className="publicacion-progreso__resumen"><strong>Paso {paso} de 3</strong><span>{paso < 3 ? (paso === 1 ? 'Faltan 2 pasos' : 'Falta 1 paso') : 'Todo listo para revisar'}</span></div>
    <nav aria-label="Pasos para publicar"><ol className="publicacion-pasos">{pasos.map((nombre, i) => <li key={nombre} className={i + 1 === paso ? 'publicacion-paso--actual' : i + 1 < paso ? 'publicacion-paso--completo' : ''}><button type="button" aria-current={paso === i + 1 ? 'step' : undefined} disabled={i + 1 >= paso || bloqueado} onClick={() => alCambiar(i + 1)}><span className="publicacion-pasos__numero" aria-hidden="true">{i + 1 < paso ? '✓' : i + 1}</span><span>{nombre}</span></button></li>)}</ol></nav>
  </div>;
}

export function RevisionPublicacion({ mascota, alVolver, alCambiarActividad }: { mascota: Mascota; alVolver: (paso: number) => void; alCambiarActividad: (pendiente: boolean) => void }) {
  const navegar = useNavigate(); const cliente = useQueryClient(); const enviando = useRef(false);
  const especies = usarEspecies(); const razas = usarRazas(mascota.especieId); const tamanos = usarTamanos(); const colores = usarColores();
  const catalogos = [especies, razas, tamanos, colores];
  const cargando = catalogos.some(c => c.isPending); const errorCatalogos = catalogos.some(c => c.isError);
  const archivos = mascota.multimedia.filter(a => a.activo);
  const fotos = archivos.filter(a => a.tipo === TipoMultimedia.Foto).length;
  const videos = archivos.filter(a => a.tipo === TipoMultimedia.Video).length;
  const foto = archivos.find(a => a.esPrincipal && a.tipo === TipoMultimedia.Foto);
  const publicar = useMutation({ mutationFn: () => api.mascotas.publicar(mascota.id), onSuccess: async () => {
    await cliente.invalidateQueries({ queryKey: clavesMascotas.todo });
    navegar('/mascotas', { replace: true, state: { mensaje: `${mascota.nombre} se publicó correctamente y ya está disponible.` } });
  } });
  useEffect(() => { alCambiarActividad(publicar.isPending); }, [publicar.isPending, alCambiarActividad]);
  useEffect(() => () => alCambiarActividad(false), [alCambiarActividad]);
  function confirmar() {
    if (enviando.current || cargando || errorCatalogos) return;
    enviando.current = true; publicar.mutate(undefined, { onSettled: () => { enviando.current = false; } });
  }
  return <section className="publicacion-revision" aria-labelledby="titulo-revision">
    <header className="publicacion-revision__cabecera"><div><h2 id="titulo-revision">Revisa su publicación</h2><p>Verifica que la información de {mascota.nombre} esté correcta antes de compartirla.</p></div><span className="insignia insignia--neutro">Borrador</span></header>
    {cargando ? <p role="status">Cargando los datos para la revisión…</p> : errorCatalogos ? <p role="alert">No pudimos cargar los catálogos. <Boton onClick={() => catalogos.forEach(c => void c.refetch())}>Reintentar</Boton></p> : <>
      <div className="publicacion-revision__contenido">{foto && <img className="publicacion-revision__foto" src={foto.archivo} alt={`Foto principal de ${mascota.nombre}`} />}
        <dl className="publicacion-datos">
          <div><dt>Nombre</dt><dd>{mascota.nombre}</dd></div><div><dt>Especie y raza</dt><dd>{especies.data?.find(e => e.id === mascota.especieId)?.nombre ?? 'Sin dato'} · {razas.data?.find(r => r.id === mascota.razaId)?.nombre ?? 'No especificada'}</dd></div>
          <div><dt>Tamaño y color</dt><dd>{tamanos.data?.find(t => t.id === mascota.tamanoId)?.nombre ?? 'Sin dato'} · {colores.data?.find(c => c.id === mascota.colorId)?.nombre ?? 'Sin dato'}</dd></div>
          <div><dt>Sexo y edad</dt><dd>{ETIQUETA_SEXO[mascota.sexo]} · {mascota.edadAproximada === null ? 'Edad no especificada' : `${mascota.edadAproximada} ${mascota.edadAproximada === 1 ? 'año' : 'años'}`}</dd></div>
          <div><dt>Esterilizad@</dt><dd>{mascota.esterilizada ? 'Sí' : 'No'}</dd></div><div><dt>Fecha de ingreso</dt><dd>{new Date(`${mascota.fechaIngreso.slice(0,10)}T12:00:00`).toLocaleDateString('es-CO')}</dd></div>
          <div><dt>Procedencia</dt><dd>{ETIQUETA_PROCEDENCIA[mascota.procedencia]}</dd></div><div><dt>Temperamentos</dt><dd>{mascota.temperamentos.map(t => t.nombre).join(', ') || 'Sin especificar'}</dd></div>
        </dl>
      </div>
      <h3>Sobre {mascota.nombre}</h3><p className="publicacion-descripcion">{mascota.descripcion || 'Sin descripción todavía.'}</p>
      <div className="publicacion-revision__archivos"><strong>{fotos} {fotos === 1 ? 'foto' : 'fotos'} · {videos} {videos === 1 ? 'video' : 'videos'}</strong><Boton disabled={publicar.isPending} onClick={() => alVolver(2)}>Revisar fotos y videos</Boton></div>
      {!foto && <p className="publicacion-aviso">No has añadido una foto. Puedes volver a Fotos y videos para agregarla o publicar la ficha sin portada por ahora.</p>}
      <p className="publicacion-aviso">Al confirmar, la ficha dejará de ser borrador y pasará a Disponible.</p>
    </>}
    {publicar.isError && <p className="campo__error" role="alert">{publicar.error instanceof ErrorHttp ? publicar.error.detalle ?? publicar.error.message : publicar.error.message}</p>}
    <div className="publicacion-navegacion"><Boton disabled={publicar.isPending} onClick={() => alVolver(2)}>← Anterior</Boton><Boton disabled={publicar.isPending} onClick={() => alVolver(1)}>Editar información</Boton><Boton variante="primario" cargando={publicar.isPending} disabled={cargando || errorCatalogos} onClick={confirmar}>Publicar mascota</Boton></div>
  </section>;
}
