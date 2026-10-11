import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './boton.css';

type Variante = 'primario' | 'secundario' | 'peligro' | 'texto';

interface Props extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  readonly children: ReactNode;
  readonly variante?: Variante;
  readonly tipo?: 'button' | 'submit';
  readonly ancho?: boolean;
  readonly cargando?: boolean;
}

export function Boton({
  children,
  variante = 'secundario',
  tipo = 'button',
  ancho = false,
  cargando = false,
  disabled,
  className,
  ...resto
}: Props) {
  const clases = [
    'boton',
    `boton--${variante}`,
    ancho ? 'boton--ancho' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type={tipo}
      className={clases}
      disabled={disabled || cargando}
      aria-busy={cargando || undefined}
      {...resto}
    >
      {cargando ? 'Un momento…' : children}
    </button>
  );
}
