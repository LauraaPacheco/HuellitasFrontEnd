import { StyleSheet, Text, View } from 'react-native';
import { explicarError } from '@huellitas/shared';
import { Ilustracion } from '@/componentes/Ilustracion';
import { Boton } from '@/componentes/Boton';
import { espaciado, usarPaleta } from '@/temas';

interface Props {
  /** Qué no se pudo cargar: "No pudimos cargar las mascotas". */
  readonly titulo: string;
  readonly error: unknown;
  readonly alReintentar: () => void;
  readonly reintentando?: boolean;
}

/**
 * Pantalla cuya consulta principal falló. Igual que en la web: la
 * ilustración de las mascotas confundidas (o con candado si es un
 * permiso), un mensaje según el tipo de fallo y el botón de reintentar,
 * centrado en el espacio libre.
 */
export function EstadoError({ titulo, error, alReintentar, reintentando = false }: Props) {
  const paleta = usarPaleta();
  const { tipo, texto } = explicarError(error);

  return (
    <View accessibilityRole="alert" style={estilos.contenedor}>
      <Ilustracion variante={tipo === 'permiso' ? 'bloqueo' : 'confundido'} alto={150} />
      <Text style={[estilos.titulo, { color: paleta.ink }]}>{titulo}</Text>
      <Text style={[estilos.texto, { color: paleta.inkMuted }]}>{texto}</Text>
      {/* Reintentar no arregla un permiso que falta. */}
      {tipo !== 'permiso' && (
        <View style={estilos.accion}>
          <Boton titulo="Reintentar" cargando={reintentando} alPresionar={alReintentar} />
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, minHeight: 320, alignItems: 'center', justifyContent: 'center', gap: espaciado.s3, padding: espaciado.s6 },
  titulo: { fontSize: 19, fontWeight: '700', textAlign: 'center' },
  texto: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  accion: { marginTop: espaciado.s2, minWidth: 180 },
});
