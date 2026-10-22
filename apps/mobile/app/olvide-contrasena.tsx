import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { ErrorHttp, esCorreoValido } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { Ilustracion } from '@/componentes/Ilustracion';
import { espaciado, radios, usarPaleta } from '@/temas';

/** HU-USU-03: solicita el token de recuperación por correo. */
export default function PantallaOlvideContrasena() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { height } = useWindowDimensions();
  const [correo, setCorreo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar() {
    setError(null);
    if (!esCorreoValido(correo)) {
      setError('Escribe un correo válido.');
      return;
    }

    setEnviando(true);
    try {
      await api.autenticacion.olvideContrasena({ correo: correo.trim() });
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

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: paleta.surface100 }}
      contentContainerStyle={[
        estilos.contenido,
        { paddingBottom: espaciado.s5 + height * 0.18 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Ilustracion variante="restablecer" />

      {enviado ? (
        <View style={[estilos.aviso, { backgroundColor: paleta.brandTint }]}>
          <Text style={{ color: paleta.ink, fontSize: 15, lineHeight: 23 }}>
            Si {correo} tiene una cuenta en Huellitas, le mandamos un código
            para crear una contraseña nueva. Vence en 30 minutos.
          </Text>
          <Text style={{ color: paleta.inkMuted, fontSize: 13, lineHeight: 20 }}>
            ¿No llegó? Mira en el correo no deseado antes de volver a pedirlo.
          </Text>
          <Boton titulo="Ya tengo el código" alPresionar={() => router.push('/restablecer-contrasena')} />
          <Boton titulo="Solicitar otro código" variante="secundario" alPresionar={() => setEnviado(false)} />
        </View>
      ) : (
        <>
          <Text style={[estilos.texto, { color: paleta.inkMuted }]}>
            Escribe el correo con el que entras y te mandamos un código para
            cambiar la contraseña.
          </Text>
          <Campo
            etiqueta="Correo"
            valor={correo}
            alCambiar={setCorreo}
            marcador="tucorreo@ejemplo.com"
            tipoTeclado="email-address"
            autoComplete="email"
            error={error ?? undefined}
          />
          <Boton
            titulo="Enviar código"
            cargando={enviando}
            alPresionar={() => void enviar()}
          />
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: espaciado.s5,
    gap: espaciado.s4,
  },
  texto: { fontSize: 15, lineHeight: 23 },
  aviso: { padding: espaciado.s4, borderRadius: radios.md, gap: espaciado.s2 },
});
