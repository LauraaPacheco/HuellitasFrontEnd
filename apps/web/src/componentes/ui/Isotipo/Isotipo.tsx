interface Props {
  readonly tamano?: number;
  /** Para cuando el isotipo va sobre un fondo de color de marca. */
  readonly sobreOscuro?: boolean;
}

/**
 * Isotipo de Huellitas: pin de ubicacion con una huella recortada.
 *
 * Una sola geometria para todos los tamanos. Antes habia dos versiones y
 * por debajo de 32px entraba una "simplificada" cuya huella era tan
 * grande que tapaba el circulo entero: en el sidebar, a 30px, no se veia
 * una huella sino un anillo. La huella de ahora es mas gruesa y se
 * sostiene hasta 20px, asi que el umbral sobraba.
 *
 * El hueco sale de --surface-100 y no de un blanco fijo. En tema oscuro
 * un disco blanco sobre el verde menta quedaba gris y sucio; tomando el
 * fondo de la app el recorte se lee limpio en los dos temas.
 *
 * El tercer dedo va en coral: es parte de la marca.
 */
export function Isotipo({ tamano = 32, sobreOscuro = false }: Props) {
  const pin = sobreOscuro ? '#ffffff' : 'var(--isotipo-pin)';
  const hueco = sobreOscuro ? 'var(--brand-strong)' : 'var(--surface-100)';

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
        fill={pin}
      />
      <circle cx="60" cy="50" r="26" fill={hueco} />
      <circle cx="46" cy="43" r="7.5" fill={pin} />
      <circle cx="60" cy="36" r="7.5" fill={pin} />
      <circle cx="74" cy="43" r="7.5" fill="var(--accent)" />
      <ellipse cx="60" cy="60" rx="14" ry="10" fill={pin} />
    </svg>
  );
}
