import './ilustracion.css';

export type VarianteIlustracion = 'perro-triste';

interface Props {
  readonly variante: VarianteIlustracion;
  readonly tamano?: number;
}

/**
 * Ilustraciones de la plataforma.
 *
 * Hablan el mismo idioma que el isotipo: formas geométricas simples,
 * relleno plano y nada de degradados ni sombras, como manda el sistema.
 * Van en los momentos en que la pantalla no tiene datos que mostrar —un
 * bloqueo, una búsqueda vacía—, donde una ilustración hace más por
 * explicar que un ícono de advertencia.
 *
 * Son decorativas: el texto de al lado dice lo que hay que decir, así que
 * van con aria-hidden para no repetirlo en el lector de pantalla.
 */
export function Ilustracion({ variante, tamano = 160 }: Props) {
  if (variante === 'perro-triste') return <PerroTriste tamano={tamano} />;
  return null;
}

/** Perro sentado con las orejas caídas y la cola baja. */
function PerroTriste({ tamano }: { readonly tamano: number }) {
  return (
    <svg
      className="ilustracion ilustracion--perro"
      viewBox="0 0 200 180"
      width={tamano}
      height={(tamano * 180) / 200}
      aria-hidden
      focusable="false"
    >
      {/* Suelo: una sola línea, para que el perro no flote. */}
      <line
        x1="28"
        y1="166"
        x2="172"
        y2="166"
        stroke="var(--border)"
        strokeWidth="2"
        strokeLinecap="round"
      />

      {/* La cola va detrás del cuerpo y es lo único que se mueve de verdad.
          Va caída hacia el suelo: una cola en alto diría lo contrario. */}
      <g className="ilustracion__cola">
        <path
          d="M68 134 C52 132 38 140 32 152 C30 157 35 160 39 157 C47 150 56 146 70 148 Z"
          fill="var(--brand)"
        />
      </g>

      {/* Cuerpo sentado: angosto de hombros y ancho de base. */}
      <path
        d="M70 92 L130 92 C134 92 137 95 138 99 L146 150 C147 157 142 162 135 162 L65 162 C58 162 53 157 54 150 L62 99 C63 95 66 92 70 92 Z"
        fill="var(--brand-strong)"
      />

      {/* Patas delanteras, apoyadas en la línea del suelo */}
      <ellipse cx="80" cy="157" rx="16" ry="10" fill="var(--brand)" />
      <ellipse cx="120" cy="157" rx="16" ry="10" fill="var(--brand)" />

      {/* Orejas: nacen detrás de la cabeza y cuelgan. Las caídas son lo que
          lee la gente como tristeza, más que la boca. */}
      <g className="ilustracion__oreja ilustracion__oreja--izq">
        <path
          d="M62 48 C44 48 36 66 38 88 C40 108 50 120 60 118 C70 116 70 96 68 78 C67 64 68 52 62 48 Z"
          fill="var(--brand)"
        />
      </g>
      <g className="ilustracion__oreja ilustracion__oreja--der">
        <path
          d="M138 48 C156 48 164 66 162 88 C160 108 150 120 140 118 C130 116 130 96 132 78 C133 64 132 52 138 48 Z"
          fill="var(--brand)"
        />
      </g>

      {/* Cabeza, un poco inclinada hacia abajo */}
      <g className="ilustracion__cabeza">
        <rect
          x="58"
          y="30"
          width="84"
          height="80"
          rx="34"
          fill="var(--brand-strong)"
        />

        {/* Cejas levantadas por dentro: el gesto de preocupación */}
        <path
          d="M74 56 L90 52"
          stroke="var(--surface-100)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.9"
        />
        <path
          d="M126 56 L110 52"
          stroke="var(--surface-100)"
          strokeWidth="3.5"
          strokeLinecap="round"
          opacity="0.9"
        />

        <g className="ilustracion__ojos">
          <circle cx="82" cy="68" r="6" fill="var(--surface-100)" />
          <circle cx="118" cy="68" r="6" fill="var(--surface-100)" />
        </g>

        {/* Hocico */}
        <ellipse cx="100" cy="92" rx="26" ry="19" fill="var(--surface-100)" />
        <ellipse cx="100" cy="84" rx="9" ry="7" fill="var(--brand-strong)" />
        {/* Boca hacia abajo */}
        <path
          d="M90 99 C95 95 105 95 110 99"
          stroke="var(--brand-strong)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </g>
    </svg>
  );
}
