import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Boton } from './Boton';
import { Ilustracion } from './Ilustracion';
import { espaciado, usarPaleta } from '@/temas';

/**
 * Lo que ve el visitante donde hace falta una cuenta.
 *
 * Explica para qué la necesita y pone "Crear cuenta" primero: quien llega
 * aquí sin sesión casi siempre es alguien nuevo. Iniciar sesión queda como
 * enlace debajo, igual que en la ficha de la mascota.
 */
export function AvisoSesion({ titulo = 'Necesitas una cuenta', mensaje }: { readonly titulo?: string; readonly mensaje: string }) {
  const paleta = usarPaleta();
  const router = useRouter();

  return (
    <View style={[estilos.contenedor, { backgroundColor: paleta.surface100 }]}>
      <Ilustracion variante="trio" alto={150} />
      <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>{titulo}</Text>
      <Text style={[estilos.texto, { color: paleta.inkMuted }]}>{mensaje}</Text>
      <View style={estilos.acciones}>
        <Boton titulo="Crear cuenta" alPresionar={() => router.push('/registro')} />
        <Text style={[estilos.yaTengo, { color: paleta.inkMuted }]}>
          ¿Ya tienes cuenta?{' '}
          <Text
            accessibilityRole="link"
            onPress={() => router.push('/login')}
            style={{ color: paleta.brandStrong, fontWeight: '600', textDecorationLine: 'underline' }}
          >
            Inicia sesión
          </Text>
        </Text>
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    flex: 1,
    padding: espaciado.s5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: espaciado.s3,
  },
  titulo: { fontSize: 22, fontWeight: '700', textAlign: 'center', marginTop: espaciado.s2 },
  texto: { fontSize: 15, textAlign: 'center', lineHeight: 23, maxWidth: 340 },
  acciones: { alignSelf: 'stretch', gap: espaciado.s3, marginTop: espaciado.s3 },
  yaTengo: { fontSize: 14, textAlign: 'center' },
});
