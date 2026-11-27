import { useId, useState, type DragEvent } from 'react';
import { FilePlus2, FileText, Link2, X } from 'lucide-react';
import { ErrorHttp, validarArchivoServidor } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import './multimedia.css';
import './mascotas.css';

const esPdf = (url: string) => /\.pdf($|\?)/i.test(url);

/**
 * Soporte de una atención clínica: el refugio sube la foto o el PDF que le
 * dio el veterinario (va a Cloudinary por /api/v1/Archivos, carpeta
 * "soportes") o pega un enlace que ya tenga. Se guarda una sola URL.
 */
export function SoporteVeterinario({
  valor,
  alCambiar,
  alActividad,
}: {
  readonly valor: string;
  readonly alCambiar: (url: string) => void;
  readonly alActividad: (ocupado: boolean) => void;
}) {
  const idEntrada = useId();
  const idEnlace = useId();
  const [subiendo, setSubiendo] = useState(false);
  const [encima, setEncima] = useState(false);
  const [error, setError] = useState('');
  const [enlace, setEnlace] = useState('');

  async function subir(archivo: File | undefined) {
    if (!archivo || subiendo) return;
    const problema = validarArchivoServidor(archivo.name, archivo.size);
    if (problema) return setError(problema);
    setError(''); setSubiendo(true); alActividad(true);
    try {
      const form = new FormData();
      form.append('archivo', archivo);
      form.append('tipo', 'soportes');
      alCambiar(await api.archivos.subir(form));
    } catch (e) {
      setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos subir el archivo. Intenta de nuevo.');
    } finally {
      setSubiendo(false); alActividad(false);
    }
  }

  function usarEnlace() {
    const url = enlace.trim();
    if (!/^https:\/\/\S+$/i.test(url)) return setError('El enlace debe empezar por https://.');
    setError(''); setEnlace(''); alCambiar(url);
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault();
    setEncima(false);
    void subir(evento.dataTransfer.files[0]);
  }

  return (
    <div className="campo soporte">
      <span className="campo__etiqueta">Soporte veterinario (opcional)</span>

      {valor ? (
        <div className="soporte__elegido">
          {esPdf(valor)
            ? <span className="soporte__miniatura soporte__miniatura--pdf" aria-hidden="true"><FileText size={22} strokeWidth={1.75} /></span>
            : <img className="soporte__miniatura" src={valor} alt="" referrerPolicy="no-referrer" />}
          <a className="soporte__enlace" href={valor} target="_blank" rel="noopener noreferrer">
            {esPdf(valor) ? 'Ver PDF adjunto' : 'Ver soporte adjunto'}
          </a>
          <button type="button" className="soporte__quitar" aria-label="Quitar el soporte" title="Quitar" onClick={() => alCambiar('')}>
            <X size={18} strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <>
          <div className="subir-fotos">
            <label
              htmlFor={idEntrada}
              className={`subir-fotos__zona soporte__zona${encima ? ' subir-fotos__zona--encima' : ''}${subiendo ? ' subir-fotos__zona--deshabilitada' : ''}`}
              onDragOver={(e) => { e.preventDefault(); if (!subiendo) setEncima(true); }}
              onDragLeave={() => setEncima(false)}
              onDrop={soltar}
            >
              <span className="subir-fotos__icono" aria-hidden="true"><FilePlus2 size={24} strokeWidth={1.75} /></span>
              <span className="soporte__titulo">{subiendo ? 'Subiendo archivo…' : 'Sube la foto o el PDF del veterinario'}</span>
              <span className="subir-fotos__ayuda">Arrástralo aquí o selecciónalo. JPG, PNG, WebP o PDF, hasta 5 MB.</span>
            </label>
            <input
              id={idEntrada}
              className="visualmente-oculto"
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={subiendo}
              onChange={(e) => { const archivo = e.target.files?.[0]; e.target.value = ''; void subir(archivo); }}
            />
          </div>

          <p className="fotos-url__separador">o</p>

          <div className="soporte__fila-enlace">
            <label className="visualmente-oculto" htmlFor={idEnlace}>Enlace al soporte</label>
            <span className="soporte__caja-enlace">
            <span className="soporte__icono-enlace" aria-hidden="true"><Link2 size={18} strokeWidth={1.75} /></span>
            <input
              id={idEnlace}
              className="campo__control soporte__entrada"
              type="url"
              inputMode="url"
              placeholder="Pega un enlace https://…"
              value={enlace}
              disabled={subiendo}
              onChange={(e) => { setEnlace(e.target.value); setError(''); }}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); usarEnlace(); } }}
            />
            </span>
            <Boton disabled={subiendo || !enlace.trim()} onClick={usarEnlace}>Usar enlace</Boton>
          </div>
        </>
      )}

      {subiendo && <p role="status" className="visualmente-oculto">Subiendo el soporte veterinario</p>}
      {error && <p role="alert" className="campo__error">{error}</p>}
    </div>
  );
}
