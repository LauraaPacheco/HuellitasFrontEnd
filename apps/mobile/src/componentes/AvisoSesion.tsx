import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from './Boton';
import { espaciado, usarPaleta } from '@/temas';

/**
 * Lo que ve el visitante donde hace falta una cuenta.
 * Explica por qué, en vez de solo bloquear.
 */
export function AvisoSesion({ mensaje }: { readonly mensaje: string }) {
  const paleta = usarPaleta();
  const router = useRouter();

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.surface100 }]}>
      <Text style={[estilos.titulo, { color: paleta.ink }]}>Necesitas una cuenta</Text>
      <Text style={[estilos.texto, { color: paleta.inkMuted }]}>{mensaje}</Text>
      <View style={estilos.acciones}>
        <Boton titulo="Iniciar sesión" alPresionar={() => router.push('/login')} />
        <Boton
          titulo="Crear cuenta"
          variante="secundario"
          alPresionar={() => router.push('/registro')}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: espaciado.s6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.s3,
  },
  titulo: { fontSize: 19, fontWeight: '700' },
  texto: { fontSize: 15, textAlign: 'center', lineHeight: 23 },
  acciones: { alignSelf: 'stretch', gap: espaciado.s3, marginTop: espaciado.s3 },
});
