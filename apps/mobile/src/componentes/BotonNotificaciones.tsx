import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import { useSesion } from '@/lib/sesion';
import { useNotificaciones } from '@/lib/notificaciones';
import { radios, usarPaleta } from '@/temas';

/** Campana del encabezado con el número de notificaciones sin leer. Solo con sesión. */
export function BotonNotificaciones() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { usuario } = useSesion();
  const { sinLeer } = useNotificaciones();
  if (!usuario) return null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sinLeer ? `Notificaciones, ${sinLeer} sin leer` : 'Notificaciones'}
      hitSlop={6}
      onPress={() => router.push('/notificaciones')}
      style={({ pressed }) => [estilos.boton, { borderColor: paleta.border, backgroundColor: paleta.surface100, opacity: pressed ? 0.7 : 1 }]}
    >
      <Bell size={20} strokeWidth={1.75} color={paleta.ink} />
      {sinLeer > 0 && (
        <View style={[estilos.contador, { backgroundColor: paleta.accent }]}>
          <Text style={estilos.contadorTexto}>{sinLeer > 9 ? '9+' : sinLeer}</Text>
        </View>
      )}
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  boton: { width: 44, height: 44, borderRadius: radios.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  contador: { position: 'absolute', top: -3, right: -3, minWidth: 18, height: 18, paddingHorizontal: 4, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  contadorTexto: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
});
