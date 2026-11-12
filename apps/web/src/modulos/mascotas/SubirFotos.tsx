import { useState } from 'react';
import { ErrorHttp, MAX_ARCHIVOS_MASCOTA, validarArchivoServidor } from '@huellitas/shared';
import { api } from '@/lib/api';
export function SubirFotos({ fotos, alCambiar, alActividad }: { fotos: readonly string[]; alCambiar: (fotos: string[]) => void; alActividad: (ocupado: boolean) => void }) {
  const [ocupado,setOcupado]=useState(false);const [error,setError]=useState('');
  async function subir(archivo: File) {
    const problema=validarArchivoServidor(archivo.name,archivo.size,true);if(problema){setError(problema);return;}
    if(fotos.length>=MAX_ARCHIVOS_MASCOTA){setError('Ya alcanzaste el máximo de fotos.');return;}
    setOcupado(true);alActividad(true);setError('');
    try { const form=new FormData();form.append('archivo',archivo);form.append('tipo','mascotas');const url=await api.archivos.subir(form);alCambiar([...fotos,url]); }
    catch(e){setError(e instanceof ErrorHttp ? e.detalle??e.message:'No pudimos subir la foto.');}
    finally{setOcupado(false);alActividad(false);}
  }
  return <div style={{marginBottom:20}}><label className="campo">Subir foto<input type="file" accept="image/jpeg,image/png,image/webp" disabled={ocupado||fotos.length>=MAX_ARCHIVOS_MASCOTA} onChange={e=>{const archivo=e.target.files?.[0];e.target.value='';if(archivo)void subir(archivo);}} /></label><p>JPG, PNG o WebP, hasta 5 MB. La imagen se sube al almacenamiento del refugio antes de publicar la ficha.</p>{ocupado&&<p role="status">Subiendo foto…</p>}{error&&<p role="alert" className="campo__error">{error}</p>}</div>;
}
