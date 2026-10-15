interface Props {
  readonly tamano?: number;
  readonly sobreOscuro?: boolean;
}

/**
 * Isotipo de Huellitas: pin de ubicacion con huella.
 * Por debajo de 32px usa la version reducida, que es la que se sigue leyendo.
 */
export function Isotipo({ tamano = 32, sobreOscuro = false }: Props) {
  const fondo = sobreOscuro ? '#ffffff' : 'var(--brand-strong)';
  const hueco = sobreOscuro ? 'var(--brand-strong)' : '#ffffff';

  return (
    <svg
      viewBox="0 0 120 120"
      width={tamano}
      height={tamano}
      role="img"
      aria-label="Huellitas"
    >
      <path
        d="M60 6 C86 6 106 26 106 52 C106 82 72 106 60 116 C48 106 14 82 14 52 C14 26 34 6 60 6 Z"
        fill={fondo}
      />
      <circle cx="60" cy="50" r={tamano >= 32 ? 26 : 24} fill={hueco} />
      {tamano >= 32 ? (
        <>
          <circle cx="50" cy="44" r="5" fill={fondo} />
          <circle cx="60" cy="40" r="5" fill={fondo} />
          <circle cx="70" cy="44" r="5" fill={sobreOscuro ? '#ff7a5c' : 'var(--accent)'} />
          <path
            d="M60 52 C67 52 72 57 72 61 C72 66 67 68 60 68 C53 68 48 66 48 61 C48 57 53 52 60 52 Z"
            fill={fondo}
          />
        </>
      ) : (
        <path
          d="M60 38 C70 38 78 48 78 56 C78 64 70 66 60 66 C50 66 42 64 42 56 C42 48 50 38 60 38 Z"
          fill={fondo}
        />
      )}
    </svg>
  );
}
