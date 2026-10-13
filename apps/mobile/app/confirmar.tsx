import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { ErrorHttp, esCorreoValido } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { espaciado, radios, usarPaleta } from '@/temas';

type Estado = 'verificando' | 'lista' | 'fallo' | 'esperando';

function Sello({ bien }: { readonly bien: boolean }) {
  const paleta = usarPaleta();
  return (
    <View
      style={[
        estilos.sello,
        { backgroundColor: bien ? paleta.brandTint : paleta.accentTint },
      ]}
    >
      <Svg width={30} height={30} viewBox="0 0 24 24" fill="none">
        <Path
          d={bien ? 'M4 12.5l5.5 5.5L20 7' : 'M12 7v6m0 4h.01M12 3l9 16H3z'}
          stroke={bien ? paleta.brandStrong : paleta.danger}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

/**
 * Pantalla de verificación del correo. Sirve para dos momentos:
 *
 * 1. Justo después del registro, sin token: dice que revise el correo y
 *    deja reenviar el enlace.
 * 2. Al volver desde el correo por el enlace profundo
 *    huellitas://confirmar?token=…, que expo-router enruta aquí solo
 *    porque el scheme del app.json es "huellitas".
 */
export default function PantallaConfirmar() {
  const paleta = usarPaleta();
  const router = useRouter();
  const parametros = useLocalSearchParams<{ token?: string; correo?: string }>();
  const token = parametros.token;

  const [estado, setEstado] = useState<Estado>(token ? 'verificando' : 'esperando');
  const [motivo, setMotivo] = useState<string | null>(null);
  const [correo, setCorreo] = useState(parametros.correo ?? '');
  const [error, setError] = useState<string | null>(null);
  const [reenviando, setReenviando] = useState(false);
  const [reenviado, setReenviado] = useState(false);

  // El token se quema al usarlo: un segundo intento fallaria.
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

  async function reenviar() {
    setError(null);
    if (!esCorreoValido(correo)) {
      setError('Escribe un correo válido.');
      return;
    }

    setReenviando(true);
    try {
      await api.autenticacion.reenviarVerificacion(correo);
      setReenviado(true);
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp
          ? (causa.detalle ?? causa.message)
          : 'No pudimos reenviar el correo. Inténtalo más tarde.',
      );
    } finally {
      setReenviando(false);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.contenido}
      keyboardShouldPersistTaps="handled"
    >
      {estado === 'verificando' && (
        <View style={estilos.bloque}>
          <Text style={[estilos.titulo, { color: paleta.ink }]}>
            Confirmando tu correo
          </Text>
          <Text style={[estilos.texto, { color: paleta.inkMuted }]} accessibilityRole="text">
            Estamos verificando el enlace…
          </Text>
        </View>
      )}

      {estado === 'lista' && (
        <>
          <View style={estilos.bloque}>
            <Sello bien />
            <Text style={[estilos.titulo, { color: paleta.ink }]}>Cuenta verificada</Text>
            <Text style={[estilos.texto, { color: paleta.inkMuted }]}>
              Ya puedes entrar y postularte a una adopción.
            </Text>
          </View>
          <Boton titulo="Iniciar sesión" alPresionar={() => router.replace('/login')} />
        </>
      )}

      {(estado === 'esperando' || estado === 'fallo') && (
        <>
          <View style={estilos.bloque}>
            {estado === 'fallo' && <Sello bien={false} />}
            <Text style={[estilos.titulo, { color: paleta.ink }]}>
              {estado === 'fallo' ? 'Este enlace ya no sirve' : 'Revisa tu correo'}
            </Text>
            <Text style={[estilos.texto, { color: paleta.inkMuted }]}>
              {estado === 'fallo'
                ? (motivo ?? 'El enlace venció o ya fue usado.')
                : 'Te mandamos un enlace para confirmar tu cuenta. Ábrelo desde este teléfono y vuelves aquí solo.'}
            </Text>
          </View>

          {reenviado ? (
            <View style={[estilos.aviso, { backgroundColor: paleta.brandTint }]}>
              <Text style={{ color: paleta.ink, fontSize: 14, lineHeight: 21 }}>
                Listo, va en camino a {correo}. Revisa también el correo no
                deseado.
              </Text>
            </View>
          ) : (
            <>
              <Campo
                etiqueta="Tu correo"
                valor={correo}
                alCambiar={setCorreo}
                marcador="tucorreo@ejemplo.com"
                tipoTeclado="email-address"
                autoComplete="email"
                error={error ?? undefined}
              />
              <Boton
                titulo="Reenviar el enlace"
                variante="secundario"
                cargando={reenviando}
                alPresionar={() => void reenviar()}
              />
            </>
          )}

          <View style={estilos.pie}>
            <Boton
              titulo="Entrar como visitante"
              variante="secundario"
              alPresionar={() => router.replace('/(tabs)/catalogo')}
            />
            <Text style={[estilos.texto, { color: paleta.inkMuted, fontSize: 13 }]}>
              Sin confirmar puedes mirar el catálogo, pero no postularte ni
              reportar.
            </Text>
          </View>
        </>
      )}
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    padding: espaciado.s5,
    paddingTop: espaciado.s6,
    gap: espaciado.s4,
  },
  bloque: { alignItems: 'center', gap: espaciado.s3, marginBottom: espaciado.s2 },
  sello: {
    width: 60,
    height: 60,
    borderRadius: radios.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titulo: { fontSize: 24, fontWeight: '700', textAlign: 'center' },
  texto: { fontSize: 15, lineHeight: 23, textAlign: 'center' },
  aviso: { padding: espaciado.s4, borderRadius: radios.md },
  pie: { marginTop: 'auto', gap: espaciado.s3 },
});
