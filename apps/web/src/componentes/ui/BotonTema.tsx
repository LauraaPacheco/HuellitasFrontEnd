import { tokens } from '@huellitas/shared';
import type { PreferenciaTema } from '@huellitas/shared/tokens';
import { useTema } from '@/temas/ContextoTema';
import './botonTema.css';

interface Props {
  /** Con etiqueta, el boton muestra el nombre del tema al lado del icono. */
  readonly conEtiqueta?: boolean;
}

/** Sol, luna o media luna sobre sol, segun el estado. */
function IconoTema({ preferencia }: { preferencia: PreferenciaTema }) {
  const comun = {
    width: 20,
    height: 20,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.5,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  if (preferencia === 'claro') {
    return (
      <svg {...comun}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6l1.4 1.4m10 10l1.4 1.4m0-12.8l-1.4 1.4m-10 10l-1.4 1.4" />
      </svg>
    );
  }

  if (preferencia === 'oscuro') {
    return (
      <svg {...comun}>
        <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />
      </svg>
    );
  }

  // Automatico: medio sol y media luna, para que se lea distinto de los dos.
  return (
    <svg {...comun}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4a8 8 0 0 0 0 16z" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function BotonTema({ conEtiqueta = false }: Props) {
  const { preferencia, alternarTema } = useTema();
  const etiqueta = tokens.etiquetaBotonTema(preferencia);

  const clases = ['boton-tema'];
  if (conEtiqueta) clases.push('boton-tema--con-etiqueta');

  return (
    <button
      type="button"
      className={clases.join(' ')}
      onClick={alternarTema}
      aria-label={etiqueta}
      title={etiqueta}
    >
      <IconoTema preferencia={preferencia} />
      {conEtiqueta && (
        <span className="boton-tema__texto">
          {tokens.nombrePreferenciaTema(preferencia)}
        </span>
      )}
    </button>
  );
}
