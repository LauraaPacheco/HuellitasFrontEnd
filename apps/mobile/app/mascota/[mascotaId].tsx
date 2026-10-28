import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, Calendar, ChevronRight, HouseHeart, ImageIcon, Mars, Pill, ShieldCheck, Stethoscope, Syringe, Venus, type LucideIcon } from 'lucide-react-native';
import { ESTADO_MASCOTA, ETIQUETA_SEXO, ETIQUETA_TIPO_REGISTRO_CLINICO, EstadoMascota, Sexo, TipoRegistroClinico, formatearFecha } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { usarPaleta } from '@/temas';

export default function PantallaMascota() {
  const paleta = usarPaleta(); const router = useRouter(); const margenes = useSafeAreaInsets();
  const { usuario } = useSesion();
  const { mascotaId: parametro } = useLocalSearchParams<{ mascotaId: string }>();
  const mascotaId = Number(parametro); const valido = Number.isSafeInteger(mascotaId) && mascotaId > 0;
  const [ancho, setAncho] = useState(320); const [fotoActual, setFotoActual] = useState(0);
  const consulta = useQuery({ queryKey: ['mascota', mascotaId], queryFn: () => api.mascotas.obtenerFicha(mascotaId), enabled: valido, retry: false });
  const clinica = useQuery({ queryKey: ['mascota-demo', mascotaId], queryFn: () => api.mascotas.obtener(mascotaId), enabled: MODO_DEMO && valido, retry: false });
  const mascota = consulta.data;
  const disponible = mascota?.estado === EstadoMascota.Disponible || mascota?.estado === EstadoMascota.EnProceso;
  const volver = () => router.canGoBack() ? router.back() : router.replace('/principal/catalogo');
  const iconosClinicos: Record<TipoRegistroClinico, LucideIcon> = { [TipoRegistroClinico.Vacuna]: Syringe, [TipoRegistroClinico.Desparasitacion]: Pill, [TipoRegistroClinico.Esterilizacion]: ShieldCheck, [TipoRegistroClinico.Diagnostico]: Stethoscope, [TipoRegistroClinico.Tratamiento]: Pill };
  return <View onLayout={e => setAncho(e.nativeEvent.layout.width)} style={{ flex: 1, backgroundColor: paleta.surface100 }}>
    <ScrollView contentContainerStyle={{ paddingBottom: margenes.bottom + 28 }}>
      <View style={{ paddingTop: margenes.top, backgroundColor: paleta.surface200, borderBottomLeftRadius: 26, borderBottomRightRadius: 26, overflow: 'hidden' }}>
        {mascota?.fotos.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} accessibilityLabel="Fotos de la mascota" onMomentumScrollEnd={e => setFotoActual(Math.round(e.nativeEvent.contentOffset.x / ancho))}>
          {mascota.fotos.map((uri, i) => <FotoPublica key={`${uri}-${i}`} uri={uri} nombre={`${mascota.nombre}, foto ${i + 1}`} ancho={ancho} />)}
        </ScrollView> : <View style={estilos.sinFoto}><ImageIcon size={27} color={paleta.inkMuted} /><Text style={{ color: paleta.inkMuted, fontSize: 13 }}>{consulta.isPending && valido ? 'Cargando ficha…' : 'Sin fotos por ahora'}</Text></View>}
        {mascota && mascota.fotos.length > 1 && <View style={[estilos.contador, { backgroundColor: paleta.surface100 }]}><Text style={{ color: paleta.ink, fontSize: 12 }}>{Math.min(fotoActual + 1, mascota.fotos.length)} / {mascota.fotos.length}</Text></View>}
        <Pressable accessibilityRole="button" accessibilityLabel="Volver al catálogo" onPress={volver} style={({ pressed }) => [estilos.volver, { top: margenes.top + 12, backgroundColor: paleta.surface100, opacity: pressed ? 0.7 : 1 }]}><ArrowLeft size={22} color={paleta.ink} /></Pressable>
      </View>
      <View style={estilos.contenido}>
        {consulta.isPending && valido ? <ActivityIndicator color={paleta.brandStrong} /> : !mascota || !valido ? <><Text accessibilityRole="alert" style={{ color: paleta.ink }}>No pudimos consultar esta mascota.</Text>{valido && <Boton titulo="Reintentar" alPresionar={() => void consulta.refetch()} />}</> : <>
          <View><View style={estilos.nombreFila}><Text accessibilityRole="header" style={[estilos.nombre, { color: paleta.ink }]}>{mascota.nombre}</Text><Insignia estado={ESTADO_MASCOTA[mascota.estado]} /></View><Text style={{ color: paleta.inkMuted, fontSize: 14, marginTop: 7 }}>{[mascota.especie, mascota.raza].filter(Boolean).join(' · ')}</Text></View>
          <View style={[estilos.datos, { backgroundColor: paleta.surface200 }]}>
            <Dato icono={Calendar} etiqueta="Edad" valor={mascota.edadAproximada === null ? 'Sin dato' : `${mascota.edadAproximada} ${mascota.edadAproximada === 1 ? 'año' : 'años'}`} />
            <Dato icono={mascota.sexo === Sexo.Macho ? Mars : Venus} etiqueta="Sexo" valor={ETIQUETA_SEXO[mascota.sexo]} />
            <Dato icono={ShieldCheck} etiqueta="Esterilizad@" valor={mascota.esterilizada ? 'Sí' : 'No'} ultimo />
          </View>
          <View style={estilos.seccion}><Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>Conoce a {mascota.nombre}</Text><Text style={{ color: paleta.inkMuted, fontSize: 14, lineHeight: 23 }}>{mascota.descripcion || 'El refugio todavía no agregó una descripción.'}</Text></View>
          {MODO_DEMO && <View style={[estilos.tarjeta, { backgroundColor: paleta.surface200 }]}><Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>Salud y cuidados</Text>
            {clinica.isPending ? <ActivityIndicator /> : clinica.isError ? <><Text style={{ color: paleta.inkMuted }}>No pudimos cargar el historial.</Text><Boton titulo="Reintentar" variante="secundario" alPresionar={() => void clinica.refetch()} /></> : !clinica.data?.historialClinico.length ? <Text style={{ color: paleta.inkMuted }}>El refugio todavía no ha cargado atenciones.</Text> : clinica.data.historialClinico.map(registro => {
              const Icono = iconosClinicos[registro.tipo] ?? Stethoscope;
              return <View key={registro.id} style={estilos.evento}><Icono size={19} color={paleta.inkMuted} strokeWidth={1.8} /><View style={{ flex: 1 }}><Text style={{ color: paleta.ink, fontSize: 14 }}>{ETIQUETA_TIPO_REGISTRO_CLINICO[registro.tipo]}</Text><Text style={{ color: paleta.inkMuted, fontSize: 12, marginTop: 5 }}>{formatearFecha(registro.fecha)}</Text></View></View>;
            })}
          </View>}
          {mascota.refugioId !== undefined ? <Pressable accessibilityRole="button" accessibilityLabel={`Conocer ${mascota.refugioNombre} y sus requisitos`} onPress={() => router.push(`/refugio/${mascota.refugioId}`)} style={({ pressed }) => [estilos.refugio, { backgroundColor: paleta.surface200, opacity: pressed ? 0.7 : 1 }]}><HouseHeart size={21} color={paleta.inkMuted} /><View style={{ flex: 1 }}><Text style={{ color: paleta.ink, fontSize: 14, fontWeight: '600' }}>{mascota.refugioNombre}</Text><Text style={{ color: paleta.inkMuted, fontSize: 12, marginTop: 5 }}>Conocer el refugio y sus requisitos</Text></View><ChevronRight size={18} color={paleta.inkMuted} /></Pressable> : <View style={[estilos.refugio, { backgroundColor: paleta.surface200 }]}><HouseHeart size={21} color={paleta.inkMuted} /><View style={{ flex: 1 }}><Text style={{ color: paleta.ink, fontWeight: '600' }}>{mascota.refugioNombre}</Text>{mascota.refugioTelefono && <Text selectable style={{ color: paleta.inkMuted, marginTop: 5 }}>{mascota.refugioTelefono}</Text>}</View></View>}
          <Boton titulo={!disponible ? 'Esta mascota no admite postulaciones' : usuario ? 'Postularme para adoptar' : 'Inicia sesión para postularte'} deshabilitado={!disponible} alPresionar={() => router.push(usuario ? `/postular/${mascotaId}` : '/login')} />
        </>}
      </View>
    </ScrollView>
  </View>;
}
function FotoPublica({ uri, nombre, ancho }: { uri: string; nombre: string; ancho: number }) {
  const [fallo, setFallo] = useState(false); const paleta = usarPaleta();
  return fallo ? <View style={[estilos.sinFoto, { width: ancho, height: 280 }]}><ImageIcon size={27} color={paleta.inkMuted} /><Text style={{ color: paleta.inkMuted }}>No pudimos cargar esta foto.</Text></View> : <Image source={{ uri }} accessibilityLabel={nombre} onError={() => setFallo(true)} resizeMode="contain" style={{ width: ancho, height: 280, backgroundColor: paleta.surface200 }} />;
}
function Dato({ icono: Icono, etiqueta, valor, ultimo }: { icono: LucideIcon; etiqueta: string; valor: string; ultimo?: boolean }) {
  const paleta = usarPaleta();
  return <View style={[estilos.dato, { borderRightWidth: ultimo ? 0 : 1, borderRightColor: paleta.border }]}><Icono size={19} strokeWidth={1.8} color={paleta.inkMuted} /><Text style={{ color: paleta.ink, fontSize: 14, textAlign: 'center', fontWeight: '500' }}>{valor}</Text><Text style={{ color: paleta.inkMuted, fontSize: 11, textAlign: 'center' }}>{etiqueta}</Text></View>;
}
const estilos = StyleSheet.create({ contenido: { padding: 20, gap: 20 }, sinFoto: { height: 160, alignItems: 'center', justifyContent: 'center', gap: 10 }, volver: { position: 'absolute', left: 14, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' }, contador: { position: 'absolute', right: 16, bottom: 14, borderRadius: 12, paddingVertical: 6, paddingHorizontal: 10 }, nombreFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10 }, nombre: { fontSize: 28, fontWeight: '700', flexShrink: 1 }, datos: { flexDirection: 'row', borderRadius: 18, paddingVertical: 16, paddingHorizontal: 4 }, dato: { flex: 1, alignItems: 'center', gap: 8, paddingHorizontal: 5 }, seccion: { gap: 10 }, titulo: { fontSize: 17, fontWeight: '600' }, tarjeta: { padding: 18, gap: 16, borderRadius: 20 }, evento: { flexDirection: 'row', alignItems: 'center', gap: 13 }, refugio: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 17, borderRadius: 18 } });
