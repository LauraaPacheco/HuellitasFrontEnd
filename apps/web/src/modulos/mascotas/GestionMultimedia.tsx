import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, MAX_ARCHIVOS_MASCOTA, TipoMultimedia, validarArchivoMascota, esFoto, type Mascota, type Multimedia } from '@huellitas/shared';
import { api } from '@/lib/api';
import { clavesMascotas } from '@/casos/mascotas';
import { Boton } from '@/componentes/ui/Boton';
import { Modal } from '@/componentes/ui/Modal/Modal';
import './multimedia.css';

const textoError = (error: unknown) => error instanceof ErrorHttp ? error.detalle ?? error.message : error instanceof Error ? error.message : 'No pudimos completar la operación.';

function VistaArchivo({ archivo, tipo, nombre }: { archivo: string; tipo: TipoMultimedia; nombre: string }) {
  const [fallo, setFallo] = useState(false);
  useEffect(() => setFallo(false), [archivo]);
  if (fallo) return <p className="multimedia__fallo" role="status">No se puede mostrar {nombre}. El formato o códec puede no ser compatible con este navegador.</p>;
  return tipo === TipoMultimedia.Foto ? <img src={archivo} alt={nombre} loading="lazy" onError={() => setFallo(true)} />
    : <video src={archivo} controls preload="metadata" playsInline aria-label={nombre} onError={() => setFallo(true)} />;
}
function VistaSeleccion({ archivo }: { archivo: File }) {
  const [url, setUrl] = useState('');
  useEffect(() => { const temporal = URL.createObjectURL(archivo); setUrl(temporal); return () => URL.revokeObjectURL(temporal); }, [archivo]);
  return url ? <VistaArchivo archivo={url} tipo={esFoto(archivo.type) ? TipoMultimedia.Foto : TipoMultimedia.Video} nombre={archivo.name} /> : null;
}

