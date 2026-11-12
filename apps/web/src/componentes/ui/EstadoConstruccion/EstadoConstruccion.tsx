import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Construction } from 'lucide-react';
import { Ilustracion } from '../Ilustracion';
import './estadoConstruccion.css';

interface Props {
  /** Nombre de la pantalla: "Indicadores". */
  readonly pantalla: string;
  /** Historias de usuario que la cubren, para que el equipo la ubique. */
  readonly historias?: string;
  /** Otra salida además de ir al inicio. */
  readonly accionExtra?: ReactNode;
}

/**
 * Estado de una pantalla que todavía no está lista.
 *
 * Misma composición que EstadoError (ilustración, título, texto y salida)
 * para que se sienta parte de la plataforma, pero en tono tranquilo: no
 * es un fallo, es algo que viene en camino.
 */
export function EstadoConstruccion({ pantalla, historias, accionExtra }: Props) {
  return (
    <section className="estado-construccion" aria-labelledby="estado-construccion-titulo">
      <div className="estado-construccion__arte">
        <Ilustracion variante="durmiendo" />
        <span className="estado-construccion__sello" aria-hidden="true">
          <Construction size={22} strokeWidth={1.75} />
        </span>
      </div>
      <span className="estado-construccion__etiqueta">En construcción</span>
      <h2 id="estado-construccion-titulo" className="estado-construccion__titulo">
        Estamos preparando {pantalla.toLowerCase()}
      </h2>
      <p className="estado-construccion__texto">
        Esta pantalla todavía no está lista. Mientras tanto puedes seguir usando el resto del panel.
      </p>
      {historias && <p className="estado-construccion__historias">Corresponde a {historias}</p>}
      <div className="estado-construccion__acciones">
        <Link className="boton boton--primario" to="/">
          Ir al inicio
        </Link>
        {accionExtra}
      </div>
    </section>
  );
}
