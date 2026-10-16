import { useState, type FormEvent } from 'react';
import { ErrorHttp, esCorreoValido } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import { Ilustracion } from '@/componentes/ui/Ilustracion';
import { MarcoAuth } from './MarcoAuth';

/**
 * Pide el correo y manda el enlace de recuperación.
 *
 * Ojo: el backend todavía no expone /olvide-contrasena. La pantalla queda
 * lista y en modo demo responde bien; al conectar la API hay que crear ese
 * endpoint y el de restablecer.
 */
export function PaginaOlvideContrasena() {
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
      await api.autenticacion.olvideContrasena({ correo });
      setEnviado(true);
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp
          ? (causa.detalle ?? causa.message)
          : 'No pudimos procesar la solicitud. Inténtalo más tarde.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <MarcoAuth
        titulo="Revisa tu correo"
        sello={<Ilustracion variante="restablecer" />}
      >
        <p style={{ margin: 0, color: 'var(--ink-muted)', lineHeight: '23px' }}>
          Si <strong>{correo}</strong> tiene una cuenta en Huellitas, le
          mandamos un enlace para crear una contraseña nueva. El enlace vence
          en una hora.
        </p>
        <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 14 }}>
          ¿No llegó? Mira en el correo no deseado antes de volver a pedirlo.
        </p>
      </MarcoAuth>
    );
  }

  return (
    <MarcoAuth
      titulo="Recuperar contraseña"
      descripcion="Escribe el correo con el que entras y te mandamos un enlace para cambiarla."
      sello={<Ilustracion variante="restablecer" />}
    >
      <form onSubmit={alEnviar} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Campo
          id="correo"
          etiqueta="Correo"
          tipo="email"
          autoComplete="email"
          valor={correo}
          alCambiar={setCorreo}
          marcador="tucorreo@ejemplo.com"
        />
        {error && (
          <p className="marco-auth__error" role="alert">
            {error}
          </p>
        )}
        <Boton tipo="submit" variante="primario" ancho cargando={enviando}>
          Enviar enlace
        </Boton>
      </form>
    </MarcoAuth>
  );
}
