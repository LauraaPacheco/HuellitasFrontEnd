import type { HTMLInputTypeAttribute } from 'react';
import './campo.css';

interface Props {
  readonly id: string;
  readonly etiqueta: string;
  readonly valor: string;
  readonly alCambiar: (valor: string) => void;
  readonly tipo?: HTMLInputTypeAttribute;
  readonly marcador?: string;
  readonly ayuda?: string;
  readonly error?: string;
  readonly autoComplete?: string;
  readonly requerido?: boolean;
}

/** Todo campo lleva etiqueta visible, no solo marcador de posicion. */
export function Campo({
  id,
  etiqueta,
  valor,
  alCambiar,
  tipo = 'text',
  marcador,
  ayuda,
  error,
  autoComplete,
  requerido,
}: Props) {
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;

  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <input
        id={id}
        className={`campo__control${error ? ' campo__control--error' : ''}`}
        type={tipo}
        value={valor}
        placeholder={marcador}
        autoComplete={autoComplete}
        required={requerido}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(' ') || undefined}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      {ayuda && (
        <p className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </p>
      )}
      {error && (
        <p className="campo__error" id={idError} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
