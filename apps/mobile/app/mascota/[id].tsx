import { useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ESTADO_MASCOTA,
  ETIQUETA_SEXO,
  ETIQUETA_TIPO_REGISTRO_CLINICO,
  formatearFecha,
  tiempoRelativo,
} from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { espaciado, radios, usarPaleta } from '@/temas';

export default function PantallaMascota() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { usuario } = useSesion();
  const { id } = useLocalSearchParams<{ id: string }>();
  const mascotaId = Number(id);

  const { data: mascota, isLoading } = useQuery({
    queryKey: ['mascota', mascotaId],
    queryFn: () => api.mascotas.obtenerFicha(mascotaId),
    enabled: Number.isFinite(mascotaId),
  });

  const clinica = useQuery({ queryKey: ['mascota-demo', mascotaId], queryFn: () => api.mascotas.obtener(mascotaId), enabled: MODO_DEMO && Number.isFinite(mascotaId) });
  if (isLoading) return <ActivityIndicator style={{ marginTop: espaciado.s6 }} />;
  if (!mascota) {
    return (
      <View style={estilos.centro}>
        <Text style={{ color: paleta.ink }}>No encontramos esa mascota.</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.contenido}
    >
      {mascota.fotos.length ? <ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator accessibilityLabel="Fotos de la mascota">{mascota.fotos.map((uri,i)=><FotoPublica key={`${uri}-${i}`} uri={uri} nombre={`${mascota.nombre}, foto ${i+1}`} />)}</ScrollView> : <View style={[estilos.foto, { backgroundColor: paleta.surface300 }]}><Text style={{color:paleta.inkMuted}}>El refugio aún no ha añadido fotos.</Text></View>}
      <Text style={{color:paleta.inkMuted}}>{[mascota.especie,mascota.raza].filter(Boolean).join(' · ')}</Text>
      <View style={estilos.fila}>
        <Text style={[estilos.nombre, { color: paleta.ink }]}>{mascota.nombre}</Text>
        <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
      </View>

      <View style={estilos.datos}>
        <Dato etiqueta="Edad" valor={mascota.edadAproximada !== null ? `${mascota.edadAproximada} años` : 'Sin dato'} />
        <Dato etiqueta="Sexo" valor={ETIQUETA_SEXO[mascota.sexo]} />
        <Dato etiqueta="Esterilizad@" valor={mascota.esterilizada ? 'Sí' : 'No'} />

      </View>

      {mascota.descripcion && (
        <Text style={{ color: paleta.ink, fontSize: 15, lineHeight: 24 }}>
          {mascota.descripcion}
        </Text>
      )}

      {clinica.data && <View style={estilos.seccion}>
        <Text style={[estilos.titulo, { color: paleta.ink }]}>Historial clínico</Text>
        {clinica.data.historialClinico.length === 0 ? (
          <Text style={{ color: paleta.inkMuted, fontSize: 14 }}>
            El refugio todavía no ha cargado atenciones.
          </Text>
        ) : (
          clinica.data.historialClinico.map((registro) => (
            <Text key={registro.id} style={{ color: paleta.ink, fontSize: 14 }}>
              {ETIQUETA_TIPO_REGISTRO_CLINICO[registro.tipo]}{' '}
              <Text style={{ color: paleta.inkMuted }}>· {formatearFecha(registro.fecha)}</Text>
            </Text>
          ))
        )}
      </View>}
      <Text style={{color:paleta.ink,fontWeight:'600'}}>Refugio: {mascota.refugioNombre}</Text>
      {mascota.refugioTelefono && <Text style={{color:paleta.inkMuted}}>Contacto: {mascota.refugioTelefono}</Text>}
      {mascota.refugioId !== undefined && <Boton titulo="Conocer el refugio y sus requisitos" variante="secundario"
        alPresionar={() => router.push(`/refugio/${mascota.refugioId}`)} />}

      <Boton
        titulo={usuario ? 'Postularme para adoptar' : 'Inicia sesión para postularte'}
        alPresionar={() => router.push(usuario ? `/(tabs)/solicitudes` : '/login')}
      />
    </ScrollView>
  );
}

function FotoPublica({uri,nombre}:{uri:string;nombre:string}) {
  const [fallo,setFallo]=useState(false); const paleta=usarPaleta();
  return fallo ? <View style={[estilos.foto,{width:280,backgroundColor:paleta.surface300}]}><Text style={{color:paleta.inkMuted}}>No pudimos cargar esta foto.</Text></View> : <Image source={{uri}} accessibilityLabel={nombre} onError={()=>setFallo(true)} resizeMode="contain" style={{width:280,height:220,borderRadius:16,backgroundColor:paleta.surface300}} />;
}

function Dato({ etiqueta, valor }: { readonly etiqueta: string; readonly valor: string }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.dato, { borderColor: paleta.border }]}>
      <Text style={{ color: paleta.inkMuted, fontSize: 12 }}>{etiqueta}</Text>
      <Text style={{ color: paleta.ink, fontSize: 15, fontWeight: '600' }}>{valor}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, gap: espaciado.s4, paddingBottom: espaciado.s7 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  foto: {
    height: 220,
    borderRadius: radios.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontSize: 32, fontWeight: '700', letterSpacing: -0.5 },
  datos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s2 },
  dato: {
    flexGrow: 1,
    flexBasis: '45%',
    borderWidth: 1,
    borderRadius: radios.md,
    padding: espaciado.s3,
    gap: 2,
  },
  seccion: { gap: espaciado.s2 },
  titulo: { fontSize: 17, fontWeight: '700' },
});
