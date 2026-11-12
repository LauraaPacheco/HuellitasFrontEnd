import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ilustracion, type VarianteIlustracion } from '@/componentes/Ilustracion';
import { espaciado, usarPaleta } from '@/temas';

interface Props {
  readonly titulo: string;
  readonly descripcion: string;
  /** Solo donde ayuda a distinguir una situación de otra. */
  readonly ilustracion?: VarianteIlustracion;
  readonly accion?: ReactNode;
}

/** Ninguna pantalla vacía se queda muda: explica qué pasa y qué hacer. */
export function EstadoVacio({ titulo, descripcion, ilustracion, accion }: Props) {
  const paleta = usarPaleta();
  return (
    <View style={estilos.contenedor}>
      {ilustracion && <Ilustracion variante={ilustracion} alto={140} />}
      <Text style={[estilos.titulo, { color: paleta.ink }]}>{titulo}</Text>
      <Text style={[estilos.texto, { color: paleta.inkMuted }]}>{descripcion}</Text>
      {accion && <View style={estilos.accion}>{accion}</View>}
    </View>
  );
}

const estilos = StyleSheet.create({
  // flexGrow: ocupa el alto libre de su contenedor (o de la lista vacia)
  // y centra el contenido ahi, como EstadoError y EstadoCargando.
  contenedor: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.s3, paddingVertical: espaciado.s6, paddingHorizontal: espaciado.s4 },
  titulo: { fontSize: 18, fontWeight: '700', textAlign: 'center' },
  texto: { fontSize: 15, lineHeight: 22, textAlign: 'center', maxWidth: 360 },
  accion: { marginTop: espaciado.s2, minWidth: 180 },
});
