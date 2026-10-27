import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ESTADO_SOLICITUD, formatearFecha } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Insignia } from '@/componentes/Insignia';
import { espaciado, radios, usarPaleta } from '@/temas';
import { AvisoSesion } from '@/componentes/AvisoSesion';

export default function PantallaSolicitudes() {
  const paleta = usarPaleta();
  const { usuario } = useSesion();

  const { data, isLoading } = useQuery({
    queryKey: ['mis-solicitudes'],
    queryFn: () => api.adopcion.misSolicitudes(),
    enabled: MODO_DEMO && usuario !== null,
  });

  if (!usuario) {
    return (
      <AvisoSesion mensaje="Inicia sesión para ver en qué va tu solicitud de adopción." />
    );
  }

  if (!MODO_DEMO) return <View style={estilos.vacio}><Text style={{ color: paleta.ink }}>El seguimiento de solicitudes todavía no está disponible.</Text><Text style={{ color: paleta.inkMuted }}>Al postularte desde una ficha recibirás el código de confirmación. El servidor aún no permite consultar tu historial aquí.</Text></View>;

  if (isLoading) return <ActivityIndicator style={{ marginTop: espaciado.s6 }} />;

  return (
    <FlatList
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.lista}
      data={data ?? []}
      keyExtractor={(solicitud) => String(solicitud.id)}
      ListEmptyComponent={
        <View style={estilos.vacio}>
          <Text style={[estilos.vacioTitulo, { color: paleta.ink }]}>
            Todavía no te has postulado
          </Text>
          <Text style={[estilos.vacioTexto, { color: paleta.inkMuted }]}>
            Cuando envíes una solicitud, aquí verás cada etapa del proceso.
          </Text>
        </View>
      }
      renderItem={({ item }) => (
        <View
          style={[
            estilos.tarjeta,
            { borderColor: paleta.border, backgroundColor: paleta.surface200 },
          ]}
        >
          <View style={estilos.fila}>
            <Text style={[estilos.titulo, { color: paleta.ink }]}>
              {item.nombreMascota}
            </Text>
            <Insignia estado={ESTADO_SOLICITUD[item.estado]} />
          </View>
          <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>
            {item.codigo} · enviada el {formatearFecha(item.fechaEnvio)}
          </Text>
        </View>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaciado.s4, gap: espaciado.s3 },
  tarjeta: {
    borderWidth: 1,
    borderRadius: radios.md,
    padding: espaciado.s4,
    gap: espaciado.s2,
  },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 19, fontWeight: '700' },
  vacio: { padding: espaciado.s6, alignItems: 'center', gap: espaciado.s2 },
  vacioTitulo: { fontSize: 17, fontWeight: '600' },
  vacioTexto: { fontSize: 14, textAlign: 'center' },
});
