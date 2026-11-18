import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, Sparkles } from 'lucide-react-native';
import { ErrorHttp, type RecomendacionMascota } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { FotoCatalogo } from '@/componentes/TarjetaMascota';
import { espaciado, radios, usarPaleta } from '@/temas';

const ANCHO_TARJETA = 220;

/**
 * "Para ti" (HU-MAS-06): el top de mascotas según el perfil del adoptante.
 * Si el perfil está incompleto el servidor responde 400 y en su lugar se
 * invita a completarlo. Solo se muestra al adoptante con sesión.
 */
export function Recomendaciones() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { usuario, puedeActuar } = useSesion();
  const consulta = useQuery({
    // La completitud va en la clave: al terminar el perfil se vuelve a pedir sola.
    queryKey: ['recomendaciones', usuario?.id, usuario?.perfil?.porcentajeCompletitud],
    queryFn: () => api.mascotas.recomendaciones(),
    enabled: puedeActuar,
    retry: false,
    staleTime: 5 * 60_000,
  });

  if (!puedeActuar || consulta.isPending) return null;

  if (consulta.isError) {
    const faltaPerfil = consulta.error instanceof ErrorHttp && consulta.error.estadoHttp === 400;
    if (!faltaPerfil) return null;
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Completa tu perfil de adoptante para ver mascotas recomendadas"
        onPress={() => router.push('/perfil-adoptante')}
        style={({ pressed }) => [estilos.aviso, { backgroundColor: paleta.brandTint, borderColor: paleta.brand, opacity: pressed ? 0.85 : 1 }]}
      >
        <Sparkles size={20} strokeWidth={1.75} color={paleta.brandStrong} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={[estilos.avisoTitulo, { color: paleta.ink }]}>Recomendaciones para ti</Text>
          <Text style={[estilos.avisoTexto, { color: paleta.inkMuted }]}>Completa tu perfil de adoptante y te mostramos las mascotas que mejor encajan con tu hogar.</Text>
        </View>
        <ChevronRight size={18} color={paleta.inkMuted} />
      </Pressable>
    );
  }

  if (!consulta.data.length) return null;

  return (
    <View style={estilos.seccion}>
      <View style={estilos.encabezado}>
        <Sparkles size={18} strokeWidth={1.75} color={paleta.brandStrong} />
        <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>Para ti</Text>
      </View>
      <FlatList
        horizontal
        data={consulta.data}
        keyExtractor={(m) => String(m.id)}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: espaciado.s3 }}
        renderItem={({ item }) => <TarjetaRecomendacion mascota={item} />}
      />
      <Text style={[estilos.titulo, estilos.todas, { color: paleta.ink }]}>Todas las mascotas</Text>
    </View>
  );
}

function TarjetaRecomendacion({ mascota }: { readonly mascota: RecomendacionMascota }) {
  const paleta = usarPaleta();
  const factor = mascota.factores[0];
  return (
    <Link href={`/mascota/${mascota.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${mascota.nombre}, ${mascota.puntajeCompatibilidad}% de compatibilidad${factor ? `. ${factor}` : ''}`}
        style={StyleSheet.flatten([estilos.tarjeta, { borderColor: paleta.border, backgroundColor: paleta.surface200 }])}
      >
        <FotoCatalogo uri={mascota.fotoPrincipal} nombre={mascota.nombre} alto={130} />
        <View style={[estilos.puntaje, { backgroundColor: paleta.brandStrong }]}>
          <Text style={{ color: paleta.onBrand, fontSize: 12, fontWeight: '700' }}>{mascota.puntajeCompatibilidad}%</Text>
        </View>
        <View style={estilos.cuerpo}>
          <Text numberOfLines={1} style={[estilos.nombre, { color: paleta.ink }]}>{mascota.nombre}</Text>
          {factor && <Text numberOfLines={2} style={[estilos.factor, { color: paleta.inkMuted }]}>{factor}</Text>}
        </View>
      </Pressable>
    </Link>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.s3, marginBottom: espaciado.s1 },
  encabezado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  titulo: { fontSize: 17, fontWeight: '600' },
  todas: { marginTop: espaciado.s3 },
  tarjeta: { width: ANCHO_TARJETA, borderWidth: 1, borderRadius: radios.md, overflow: 'hidden' },
  puntaje: { position: 'absolute', top: espaciado.s2, left: espaciado.s2, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radios.pill },
  cuerpo: { padding: espaciado.s3, gap: 4 },
  nombre: { fontSize: 16, fontWeight: '700' },
  factor: { fontSize: 13, lineHeight: 18 },
  aviso: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md, marginBottom: espaciado.s1 },
  avisoTitulo: { fontSize: 15, fontWeight: '600' },
  avisoTexto: { fontSize: 13, lineHeight: 19 },
});
