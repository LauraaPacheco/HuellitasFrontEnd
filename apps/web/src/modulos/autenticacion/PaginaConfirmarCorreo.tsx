import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ErrorHttp, esCorreoValido } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import { MarcoAuth } from './MarcoAuth';

type Estado = 'verificando' | 'lista' | 'fallo' | 'sin-token';

function Sello({ bien }: { readonly bien: boolean }) {
  return (
    <div className={`marco-auth__sello marco-auth__sello--${bien ? 'bien' : 'mal'}`}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {bien ? <path d="M4 12.5l5.5 5.5L20 7" /> : <path d="M12 7v6m0 4h.01M12 3l9 16H3z" />}
      </svg>
    </div>
  );
}

/**
 * Donde cae el enlace del correo de verificación.
 *
 * Importante: el backend debe mandar el enlace a ESTA página
 * (/confirmar?token=…), no al endpoint de la API. Si apunta a la API, el
 * usuario abre el correo y se encuentra un JSON en el navegador.
 */
export function PaginaConfirmarCorreo() {
  const [parametros] = useSearchParams();
  const token = parametros.get('token');

  const [estado, setEstado] = useState<Estado>(token ? 'verificando' : 'sin-token');
  const [motivo, setMotivo] = useState<string | null>(null);

  // El token se quema al usarlo. React 18 en modo estricto monta y
  // desmonta cada efecto dos veces en desarrollo, asi que sin este
  // candado el segundo intento fallaria con 'enlace ya usado'.
  const yaIntentado = useRef(false);

  useEffect(() => {
    if (!token || yaIntentado.current) return;
    yaIntentado.current = true;

    void (async () => {
      try {
        await api.autenticacion.confirmarCorreo(token);
        setEstado('lista');
      } catch (causa) {
        setMotivo(
          causa instanceof ErrorHttp
            ? (causa.detalle ?? causa.message)
            : 'No pudimos confirmar tu correo.',
        );
        setEstado('fallo');
      }
    })();
  }, [token]);

  if (estado === 'verificando') {
    return (
      <MarcoAuth titulo="Confirmando tu correo" descripcion="Dura un segundo.">
        <p style={{ margin: 0, color: 'var(--ink-muted)' }} role="status">
          Estamos verificando el enlace…
        </p>
      </MarcoAuth>
    );
  }

  if (estado === 'lista') {
    return (
      <MarcoAuth
        titulo="Cuenta verificada"
        sello={<Sello bien />}
        descripcion="Tu correo quedó confirmado. Ya puedes entrar y postularte a una adopción."
      >
        <Link to="/login">
          <Boton variante="primario" ancho>
            Iniciar sesión
          </Boton>
        </Link>
      </MarcoAuth>
    );
  }

  return <Reenviar motivo={estado === 'sin-token' ? null : motivo} />;
}

/** Lo que se ve cuando el enlace venció, ya se usó, o no venía token. */
function Reenviar({ motivo }: { readonly motivo: string | null }) {
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!esCorreoValido(correo)) {
      setError('Escribe un correo válido.');
      return;
    }

    setEnviando(true);
    try {
      await api.autenticacion.reenviarVerificacion(correo);
      setEnviado(true);
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp
          ? (causa.detalle ?? causa.message)
          : 'No pudimos reenviar el correo. Inténtalo más tarde.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <MarcoAuth titulo="Te mandamos otro enlace" sello={<Sello bien />}>
        <p style={{ margin: 0, color: 'var(--ink-muted)', lineHeight: '23px' }}>
          Si <strong>{correo}</strong> tiene una cuenta sin confirmar, el enlace
          ya va en camino. Revisa también el correo no deseado.
        </p>
      </MarcoAuth>
    );
  }

  return (
    <MarcoAuth
      sello={<Sello bien={false} />}
      titulo={motivo ? 'Este enlace ya no sirve' : 'Nos falta el código'}
      descripcion={
        motivo ??
        'La dirección no trae el código de confirmación. Pudo cortarse al copiarla del correo.'
      }
    >
      <form onSubmit={alEnviar} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Campo
          id="correo"
          etiqueta="Tu correo"
          tipo="email"
          autoComplete="email"
          valor={correo}
          alCambiar={setCorreo}
          marcador="tucorreo@ejemplo.com"
          ayuda="Te mandamos un enlace nuevo"
        />
        {error && (
          <p className="marco-auth__error" role="alert">
            {error}
          </p>
        )}
        <Boton tipo="submit" variante="primario" ancho cargando={enviando}>
          Reenviar el enlace
        </Boton>
      </form>
    </MarcoAuth>
  );
}
