import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
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
import { espaciado, usarPaleta } from '@/temas';

export default function PantallaRegistro() {
  const paleta = usarPaleta();
  const router = useRouter();
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
      await api.autenticacion.registrar({
        nombre,
        correo,
        telefono,
        contrasena,
        aceptaPolitica,
      });
      Alert.alert(
        'Revisa tu correo',
        'Te enviamos un enlace para confirmar tu cuenta. Mientras tanto puedes explorar el catálogo.',
        [{ text: 'Entendido', onPress: () => router.replace('/login') }],
      );
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp
          ? causa.message
          : 'No pudimos crear tu cuenta. Inténtalo de nuevo.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
    >
      <Campo etiqueta="Nombre completo" valor={nombre} alCambiar={setNombre} autoComplete="name" />
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
        autoComplete="password"
        ayuda={
          contrasena.length === 0
            ? `Mínimo ${LONGITUD_MINIMA_CONTRASENA} caracteres`
            : `Seguridad: ${fuerza}`
        }
      />

      <View style={estilos.consentimiento}>
        <Switch
          value={aceptaPolitica}
          onValueChange={setAceptaPolitica}
          accessibilityLabel="Acepto la política de tratamiento de datos"
          trackColor={{ true: paleta.brand, false: paleta.surface300 }}
        />
        <Text style={{ color: paleta.ink, fontSize: 14, lineHeight: 21, flex: 1 }}>
          Acepto la política de tratamiento de datos conforme a la Ley 1581 de 2012.
        </Text>
      </View>

      {error && (
        <Text style={{ color: paleta.danger, fontSize: 13, fontWeight: '600' }}>{error}</Text>
      )}

      <Boton titulo="Crear cuenta" cargando={enviando} alPresionar={() => void registrar()} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s5, gap: espaciado.s4, paddingBottom: espaciado.s7 },
  consentimiento: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: espaciado.s3,
    marginTop: espaciado.s2,
  },
});
