import { useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ErrorHttp, ESTADO_SOLICITUD, formatearFecha } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { espaciado, radios, usarPaleta } from '@/temas';
import { AvisoSesion } from '@/componentes/AvisoSesion';

const POR_PAGINA = 20;

export default function PantallaSolicitudes() {
  const paleta = usarPaleta();
  const { usuario } = useSesion();
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching } = useQuery({
    queryKey: ['mis-solicitudes', pagina],
    queryFn: () => api.adopcion.misSolicitudes(pagina, POR_PAGINA),
    enabled: usuario !== null,
  });

  if (!usuario) {
    return (
      <AvisoSesion mensaje="Inicia sesión para ver en qué va tu solicitud de adopción." />
    );
  }

  if (isLoading) return <ActivityIndicator style={{ marginTop: espaciado.s6 }} />;

  if (isError) {
    return (
      <View style={estilos.vacio}>
        <Text style={[estilos.vacioTitulo, { color: paleta.ink }]}>No pudimos cargar tus solicitudes</Text>
        <Text style={[estilos.vacioTexto, { color: paleta.inkMuted }]}>
          {error instanceof ErrorHttp ? error.detalle ?? error.message : 'Revisa tu conexión y vuelve a intentarlo.'}
        </Text>
        <Boton titulo="Reintentar" variante="secundario" alPresionar={() => void refetch()} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.lista}
      data={data?.items ?? []}
      keyExtractor={(solicitud) => String(solicitud.id)}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      ListEmptyComponent={
        <View style={estilos.vacio}>
          <Text style={[estilos.vacioTitulo, { color: paleta.ink }]}>
            Todavía no te has postulado
          </Text>
          <Text style={[estilos.vacioTexto, { color: paleta.inkMuted }]}>
            Cuando envíes una solicitud, aquí verás en qué estado va.
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
          {item.fotoMascota ? (
            <Image source={{ uri: item.fotoMascota }} style={estilos.foto} accessibilityLabel={`Foto de ${item.nombreMascota}`} />
          ) : (
            <View style={[estilos.foto, { backgroundColor: paleta.surface300 }]} />
          )}
          <View style={estilos.cuerpo}>
            <View style={estilos.fila}>
              <Text style={[estilos.titulo, { color: paleta.ink }]} numberOfLines={1}>
                {item.nombreMascota}
              </Text>
              <Insignia estado={ESTADO_SOLICITUD[item.estado]} />
            </View>
            <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>
              {item.codigo} · enviada el {formatearFecha(item.fechaEnvio)}
            </Text>
          </View>
        </View>
      )}
      ListFooterComponent={
        data && data.totalPaginas > 1 ? (
          <View style={{ gap: espaciado.s3, paddingVertical: espaciado.s4 }}>
            <Text style={{ color: paleta.inkMuted, textAlign: 'center' }}>Página {data.pagina} de {data.totalPaginas}</Text>
            <Boton titulo="Anterior" variante="secundario" deshabilitado={data.pagina <= 1 || isRefetching} alPresionar={() => setPagina(p => p - 1)} />
            <Boton titulo="Siguiente" variante="secundario" deshabilitado={data.pagina >= data.totalPaginas || isRefetching} alPresionar={() => setPagina(p => p + 1)} />
          </View>
        ) : null
      }
    />
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaciado.s4, gap: espaciado.s3 },
  tarjeta: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: radios.md,
    padding: espaciado.s3,
    gap: espaciado.s3,
    alignItems: 'center',
  },
  foto: { width: 56, height: 56, borderRadius: radios.sm },
  cuerpo: { flex: 1, gap: espaciado.s2 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s2 },
  titulo: { flexShrink: 1, fontSize: 17, fontWeight: '700' },
  vacio: { padding: espaciado.s6, alignItems: 'center', gap: espaciado.s2 },
  vacioTitulo: { fontSize: 17, fontWeight: '600' },
  vacioTexto: { fontSize: 14, textAlign: 'center' },
});
