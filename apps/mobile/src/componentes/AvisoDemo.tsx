import { StyleSheet, Text, View } from 'react-native';
import { CONTRASENA_DEMO } from '@huellitas/shared';
import { MODO_DEMO } from '@/lib/api';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * Recuerda que los datos son simulados. Desaparece sola al apagar
 * EXPO_PUBLIC_MODO_DEMO.
 */
export function AvisoDemo({ conCredenciales = false }: { readonly conCredenciales?: boolean }) {
  const paleta = usarPaleta();
  if (!MODO_DEMO) return null;

  return (
    <View style={[estilos.caja, { backgroundColor: paleta.accentTint }]}>
      <Text style={[estilos.texto, { color: paleta.ink }]}>
        <Text style={estilos.fuerte}>Modo demostración.</Text> Los datos son de
        ejemplo y no se guardan.
      </Text>
      {conCredenciales && (
        <Text style={[estilos.texto, { color: paleta.ink }]}>
          Entra con adoptante@huellitas.co y la contraseña {CONTRASENA_DEMO}.
        </Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { padding: espaciado.s3, borderRadius: radios.md, gap: espaciado.s1 },
  texto: { fontSize: 13, lineHeight: 20 },
  fuerte: { fontWeight: '700' },
});