export function GestionMultimedia({ mascota, enfocar = false, alCambiarActividad }: { mascota: Mascota; enfocar?: boolean; alCambiarActividad?: (pendiente: boolean) => void }) {
  const cliente = useQueryClient();
  const entrada = useRef<HTMLInputElement>(null);
  const titulo = useRef<HTMLHeadingElement>(null);
  const [seleccion, setSeleccion] = useState<File[]>([]);
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [eliminar, setEliminar] = useState<Multimedia>();
  const guardia = useRef(false);
  const archivos = mascota.multimedia.filter(a => a.activo);
  useEffect(() => { alCambiarActividad?.(ocupado || seleccion.length > 0 || eliminar !== undefined); }, [ocupado, seleccion.length, eliminar, alCambiarActividad]);
  useEffect(() => () => alCambiarActividad?.(false), [alCambiarActividad]);
  useEffect(() => { if (enfocar) { titulo.current?.focus(); titulo.current?.scrollIntoView({ block: 'start' }); } }, [enfocar]);
  async function refrescar() { await cliente.invalidateQueries({ queryKey: clavesMascotas.todo }); }
  function elegir(lista: FileList | null) {
    const nuevos = Array.from(lista ?? []); if (!nuevos.length || ocupado) return;
    setError(''); setMensaje('');
    if (archivos.length + nuevos.length > MAX_ARCHIVOS_MASCOTA) { setError('Puedes tener hasta 10 archivos por mascota. Selecciona menos archivos.'); return; }
    for (const archivo of nuevos) { const fallo = validarArchivoMascota(archivo); if (fallo) { setError(`${archivo.name}: ${fallo}`); return; } }
    setSeleccion(nuevos);
  }
  async function cargar() {
    if (guardia.current || !seleccion.length) return;
    guardia.current = true; setOcupado(true); setError(''); setMensaje(''); let cargados = 0;
    try {
      for (const archivo of seleccion) {
        const cuerpo = new FormData(); cuerpo.append('archivo', archivo);
        await api.mascotas.subirMultimedia(mascota.id, cuerpo);
        cargados++; setSeleccion(prev => prev.filter(a => a !== archivo));
      }

    } catch (causa) { setError(`${cargados ? `Se cargaron ${cargados} archivos. ` : ''}${textoError(causa)} Los archivos pendientes se conservan para reintentar.`); }
    finally { await refrescar(); if (cargados === seleccion.length) setMensaje(`${cargados === 1 ? 'Archivo cargado' : `${cargados} archivos cargados`} correctamente.`); guardia.current = false; setOcupado(false); }
  }
  async function operar(accion: 'principal' | 'eliminar', archivo: Multimedia) {
    if (guardia.current) return;
    guardia.current = true; setOcupado(true); setError(''); setMensaje('');
    try {
      if (accion === 'principal') await api.mascotas.marcarFotoPrincipal(mascota.id, archivo.id);
      else await api.mascotas.eliminarMultimedia(mascota.id, archivo.id);
      await refrescar();
      setMensaje(accion === 'principal' ? 'Foto principal actualizada.' : 'Archivo eliminado de la galería.'); setEliminar(undefined);
    } catch (causa) { setError(textoError(causa)); }
    finally { guardia.current = false; setOcupado(false); }
  }
  return <section id="multimedia" className="multimedia" aria-labelledby="titulo-multimedia" aria-busy={ocupado}>
    <div className="multimedia__cabecera"><div><h2 id="titulo-multimedia" tabIndex={-1} ref={titulo}>Fotos y videos</h2><p>Muéstrale a su futura familia cómo es {mascota.nombre}.</p></div><span className="insignia insignia--neutro">{archivos.length} / 10 archivos</span></div>
    <p className="multimedia__ayuda" id="formatos-multimedia">Fotos JPG, PNG o WebP hasta 5 MB. Videos MP4 o WebM hasta 25 MB. La primera foto será la principal; puedes cambiarla después.</p>
    <input ref={entrada} className="visualmente-oculto" tabIndex={-1} type="file" accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" multiple aria-label="Seleccionar fotos y videos" aria-describedby="formatos-multimedia" disabled={ocupado || archivos.length >= MAX_ARCHIVOS_MASCOTA} onChange={e => { elegir(e.currentTarget.files); e.currentTarget.value = ''; }} />
    <div className="multimedia__acciones"><Boton variante="primario" disabled={ocupado || archivos.length >= MAX_ARCHIVOS_MASCOTA} onClick={() => entrada.current?.click()}>Seleccionar archivos</Boton><span className="multimedia__ayuda">{archivos.length >= MAX_ARCHIVOS_MASCOTA ? 'Elimina un archivo para añadir otro.' : 'Puedes seleccionar varios a la vez.'}</span></div>
    {seleccion.length > 0 && <div className="multimedia__pendientes"><h3>Vista previa · archivos por cargar</h3><div className="multimedia__rejilla">{seleccion.map((archivo, i) => <article className="multimedia__tarjeta" key={`${archivo.name}-${archivo.lastModified}-${i}`}><div className="multimedia__vista"><VistaSeleccion archivo={archivo} /></div><div className="multimedia__detalle"><p>{archivo.name}</p><small>{(archivo.size / (1024 * 1024)).toFixed(2)} MB · {esFoto(archivo.type) ? 'Foto' : 'Video'}</small><Boton disabled={ocupado} onClick={() => setSeleccion(prev => prev.filter((_, posicion) => posicion !== i))}>Quitar de la selección</Boton></div></article>)}</div><div className="multimedia__acciones"><Boton variante="primario" cargando={ocupado} onClick={() => void cargar()}>Cargar {seleccion.length === 1 ? 'archivo' : `${seleccion.length} archivos`}</Boton><Boton disabled={ocupado} onClick={() => setSeleccion([])}>Descartar selección</Boton></div></div>}
    {mensaje && <p className="multimedia__mensaje" role="status">{mensaje}</p>}
    {error && <p className="campo__error" role="alert">{error}</p>}
    {!archivos.length ? <p className="multimedia__vacio">Todavía no tiene fotos ni videos. Selecciona un archivo para empezar.</p> : <div className="multimedia__rejilla">{archivos.map((archivo, indice) => <article className="multimedia__tarjeta" key={archivo.id}><div className="multimedia__vista"><VistaArchivo archivo={archivo.archivo} tipo={archivo.tipo} nombre={`${archivo.tipo === TipoMultimedia.Foto ? 'Foto' : 'Video'} ${indice + 1} de ${mascota.nombre}`} /></div><div className="multimedia__detalle"><strong>{archivo.esPrincipal ? 'Foto principal' : archivo.tipo === TipoMultimedia.Foto ? 'Foto' : 'Video'}</strong><div className="multimedia__acciones">{archivo.tipo === TipoMultimedia.Foto && !archivo.esPrincipal && <Boton disabled={ocupado} onClick={() => void operar('principal', archivo)}>Usar como principal</Boton>}<Boton variante="texto" disabled={ocupado} onClick={() => { setError(''); setEliminar(archivo); }}>Eliminar<span className="visualmente-oculto"> archivo {indice + 1}</span></Boton></div></div></article>)}</div>}
    {eliminar && <Modal titulo="Eliminar archivo" compacto ocupado={ocupado} alCerrar={() => { setEliminar(undefined); setError(''); }}><p>¿Quieres eliminar este archivo de la galería de {mascota.nombre}?</p>{eliminar.esPrincipal && <p>Si quedan otras fotos, la primera pasará a ser la principal.</p>}{error && <p role="alert" className="campo__error">{error}</p>}<div className="multimedia__acciones"><Boton variante="peligro" cargando={ocupado} onClick={() => void operar('eliminar', eliminar)}>Confirmar eliminación</Boton><Boton disabled={ocupado} onClick={() => { setEliminar(undefined); setError(''); }}>Cancelar</Boton></div></Modal>}
  </section>;
}
