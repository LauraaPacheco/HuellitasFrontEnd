import { useState } from 'react';
import { MAX_ARCHIVOS_MASCOTA, validarUrlFoto } from '@huellitas/shared';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import './multimedia.css';

interface Props {
  readonly fotos: readonly string[];
  readonly alCambiar: (fotos: string[]) => void;
  readonly deshabilitado?: boolean;
}

/**
 * Fotos por URL para la ficha real.
 *
 * El backend todavía no recibe archivos: guarda las direcciones tal cual en
 * Multimedia y marca la primera como principal. Por eso "Usar como principal"
 * solo mueve la foto al inicio de la lista.
 */
export function FotosPorUrl({ fotos, alCambiar, deshabilitado }: Props) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [fallidas, setFallidas] = useState<ReadonlySet<string>>(new Set());

  function agregar() {
    const problema = validarUrlFoto(url, fotos);
    if (problema) { setError(problema); return; }
    alCambiar([...fotos, url.trim()]);
    setUrl(''); setError('');
  }
  const quitar = (foto: string) => alCambiar(fotos.filter(f => f !== foto));
  const hacerPrincipal = (foto: string) => alCambiar([foto, ...fotos.filter(f => f !== foto)]);

  return (
    <div className="fotos-url">
      <form className="fotos-url__agregar" onSubmit={e => { e.preventDefault(); agregar(); }}>
        <Campo id="foto-url" etiqueta="Dirección de la foto" tipo="url" marcador="https://…/luna.jpg"
          valor={url} alCambiar={v => { setUrl(v); if (error) setError(''); }} error={error || undefined}
          ayuda={`Pega el enlace público de una imagen. Hasta ${MAX_ARCHIVOS_MASCOTA} fotos; la primera es la principal.`} />
        <Boton tipo="submit" disabled={deshabilitado || fotos.length >= MAX_ARCHIVOS_MASCOTA}>Agregar foto</Boton>
      </form>

      {fotos.length === 0 ? <p className="multimedia__vacio">Todavía no agregaste fotos. Puedes publicar sin ellas y agregarlas después.</p> : (
        <ul className="multimedia__rejilla" aria-label="Fotos agregadas">
          {fotos.map((foto, i) => (
            <li key={foto} className="multimedia__tarjeta">
              <div className="multimedia__vista">
                {fallidas.has(foto)
                  ? <p className="multimedia__fallo">No pudimos mostrar la vista previa. Revisa que el enlace sea público y apunte a una imagen.</p>
                  : <img src={foto} alt={`Foto ${i + 1}`} referrerPolicy="no-referrer" onError={() => setFallidas(s => new Set(s).add(foto))} />}
              </div>
              <div className="multimedia__detalle">
                <p>{i === 0 ? <strong>Foto principal</strong> : `Foto ${i + 1}`}</p>
                <small title={foto}>{foto}</small>
                <div className="multimedia__acciones">
                  {i > 0 && <Boton disabled={deshabilitado} onClick={() => hacerPrincipal(foto)}>Usar como principal</Boton>}
                  <Boton disabled={deshabilitado} onClick={() => quitar(foto)}>Quitar</Boton>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
