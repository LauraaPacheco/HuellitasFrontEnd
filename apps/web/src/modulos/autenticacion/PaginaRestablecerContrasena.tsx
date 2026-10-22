import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ErrorHttp, validarRestablecimiento } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import { MarcoAuth } from './MarcoAuth';

export function PaginaRestablecerContrasena() {
  const [token, setToken] = useState('');
  const [clave, setClave] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  async function guardar(evento: FormEvent) {
    evento.preventDefault();
    if (guardando) return;
    const validacion = validarRestablecimiento(token, clave, confirmacion);
    setError(validacion);
    if (validacion) return;
    setGuardando(true);
    try {
      await api.autenticacion.restablecer({ token: token.trim(), nuevaContrasena: clave });
      setToken(''); setClave(''); setConfirmacion(''); setListo(true);
    } catch (causa) {
      setError(causa instanceof ErrorHttp ? causa.detalle ?? causa.message : 'No pudimos cambiar la contraseña. Inténtalo de nuevo.');
    } finally { setGuardando(false); }
  }
  return (
    <MarcoAuth titulo={listo ? 'Contraseña restablecida' : 'Crear una contraseña nueva'}>
      {listo ? <p role="status">{MODO_DEMO ? 'Simulación completada. Las cuentas demo conservan su contraseña Demo1234.' : 'Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva.'}</p> : (
        <form onSubmit={guardar} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
          <p style={{ color: 'var(--ink-muted)', margin: 0 }}>Copia el código del correo. Es de un solo uso y vence a los 30 minutos.</p>
          {MODO_DEMO && <p>En demo, solicita primero la recuperación y usa el código <strong>demo-recuperacion</strong>. No se envía correo.</p>}
          <fieldset disabled={guardando} style={{ border: 0, padding: 0, margin: 0, display: 'grid', gap: 'var(--space-4)' }}>
            <Campo id="codigo-recuperacion" etiqueta="Código de recuperación" valor={token} alCambiar={setToken} autoComplete="one-time-code" />
            <Campo id="nueva-contrasena" etiqueta="Nueva contraseña" tipo="password" valor={clave} alCambiar={setClave} autoComplete="new-password" ayuda="Entre 8 y 100 caracteres" />
            <Campo id="confirmar-contrasena" etiqueta="Confirmar nueva contraseña" tipo="password" valor={confirmacion} alCambiar={setConfirmacion} autoComplete="new-password" />
          </fieldset>
          {error && <p role="alert" className="marco-auth__error">{error}</p>}
          <Boton tipo="submit" variante="primario" cargando={guardando}>Cambiar contraseña</Boton>
          <Link to="/olvide-contrasena">Solicitar otro código</Link>
        </form>
      )}
    </MarcoAuth>
  );
}
