import { useState, type HTMLInputTypeAttribute } from 'react';
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
  const [visible, setVisible] = useState(false);
  const esContrasena = tipo === 'password';
  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = error ? `${id}-error` : undefined;

  return (
    <div className="campo">
      <label className="campo__etiqueta" htmlFor={id}>
        {etiqueta}
      </label>
      <div className={esContrasena ? "campo__contrasena" : "campo__entrada"}>
      <input
        id={id}
        className={`campo__control${error ? ' campo__control--error' : ''}`}
        type={esContrasena && visible ? 'text' : tipo}
        value={valor}
        placeholder={marcador}
        autoComplete={autoComplete}
        required={requerido}
        aria-invalid={error ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(' ') || undefined}
        onChange={(evento) => alCambiar(evento.target.value)}
      />
      {esContrasena && (
        <button type="button" className="campo__ojo" aria-controls={id}
          aria-label={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          onClick={() => setVisible(actual => !actual)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
            <circle cx="12" cy="12" r="2.5" />
            {visible && <path d="m3 3 18 18" />}
          </svg>
        </button>
      )}
      </div>
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
