import { useState } from 'react';
import { Alert, FlatList, Platform, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, ESTADO_APADRINAMIENTO, EstadoApadrinamiento, formatearFecha, type ApadrinamientoResumen } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, radios, usarPaleta } from '@/temas';

/** HU-REF-03: las mascotas que apadrinas o pediste apadrinar. */
export default function PantallaApadrinamientos() {
  const paleta = usarPaleta();
  const router = useRouter();
  const cliente = useQueryClient();
  const { usuario, puedeActuar, cargando } = useSesion();
  const [error, setError] = useState('');
  const consulta = useQuery({
    queryKey: ['apadrinamientos', 'mios', usuario?.id],
    queryFn: () => api.refugios.misApadrinamientos({ tamanoPagina: 50 }),
    enabled: puedeActuar,
    retry: false,
  });
  const cancelar = useMutation({
    mutationFn: (a: ApadrinamientoResumen) => api.refugios.cancelarApadrinamiento(a.id),
    onSuccess: () => { setError(''); void cliente.invalidateQueries({ queryKey: ['apadrinamientos'] }); },
    onError: (e) => setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos cancelar. Intenta de nuevo.'),
  });

  function confirmar(a: ApadrinamientoResumen) {
    const texto = a.estado === EstadoApadrinamiento.Solicitado ? `¿Retirar tu solicitud para apadrinar a ${a.mascotaNombre}?` : `¿Dejar de apadrinar a ${a.mascotaNombre}?`;
    // En la web de Expo Alert no muestra botones: se usa confirm del navegador.
    if (Platform.OS === 'web') { if (globalThis.confirm?.(texto)) cancelar.mutate(a); return; }
    Alert.alert('Cancelar apadrinamiento', texto, [{ text: 'No', style: 'cancel' }, { text: 'Sí, cancelar', style: 'destructive', onPress: () => cancelar.mutate(a) }]);
  }

  if (cargando) return <EstadoCargando mensaje="Cargando…" />;
  if (!usuario) return <AvisoSesion titulo="Tus apadrinamientos" mensaje="Crea tu cuenta para apadrinar mascotas." />;
  if (!puedeActuar) return <EstadoVacio titulo="Solo para adoptantes" descripcion="Apadrinar está disponible para las cuentas de adoptante." />;
  if (consulta.isPending) return <EstadoCargando mensaje="Cargando tus apadrinamientos…" />;
  if (consulta.isError) return <EstadoError titulo="No pudimos cargar tus apadrinamientos" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />;

  const items = [...consulta.data.items].sort((a, b) => a.estado - b.estado || b.fechaInicio.localeCompare(a.fechaInicio));

  return (
    <FlatList
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.lista}
      data={items}
      keyExtractor={(a) => String(a.id)}
      refreshing={consulta.isRefetching}
      onRefresh={() => void consulta.refetch()}
      ListHeaderComponent={error ? <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text> : undefined}
      ListEmptyComponent={
        <EstadoVacio
          ilustracion="trio"
          titulo="Aún no apadrinas"
          descripcion="Desde la ficha de una mascota puedes pedir ser su padrino y apoyarla mientras encuentra hogar."
          accion={<Boton titulo="Ver mascotas" variante="secundario" alPresionar={() => router.replace('/principal/catalogo')} />}
        />
      }
      renderItem={({ item: a }) => (
        <View style={[estilos.tarjeta, { borderColor: paleta.border, backgroundColor: paleta.surface200 }]}>
          <View style={estilos.fila}>
            <Text style={[estilos.nombre, { color: paleta.ink }]} numberOfLines={1}>{a.mascotaNombre}</Text>
            <Insignia estado={ESTADO_APADRINAMIENTO[a.estado]} />
          </View>
          {a.refugioNombre && <Text style={[estilos.meta, { color: paleta.inkMuted }]}>{a.refugioNombre}</Text>}
          <Text style={[estilos.meta, { color: paleta.inkMuted }]}>
            {a.estado === EstadoApadrinamiento.Solicitado ? 'Solicitado' : 'Desde'} el {formatearFecha(a.fechaInicio)}
          </Text>
          {a.observacion && <Text style={[estilos.nota, { color: paleta.ink }]}>«{a.observacion}»</Text>}
          {a.estado !== EstadoApadrinamiento.Finalizado && (
            <View style={estilos.acciones}>
              <Boton titulo="Ver mascota" variante="secundario" alPresionar={() => router.push(`/mascota/${a.mascotaId}`)} />
              <Boton
                titulo={a.estado === EstadoApadrinamiento.Solicitado ? 'Retirar solicitud' : 'Dejar de apadrinar'}
                variante="peligro"
                cargando={cancelar.isPending && cancelar.variables?.id === a.id}
                deshabilitado={cancelar.isPending}
                alPresionar={() => confirmar(a)}
              />
            </View>
          )}
        </View>
      )}
    />
  );
}

const estilos = StyleSheet.create({
  lista: { flexGrow: 1, padding: espaciado.s4, gap: espaciado.s3 },
  tarjeta: { borderWidth: 1, borderRadius: radios.lg, padding: espaciado.s4, gap: espaciado.s2 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s2 },
  nombre: { flexShrink: 1, fontSize: 18, fontWeight: '700' },
  meta: { fontSize: 13 },
  nota: { fontSize: 14, lineHeight: 20 },
  acciones: { gap: espaciado.s2, marginTop: espaciado.s2 },
});
