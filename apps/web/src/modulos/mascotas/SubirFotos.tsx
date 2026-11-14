import { useId, useState, type DragEvent } from 'react';
import { ImagePlus } from 'lucide-react';
import { ErrorHttp, MAX_ARCHIVOS_MASCOTA, validarArchivoServidor } from '@huellitas/shared';
import { api } from '@/lib/api';
import './multimedia.css';

interface Props {
  readonly fotos: readonly string[];
  readonly alCambiar: (fotos: string[]) => void;
  readonly alActividad: (ocupado: boolean) => void;
}

/**
 * Sube varias fotos de una vez (selección múltiple o arrastrando).
 * Se suben una por una para respetar el máximo y que un archivo malo
 * no impida subir los demás.
 */
export function SubirFotos({ fotos, alCambiar, alActividad }: Props) {
  const idEntrada = useId();
  const [progreso, setProgreso] = useState<{ actual: number; total: number }>();
  const [errores, setErrores] = useState<string[]>([]);
  const [encima, setEncima] = useState(false);
  const ocupado = progreso !== undefined;
  const lleno = fotos.length >= MAX_ARCHIVOS_MASCOTA;
  const deshabilitado = ocupado || lleno;

  async function subir(archivos: readonly File[]) {
    if (!archivos.length || ocupado) return;
    const espacio = MAX_ARCHIVOS_MASCOTA - fotos.length;
    const problemas: string[] = [];
    const validos = archivos.filter(archivo => {
      const problema = validarArchivoServidor(archivo.name, archivo.size, true);
      if (problema) problemas.push(`${archivo.name}: ${problema}`);
      return !problema;
    });
    const aSubir = validos.slice(0, espacio);
    if (validos.length > espacio) problemas.push(`Solo caben ${espacio} ${espacio === 1 ? 'foto más' : 'fotos más'}; ${validos.length - espacio} no se subieron.`);
    setErrores(problemas);
    if (!aSubir.length) return;

    alActividad(true);
    const subidas: string[] = [];
    try {
      for (const [i, archivo] of aSubir.entries()) {
        setProgreso({ actual: i + 1, total: aSubir.length });
        try {
          const form = new FormData();
          form.append('archivo', archivo);
          form.append('tipo', 'mascotas');
          subidas.push(await api.archivos.subir(form));
        } catch (e) {
          problemas.push(`${archivo.name}: ${e instanceof ErrorHttp ? e.detalle ?? e.message : 'no pudimos subirla.'}`);
        }
      }
    } finally {
      if (subidas.length) alCambiar([...fotos, ...subidas]);
      setErrores([...problemas]);
      setProgreso(undefined);
      alActividad(false);
    }
  }

  function soltar(evento: DragEvent) {
    evento.preventDefault();
    setEncima(false);
    if (!deshabilitado) void subir(Array.from(evento.dataTransfer.files));
  }

  return (
    <div className="subir-fotos">
      <label
        htmlFor={idEntrada}
        className={`subir-fotos__zona${encima ? ' subir-fotos__zona--encima' : ''}${deshabilitado ? ' subir-fotos__zona--deshabilitada' : ''}`}
        onDragOver={e => { e.preventDefault(); if (!deshabilitado) setEncima(true); }}
        onDragLeave={() => setEncima(false)}
        onDrop={soltar}
      >
        <span className="subir-fotos__icono" aria-hidden="true"><ImagePlus size={28} strokeWidth={1.75} /></span>
        <span className="subir-fotos__titulo">
          {ocupado ? `Subiendo foto ${progreso.actual} de ${progreso.total}…` : lleno ? 'Ya tienes el máximo de fotos' : 'Elige fotos desde tu equipo'}
        </span>
        <span className="subir-fotos__ayuda">
          {lleno ? `Quita alguna para agregar otra (máximo ${MAX_ARCHIVOS_MASCOTA}).` : 'Puedes seleccionar varias a la vez o arrastrarlas aquí. JPG, PNG o WebP, hasta 5 MB cada una.'}
        </span>
        {!deshabilitado && <span className="boton boton--primario subir-fotos__boton">Seleccionar fotos</span>}
      </label>
      <input
        id={idEntrada}
        className="visualmente-oculto"
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        disabled={deshabilitado}
        onChange={e => { const archivos = Array.from(e.target.files ?? []); e.target.value = ''; void subir(archivos); }}
      />
      <p className="subir-fotos__contador">{fotos.length} de {MAX_ARCHIVOS_MASCOTA} fotos · la primera es la principal</p>
      {ocupado && <p role="status" className="visualmente-oculto">Subiendo foto {progreso.actual} de {progreso.total}</p>}
      {errores.length > 0 && (
        <ul role="alert" className="subir-fotos__errores">
          {errores.map(error => <li key={error} className="campo__error">{error}</li>)}
        </ul>
      )}
    </div>
  );
}
