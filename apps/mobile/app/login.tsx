import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { X } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorHttp, esCorreoValido } from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { Isotipo } from '@/componentes/Isotipo';
import { AvisoDemo } from '@/componentes/AvisoDemo';
import { BotonTema } from '@/componentes/BotonTema';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * Inicio de sesion.
 *
 * Misma composicion que el login de la web en celular: barra con la marca
 * y el tema, titulo con su ayuda, formulario, la opcion de crear cuenta
 * y las notas legales en pequeño al final.
 */
export default function PantallaLogin() {
  const paleta = usarPaleta();
  const router = useRouter();
  // Sin encabezado: el relleno contra la barra de estado lo pone la pantalla.
  const margenes = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  // Aire sobre el titulo como en la web (6 % del alto), sin forzar scroll.
  const aireSuperior = Math.max(espaciado.s4, Math.min(64, height * 0.06));
  const { iniciarSesion } = useSesion();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setError(null);
    if (!esCorreoValido(correo)) {
      setError('Escribe un correo válido.');
      return;
    }
    setEnviando(true);
    try {
      await iniciarSesion({ correo, contrasena });
      router.replace('/principal/catalogo');
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp && causa.estadoHttp === 0
          ? causa.message
          : 'El correo o la contraseña no coinciden.',
      );
    } finally {
      setEnviando(false);
    }
  }

  const enlace = { color: paleta.brandStrong, fontWeight: '600' as const, textDecorationLine: 'underline' as const };

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: paleta.surface100 }}
      contentContainerStyle={[
        estilos.contenido,
        { paddingTop: margenes.top + espaciado.s3, paddingBottom: margenes.bottom + espaciado.s5 },
      ]}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
      alwaysBounceVertical={false}
    >
      <View style={estilos.barra}>
        {/* Se llega aqui desde el catalogo o al intentar una accion: la X
            devuelve a donde estaba. Sin historial, al catalogo. */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cerrar y volver"
          hitSlop={8}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/principal/catalogo'))}
          style={({ pressed }) => [estilos.cerrar, { borderColor: paleta.border, backgroundColor: pressed ? paleta.surface300 : paleta.surface100 }]}
        >
          <X size={20} strokeWidth={1.75} color={paleta.ink} />
        </Pressable>
        <View style={estilos.marca}>
          <Isotipo tamano={36} />
          <Text style={[estilos.nombre, { color: paleta.ink }]}>Huellitas</Text>
        </View>
        <BotonTema conEtiqueta />
      </View>

      <View style={[estilos.formulario, { marginTop: aireSuperior }]}>
        <View style={estilos.titulos}>
          <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>
            Iniciar sesión
          </Text>
          <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>
            Ingresa con tu cuenta para postularte y seguir tus solicitudes
          </Text>
        </View>

        <AvisoDemo conCredenciales />

        <Campo
          etiqueta="Correo"
          valor={correo}
          alCambiar={setCorreo}
          marcador="tucorreo@ejemplo.com"
          tipoTeclado="email-address"
          autoComplete="email"
        />
        <Campo
          etiqueta="Contraseña"
          valor={contrasena}
          alCambiar={setContrasena}
          esContrasena
          autoComplete="password"
          error={error ?? undefined}
        />

        <View style={estilos.fila}>
          <Link href="/olvide-contrasena" style={[enlace, { fontSize: 14 }]}>
            Olvidé mi contraseña
          </Link>
        </View>

        <Boton titulo="Iniciar sesión" cargando={enviando} alPresionar={() => void entrar()} />

        {/* Crear cuenta con el mismo peso que entrar: es la otra puerta. */}
        <View style={estilos.separador}>
          <View style={[estilos.linea, { backgroundColor: paleta.border }]} />
          <Text style={[estilos.separadorTexto, { color: paleta.inkMuted }]}>¿No tienes cuenta?</Text>
          <View style={[estilos.linea, { backgroundColor: paleta.border }]} />
        </View>
        <Boton titulo="Crear cuenta" variante="secundario" alPresionar={() => router.push('/registro')} />
      </View>

      <View style={estilos.notas}>
        <Text style={[estilos.nota, { color: paleta.inkMuted }]}>
          Si aún no confirmas tu correo, puedes entrar y mirar, pero no postularte ni reportar.
        </Text>
        <Text style={[estilos.nota, { color: paleta.inkMuted }]}>Tus datos se tratan según la Ley 1581 de 2012</Text>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espaciado.s4,
  },
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s3 },
  marca: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  cerrar: { width: 44, height: 44, borderRadius: radios.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  separador: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3, marginTop: espaciado.s2 },
  linea: { flex: 1, height: 1 },
  separadorTexto: { fontSize: 13 },
  nombre: { fontSize: 24, fontWeight: '700', letterSpacing: -0.5 },
  formulario: { gap: espaciado.s4 },
  titulos: { gap: espaciado.s2, marginBottom: espaciado.s1 },
  titulo: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5 },
  ayuda: { fontSize: 15, lineHeight: 23 },
  fila: { alignItems: 'flex-end', marginTop: -espaciado.s1 },
  notas: { marginTop: 'auto', paddingTop: espaciado.s5, gap: 2, alignItems: 'center' },
  nota: { fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
