import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ESTADO_MASCOTA,
  ETIQUETA_SEXO,
  ETIQUETA_TIPO_REGISTRO_CLINICO,
  formatearFecha,
  tiempoRelativo,
} from '@huellitas/shared';
import { api } from '@/lib/api';
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
    queryFn: () => api.mascotas.obtener(mascotaId),
    enabled: Number.isFinite(mascotaId),
  });

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
      <View style={[estilos.foto, { backgroundColor: paleta.surface300 }]}>
        <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>
          {tiempoRelativo(mascota.fechaUltimaActualizacion)}
        </Text>
      </View>

      <View style={estilos.fila}>
        <Text style={[estilos.nombre, { color: paleta.ink }]}>{mascota.nombre}</Text>
        <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
      </View>

      <View style={estilos.datos}>
        <Dato etiqueta="Edad" valor={mascota.edadAproximada ? `${mascota.edadAproximada} años` : 'Sin dato'} />
        <Dato etiqueta="Sexo" valor={ETIQUETA_SEXO[mascota.sexo]} />
        <Dato etiqueta="Esterilizada" valor={mascota.esterilizada ? 'Sí' : 'No'} />
        <Dato etiqueta="Ingreso" valor={formatearFecha(mascota.fechaIngreso)} />
      </View>

      {mascota.descripcion && (
        <Text style={{ color: paleta.ink, fontSize: 15, lineHeight: 24 }}>
          {mascota.descripcion}
        </Text>
      )}

      <View style={estilos.seccion}>
        <Text style={[estilos.titulo, { color: paleta.ink }]}>Historial clínico</Text>
        {mascota.historialClinico.length === 0 ? (
          <Text style={{ color: paleta.inkMuted, fontSize: 14 }}>
            El refugio todavía no ha cargado atenciones.
          </Text>
        ) : (
          mascota.historialClinico.map((registro) => (
            <Text key={registro.id} style={{ color: paleta.ink, fontSize: 14 }}>
              {ETIQUETA_TIPO_REGISTRO_CLINICO[registro.tipo]}{' '}
              <Text style={{ color: paleta.inkMuted }}>· {formatearFecha(registro.fecha)}</Text>
            </Text>
          ))
        )}
      </View>

      <Boton
        titulo={usuario ? 'Postularme para adoptar' : 'Inicia sesión para postularte'}
        alPresionar={() => router.push(usuario ? `/(tabs)/solicitudes` : '/login')}
      />
    </ScrollView>
  );
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
