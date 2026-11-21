import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { haceCuanto } from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { useNotificaciones } from '@/lib/notificaciones';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, radios, usarPaleta } from '@/temas';

/** HU-TRA-04: avisos del refugio y del sistema sobre tus solicitudes y adopciones. */
export default function PantallaNotificaciones() {
  const paleta = usarPaleta();
  const { usuario, cargando } = useSesion();
  const { consulta, items, sinLeer, leer, leerTodas } = useNotificaciones();

  if (cargando) return <EstadoCargando mensaje="Cargando…" />;
  if (!usuario) return <AvisoSesion titulo="Tus notificaciones" mensaje="Inicia sesión para ver los avisos sobre tus solicitudes." />;
  if (consulta.isPending) return <EstadoCargando mensaje="Cargando notificaciones…" />;
  if (consulta.isError) return <EstadoError titulo="No pudimos cargar tus notificaciones" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />;

  return (
    <FlatList
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.lista}
      data={items}
      keyExtractor={(n) => String(n.id)}
      refreshing={consulta.isRefetching}
      onRefresh={() => void consulta.refetch()}
      ListHeaderComponent={sinLeer > 0 ? (
        <Pressable accessibilityRole="button" onPress={leerTodas} hitSlop={8} style={estilos.todas}>
          <Text style={{ color: paleta.brandStrong, fontWeight: '600', fontSize: 14 }}>Marcar todas como leídas</Text>
        </Pressable>
      ) : undefined}
      ListEmptyComponent={<EstadoVacio ilustracion="durmiendo" titulo="Todo al día" descripcion="Cuando el refugio avance con tu solicitud, te avisaremos aquí." />}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${item.leida ? '' : 'Sin leer. '}${item.mensaje}. ${haceCuanto(item.fecha)}`}
          disabled={item.leida}
          onPress={() => leer(item)}
          style={({ pressed }) => [
            estilos.item,
            { backgroundColor: item.leida ? paleta.surface200 : paleta.brandTint, borderColor: item.leida ? paleta.border : paleta.brand, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          {!item.leida && <View style={[estilos.punto, { backgroundColor: paleta.accent }]} />}
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={[estilos.mensaje, { color: item.leida ? paleta.inkMuted : paleta.ink }]}>{item.mensaje}</Text>
            <Text style={[estilos.fecha, { color: paleta.inkMuted }]}>{haceCuanto(item.fecha)}</Text>
          </View>
        </Pressable>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { flexGrow: 1, padding: espaciado.s4, gap: espaciado.s2 },
  todas: { alignSelf: 'flex-end', minHeight: 36, justifyContent: 'center', marginBottom: espaciado.s1 },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.s3, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md },
  punto: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  mensaje: { fontSize: 15, lineHeight: 21 },
  fecha: { fontSize: 12 },
});
