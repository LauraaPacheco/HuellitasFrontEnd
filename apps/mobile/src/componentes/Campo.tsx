import { StyleSheet, Text, TextInput, View, type KeyboardTypeOptions } from 'react-native';
import { espaciado, radios, usarPaleta } from '@/temas';

interface Props {
  readonly etiqueta: string;
  readonly valor: string;
  readonly alCambiar: (valor: string) => void;
  readonly marcador?: string;
  readonly ayuda?: string;
  readonly error?: string;
  readonly esContrasena?: boolean;
  readonly tipoTeclado?: KeyboardTypeOptions;
  readonly autoComplete?: 'email' | 'tel' | 'password' | 'name' | 'off';
}

export function Campo({
  etiqueta,
  valor,
  alCambiar,
  marcador,
  ayuda,
  error,
  esContrasena = false,
  tipoTeclado = 'default',
  autoComplete = 'off',
}: Props) {
  const paleta = usarPaleta();

  return (
    <View style={estilos.grupo}>
      <Text style={[estilos.etiqueta, { color: paleta.ink }]}>{etiqueta}</Text>
      <TextInput
        accessibilityLabel={etiqueta}
        value={valor}
        onChangeText={alCambiar}
        placeholder={marcador}
        placeholderTextColor={paleta.inkMuted}
        secureTextEntry={esContrasena}
        keyboardType={tipoTeclado}
        autoCapitalize={tipoTeclado === 'email-address' ? 'none' : 'sentences'}
        autoComplete={autoComplete}
        style={[
          estilos.control,
          {
            borderColor: error ? paleta.danger : paleta.border,
            backgroundColor: paleta.surface100,
            color: paleta.ink,
          },
        ]}
      />
      {ayuda && <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>{ayuda}</Text>}
      {error && <Text style={[estilos.error, { color: paleta.danger }]}>{error}</Text>}
    </View>
  );
}

const estilos = StyleSheet.create({
  grupo: { gap: espaciado.s1 },
  etiqueta: { fontSize: 13, fontWeight: '600' },
  control: {
    height: 52,
    paddingHorizontal: espaciado.s4,
    borderWidth: 1,
    borderRadius: radios.sm,
    fontSize: 16,
  },
  ayuda: { fontSize: 12 },
  error: { fontSize: 13, fontWeight: '600' },
});
