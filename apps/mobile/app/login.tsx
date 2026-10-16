import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
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

export default function PantallaLogin() {
  const paleta = usarPaleta();
  const router = useRouter();
  // Esta pantalla va sin encabezado, asi que nada la protege de la barra
  // de estado: el relleno de arriba lo tiene que poner ella.
  const margenes = useSafeAreaInsets();
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
      router.replace('/(tabs)/catalogo');
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

  return (
    <ScrollView
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={[
        estilos.contenido,
        {
          paddingTop: margenes.top + espaciado.s5,
          paddingBottom: margenes.bottom + espaciado.s5,
        },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <View style={estilos.barra}>
        <BotonTema />
      </View>

      <View style={estilos.marca}>
        <Isotipo tamano={88} />
        <Text style={[estilos.nombre, { color: paleta.ink }]}>Huellitas</Text>
        <Text style={{ color: paleta.inkMuted, fontSize: 14 }}>Adopta y acompaña</Text>
      </View>

      <View style={estilos.formulario}>
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
          marcador="Mínimo 8 caracteres"
          esContrasena
          autoComplete="password"
          error={error ?? undefined}
        />

        <Boton titulo="Iniciar sesión" cargando={enviando} alPresionar={() => void entrar()} />

        <Link
          href="/olvide-contrasena"
          style={{
            color: paleta.brandStrong,
            fontWeight: '600',
            textAlign: 'center',
            paddingVertical: espaciado.s2,
          }}
        >
          Olvidé mi contraseña
        </Link>

        <View style={[estilos.aviso, { backgroundColor: paleta.brandTint }]}>
          <Text style={{ color: paleta.ink, fontSize: 13, lineHeight: 20 }}>
            Si aún no confirmas tu correo, puedes entrar y mirar, pero no
            postularte ni reportar.
          </Text>
        </View>
      </View>

      <View style={estilos.pie}>
        <Boton
          titulo="Entrar como visitante"
          variante="secundario"
          alPresionar={() => router.replace('/(tabs)/catalogo')}
        />
        <Text style={{ color: paleta.inkMuted, textAlign: 'center', fontSize: 14 }}>
          ¿No tienes cuenta?{' '}
          <Link href="/registro" style={{ color: paleta.brandStrong, fontWeight: '600' }}>
            Regístrate
          </Link>
        </Text>
      </View>
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: {
    flexGrow: 1,
    paddingHorizontal: espaciado.s5,
    gap: espaciado.s6,
  },
  // El relleno de arriba lo pone la pantalla con los margenes del
  // telefono, no esta hoja: sin eso el boton quedaba pegado a la barra
  // de estado y se leia como un control del sistema.
  barra: { alignItems: 'flex-end' },
  marca: { alignItems: 'center', gap: espaciado.s2 },
  nombre: { fontSize: 40, fontWeight: '700', letterSpacing: -1 },
  formulario: { gap: espaciado.s4 },
  aviso: { padding: espaciado.s4, borderRadius: radios.md },
  pie: { marginTop: 'auto', gap: espaciado.s3 },
});
