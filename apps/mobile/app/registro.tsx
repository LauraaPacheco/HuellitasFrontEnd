import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ErrorHttp,
  esCorreoValido,
  esTelefonoValido,
  fuerzaContrasena,
  LONGITUD_MINIMA_CONTRASENA,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { Casilla } from '@/componentes/Casilla';
import { espaciado, usarPaleta } from '@/temas';

/**
 * Crear cuenta de adoptante.
 *
 * Misma composicion que el login: titulo con su ayuda, campos, la casilla
 * de la politica y, al final, el enlace para quien ya tiene cuenta.
 */
export default function PantallaRegistro() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { bottom } = useSafeAreaInsets();
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const fuerza = fuerzaContrasena(contrasena);

  async function registrar() {
    setError(null);
    if (!nombre.trim()) return setError('Escribe tu nombre completo.');
    if (!esCorreoValido(correo)) return setError('Escribe un correo válido.');
    if (!esTelefonoValido(telefono)) return setError('El teléfono debe tener 10 dígitos.');
    if (contrasena.length < LONGITUD_MINIMA_CONTRASENA) {
      return setError(`La contraseña debe tener al menos ${LONGITUD_MINIMA_CONTRASENA} caracteres.`);
    }
    if (!aceptaPolitica) {
      return setError('Debes aceptar la política de tratamiento de datos para continuar.');
    }

    setEnviando(true);
    try {
      await api.autenticacion.registrar({ nombre, correo, telefono, contrasena, aceptaPolitica });
      // Se lleva el correo para poder reenviar el enlace sin volver a pedirlo.
      router.replace({ pathname: '/confirmar', params: { correo } });
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp
          ? (causa.detalle ?? causa.message)
          : 'No pudimos crear tu cuenta. Inténtalo de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={[estilos.contenido, { paddingBottom: bottom + espaciado.s5 }]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={estilos.titulos}>
        <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>
          Crea tu cuenta
        </Text>
        <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>
          Con tu cuenta puedes postularte a una adopción y seguir tus solicitudes.
        </Text>
      </View>

      <Campo etiqueta="Nombre completo" valor={nombre} alCambiar={setNombre} marcador="Como aparece en tu documento" autoComplete="name" />
      <Campo
        etiqueta="Correo"
        valor={correo}
        alCambiar={setCorreo}
        marcador="tucorreo@ejemplo.com"
        tipoTeclado="email-address"
        autoComplete="email"
        ayuda="Te enviaremos un enlace para confirmarlo"
      />
      <Campo
        etiqueta="Teléfono"
        valor={telefono}
        alCambiar={setTelefono}
        marcador="10 dígitos"
        tipoTeclado="phone-pad"
        autoComplete="tel"
      />
      <Campo
        etiqueta="Contraseña"
        valor={contrasena}
        alCambiar={setContrasena}
        esContrasena
        autoComplete="new-password"
        ayuda={
          contrasena.length === 0
            ? `Mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres`
            : `Seguridad: ${fuerza}`
        }
      />

      <Casilla
        marcada={aceptaPolitica}
        alCambiar={setAceptaPolitica}
        texto="Acepto la política de tratamiento de datos conforme a la Ley 1581 de 2012."
      />

      {error && (
        <Text accessibilityRole="alert" style={[estilos.error, { color: paleta.danger }]}>
          {error}
        </Text>
      )}

      <Boton titulo="Crear cuenta" cargando={enviando} alPresionar={() => void registrar()} />

      <Text style={[estilos.pie, { color: paleta.inkMuted }]}>
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" replace style={{ color: paleta.brandStrong, fontWeight: '600', textDecorationLine: 'underline' }}>
          Inicia sesión
        </Link>
      </Text>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { paddingHorizontal: espaciado.s4, paddingTop: espaciado.s2, gap: espaciado.s4 },
  titulos: { gap: espaciado.s2, marginBottom: espaciado.s1 },
  titulo: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  ayuda: { fontSize: 15, lineHeight: 23 },
  error: { fontSize: 13, fontWeight: '600' },
  pie: { fontSize: 14, textAlign: 'center', marginTop: espaciado.s2 },
});
