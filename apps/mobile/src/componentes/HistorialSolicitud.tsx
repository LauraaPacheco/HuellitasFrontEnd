import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, History } from 'lucide-react-native';
import { etiquetaEstadoSolicitud, formatearFechaHora } from '@huellitas/shared';
import { api } from '@/lib/api';
import { LineaEventos } from '@/componentes/LineaEventos';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * HU-TRA-01: los cambios de estado de la solicitud, con quién los hizo.
 * Se pide al desplegarlo, no al cargar la lista.
 */
export function HistorialSolicitud({ solicitudId }: { readonly solicitudId: number }) {
  const paleta = usarPaleta();
  const [abierto, setAbierto] = useState(false);
  const consulta = useQuery({
    queryKey: ['linea-tiempo', solicitudId],
    queryFn: () => api.trazabilidad.lineaTiempo(solicitudId),
    enabled: abierto,
    retry: false,
  });

  return (
    <View style={[estilos.caja, { borderColor: paleta.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: abierto }}
        onPress={() => setAbierto((v) => !v)}
        style={({ pressed }) => [estilos.cabecera, { opacity: pressed ? 0.7 : 1 }]}
      >
        <History size={16} strokeWidth={1.75} color={paleta.brandStrong} />
        <Text style={[estilos.titulo, { color: paleta.ink }]}>Historial de la solicitud</Text>
        <ChevronDown size={18} color={paleta.inkMuted} style={{ transform: [{ rotate: abierto ? '180deg' : '0deg' }] }} />
      </Pressable>
      {abierto && (
        <View style={estilos.cuerpo}>
          {consulta.isPending ? (
            <Text style={{ color: paleta.inkMuted }}>Cargando…</Text>
          ) : consulta.isError ? (
            <Text accessibilityRole="alert" style={{ color: paleta.inkMuted }}>No pudimos cargar el historial.</Text>
          ) : !consulta.data.length ? (
            <Text style={{ color: paleta.inkMuted }}>Todavía no hay cambios registrados.</Text>
          ) : (
            <LineaEventos
              resaltarUltimo
              eventos={consulta.data.map((e) => ({
                titulo: etiquetaEstadoSolicitud(e.estadoNuevo),
                meta: `${formatearFechaHora(e.fecha)} · ${e.responsable}`,
                nota: e.observacion,
              }))}
            />
          )}
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { borderTopWidth: 1, paddingTop: espaciado.s2, borderRadius: radios.sm },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, minHeight: 40 },
  titulo: { flex: 1, fontSize: 14, fontWeight: '600' },
  cuerpo: { paddingTop: espaciado.s2 },
});
