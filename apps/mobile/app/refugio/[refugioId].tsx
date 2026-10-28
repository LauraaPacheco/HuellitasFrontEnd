import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { AtSign, BadgeCheck, CircleCheck, HouseHeart, Mail, MapPin, Phone, type LucideIcon } from 'lucide-react-native';
import { EstadoVerificacion } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { espaciado, usarTema } from '@/temas';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PantallaRefugio() {
  const { paleta, tema } = usarTema();
  const margenes = useSafeAreaInsets();
  const [pestana, setPestana] = useState<'informacion' | 'requisitos'>('informacion');
  const id = Number(useLocalSearchParams<{ refugioId: string }>().refugioId);
  const valido = Number.isSafeInteger(id) && id > 0;
  const consulta = useQuery({ queryKey: ['perfil-publico-refugio', id], queryFn: () => api.refugios.obtener(id), enabled: valido, retry: false });
  const refugio = consulta.data;
  const azul = tema === 'oscuro' ? { fondo: '#1b304a', texto: '#a8ccff' } : { fondo: '#e7f0fc', texto: '#215b9a' };
  if (consulta.isPending && valido) return <Text style={{ padding: 24, color: paleta.ink }}>Cargando refugio…</Text>;
  if (!valido || consulta.isError || !refugio || refugio.estadoVerificacion !== EstadoVerificacion.Verificado) return (
    <View style={{ padding: espaciado.s5, gap: espaciado.s4, backgroundColor: paleta.surface100, flex: 1 }}>
      <Text accessibilityRole="alert" style={{ color: paleta.ink }}>El perfil no está disponible o el refugio aún no está verificado.</Text>
      {valido && <Boton titulo="Reintentar" alPresionar={() => void consulta.refetch()} />}
    </View>
  );
  const requisitos = refugio.requisitos.filter(r => r.activo).sort((a, b) => a.orden - b.orden);
  return <ScrollView style={{ flex: 1, backgroundColor: paleta.surface100 }} contentContainerStyle={[estilos.contenido, { paddingBottom: margenes.bottom + 24 }]}>
    <View style={estilos.cabecera}>
      <View style={[estilos.simbolo, { backgroundColor: paleta.surface200 }]}><HouseHeart size={29} strokeWidth={1.8} color={paleta.brandStrong} /></View>
      <View style={estilos.identidad}>
        <Text accessibilityRole="header" style={[estilos.nombre, { color: paleta.ink }]}>{refugio.nombre}</Text>
        <View style={[estilos.verificacion, { backgroundColor: azul.fondo }]}><BadgeCheck size={16} color={azul.texto} /><Text style={{ color: azul.texto, fontSize: 12 }}>Verificado</Text></View>
      </View>
    </View>
    <Text style={{ color: paleta.inkMuted, fontSize: 14, lineHeight: 23 }}>{refugio.descripcion || 'El refugio todavía no agregó una descripción.'}</Text>
    <View accessibilityRole="tablist" accessibilityLabel="Información del refugio" style={[estilos.selector, { backgroundColor: paleta.surface200 }]}>
      {(['informacion', 'requisitos'] as const).map(valor => <Pressable key={valor} accessibilityRole="tab" accessibilityState={{ selected: pestana === valor }} onPress={() => setPestana(valor)} style={({ pressed }) => [estilos.pestana, { backgroundColor: pestana === valor ? paleta.surface300 : 'transparent', opacity: pressed ? 0.7 : 1 }]}>
        <Text style={{ color: pestana === valor ? paleta.brandStrong : paleta.inkMuted, fontSize: 13, fontWeight: pestana === valor ? '600' : '400', textAlign: 'center' }}>{valor === 'informacion' ? 'Información' : `Requisitos · ${requisitos.length}`}</Text>
      </Pressable>)}
    </View>
    <View style={[estilos.tarjeta, { backgroundColor: paleta.surface200 }]}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>{pestana === 'informacion' ? 'Contacto y ubicación' : 'Requisitos para adoptar'}</Text>
      {pestana === 'informacion' ? <>
        <Contacto icono={MapPin} etiqueta="Dirección" valor={refugio.direccion} />
        <Contacto icono={Phone} etiqueta="Teléfono" valor={refugio.telefono} />
        <Contacto icono={Mail} etiqueta="Correo de contacto" valor={refugio.correo} />
        <Contacto icono={AtSign} etiqueta="Redes sociales" valor={refugio.redesSociales} ultimo />
      </> : <>
        <Text style={{ color: paleta.inkMuted, fontSize: 14, lineHeight: 21, marginBottom: 8 }}>Consulta las condiciones antes de enviar tu solicitud.</Text>
        {requisitos.length ? requisitos.map((r, i) => <View key={r.id} style={[estilos.fila, { borderBottomColor: paleta.border, borderBottomWidth: i === requisitos.length - 1 ? 0 : 1 }]}>
          <CircleCheck size={19} color={paleta.brandStrong} strokeWidth={1.8} />
          <View style={estilos.detalle}><Text style={{ color: paleta.ink, fontSize: 14, lineHeight: 21 }}>{r.descripcion}</Text><Text style={{ color: paleta.inkMuted, fontSize: 12, marginTop: 4 }}>{r.esObligatorio ? 'Obligatorio' : 'Opcional'}</Text></View>
        </View>) : <Text style={{ color: paleta.inkMuted, lineHeight: 21 }}>El refugio todavía no publicó sus requisitos. Consulta sus condiciones antes de postularte.</Text>}
      </>}
    </View>
  </ScrollView>;
}
function Contacto({ icono: Icono, etiqueta, valor, ultimo = false }: { icono: LucideIcon; etiqueta: string; valor?: string | null; ultimo?: boolean }) {
  const { paleta } = usarTema();
  return <View style={[estilos.fila, { borderBottomColor: paleta.border, borderBottomWidth: ultimo ? 0 : 1 }]}>
    <Icono size={20} color={paleta.brandStrong} strokeWidth={1.8} />
    <View style={estilos.detalle}><Text style={{ color: paleta.inkMuted, fontSize: 12, marginBottom: 5 }}>{etiqueta}</Text><Text selectable style={{ color: paleta.ink, fontSize: 14, lineHeight: 21 }}>{valor || 'Sin información'}</Text></View>
  </View>;
}
const estilos = StyleSheet.create({
  contenido: { padding: 20, gap: 20 }, cabecera: { flexDirection: 'row', alignItems: 'center', gap: 16 }, simbolo: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, identidad: { flex: 1, minWidth: 0, gap: 10 }, nombre: { fontSize: 21, lineHeight: 26, fontWeight: '700' }, verificacion: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 10 }, selector: { flexDirection: 'row', borderRadius: 21, padding: 5, gap: 6 }, pestana: { flex: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 6, minHeight: 44, justifyContent: 'center' }, tarjeta: { borderRadius: 21, padding: 19 }, titulo: { fontSize: 17, fontWeight: '600', marginBottom: 12 }, fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 }, detalle: { flex: 1, minWidth: 0 },
});
