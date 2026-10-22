import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorHttp, validarRestablecimiento } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { usarPaleta, espaciado } from '@/temas';

export default function PantallaRestablecerContrasena() {
  const paleta = usarPaleta();
  const router = useRouter();
  const margenes = useSafeAreaInsets();
  const [token, setToken] = useState('');
  const [clave, setClave] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [listo, setListo] = useState(false);
  async function guardar() {
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
    <ScrollView style={{ flex: 1, backgroundColor: paleta.surface100 }}
      contentContainerStyle={{ padding: espaciado.s5, paddingBottom: margenes.bottom + espaciado.s6, gap: espaciado.s4 }}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      {listo ? (
        <>
          <Text accessibilityRole="alert" style={{ color: paleta.ink, lineHeight: 24 }}>{MODO_DEMO ? 'Simulación completada. Las cuentas demo conservan su contraseña Demo1234.' : 'Tu contraseña se actualizó. Ya puedes iniciar sesión con la nueva.'}</Text>
          <Boton titulo="Iniciar sesión" alPresionar={() => router.replace('/login')} />
        </>
      ) : (
        <>
          <Text style={{ color: paleta.inkMuted, lineHeight: 23 }}>Copia el código del correo. Es de un solo uso y vence a los 30 minutos.</Text>
          {MODO_DEMO && <Text style={{ color: paleta.ink }}>En demo, solicita primero la recuperación y usa demo-recuperacion. No se envía correo.</Text>}
          <Campo autoCapitalize="none" autoComplete="one-time-code" etiqueta="Código de recuperación" valor={token} alCambiar={setToken} deshabilitado={guardando} />
          <Campo etiqueta="Nueva contraseña" valor={clave} alCambiar={setClave} esContrasena autoComplete="new-password" ayuda="Entre 8 y 100 caracteres" deshabilitado={guardando} />
          <Campo etiqueta="Confirmar nueva contraseña" valor={confirmacion} alCambiar={setConfirmacion} esContrasena autoComplete="new-password" deshabilitado={guardando} />
          {error && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
          <Boton titulo="Cambiar contraseña" cargando={guardando} alPresionar={() => void guardar()} />
          <Boton titulo="Solicitar otro código" variante="secundario" deshabilitado={guardando} alPresionar={() => router.replace('/olvide-contrasena')} />
        </>
      )}
    </ScrollView>
  );
}
