import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  AlarmClock, Archive, BadgeCheck, Bell, BellOff, CalendarCheck, CircleX, ClipboardCheck, HeartHandshake, Inbox, Search, Send, ShieldCheck,
  type LucideIcon,
} from 'lucide-react-native';
import { describirNotificacion, haceCuanto, type NotificacionUsuario, type TipoAviso, type TonoAviso } from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { useNotificaciones } from '@/lib/notificaciones';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoError } from '@/componentes/EstadoError';
import { espaciado, radios, usarPaleta } from '@/temas';

const ICONOS: Record<TipoAviso, LucideIcon> = {
  enviada: Send, revision: Search, visita: CalendarCheck, aprobada: BadgeCheck, rechazada: CircleX,
  finalizada: HeartHandshake, cerrada: Archive, seguimiento: ClipboardCheck, seguimientoVencido: AlarmClock,
  nuevaSolicitud: Inbox, refugio: ShieldCheck, general: Bell,
};

type Pestana = 'sinLeer' | 'todas';

/**
 * HU-TRA-04: bandeja de avisos. Pestañas "Sin leer" y "Todas"; cada aviso
 * es una frase con lo importante en negrita, cuándo llegó y de qué trata,
 * y un botón cuando pide hacer algo (ver la visita, enviar un seguimiento).
 */
export default function PantallaNotificaciones() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const { consulta, items, sinLeer, leer, leerTodas } = useNotificaciones();
  const [elegida, setElegida] = useState<Pestana | null>(null);
  // Mientras no se elija, abre en "Sin leer" si hay algo nuevo y si no en "Todas".
  const pestana: Pestana = elegida ?? (sinLeer ? 'sinLeer' : 'todas');

  if (cargando) return <EstadoCargando mensaje="Cargando…" />;
  if (!usuario) return <AvisoSesion titulo="Tus notificaciones" mensaje="Inicia sesión para ver los avisos sobre tus solicitudes." />;
  if (consulta.isPending) return <EstadoCargando mensaje="Cargando notificaciones…" />;
  if (consulta.isError) return <EstadoError titulo="No pudimos cargar tus notificaciones" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />;

  const visibles = pestana === 'sinLeer' ? items.filter((n) => !n.leida) : items;

  function abrir(n: NotificacionUsuario) {
    leer(n);
    if (describirNotificacion(n).destino === 'solicitudes') router.navigate('/principal/solicitudes');
  }

  return (
    <View style={{ flex: 1, backgroundColor: paleta.surface100 }}>
      <View style={[estilos.barra, { borderBottomColor: paleta.border }]}>
        <View style={estilos.pestanas} accessibilityRole="tablist">
          <BotonPestana texto="Sin leer" cuenta={sinLeer} fuerte activa={pestana === 'sinLeer'} alPresionar={() => setElegida('sinLeer')} />
          <BotonPestana texto="Todas" cuenta={items.length} activa={pestana === 'todas'} alPresionar={() => setElegida('todas')} />
        </View>
        {sinLeer > 0 && (
          <Pressable accessibilityRole="button" onPress={leerTodas} hitSlop={10}>
            <Text style={{ color: paleta.inkMuted, fontSize: 14 }}>Marcar como leídas</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={visibles}
        keyExtractor={(n) => String(n.id)}
        contentContainerStyle={{ flexGrow: 1 }}
        refreshing={consulta.isRefetching}
        onRefresh={() => void consulta.refetch()}
        ItemSeparatorComponent={() => <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: paleta.border }} />}
        ListEmptyComponent={
          <View style={estilos.vacio}>
            <View style={[estilos.vacioIcono, { backgroundColor: paleta.surface200 }]}>
              <BellOff size={22} strokeWidth={1.75} color={paleta.inkMuted} />
            </View>
            <Text style={[estilos.vacioTexto, { color: paleta.inkMuted }]}>
              {pestana === 'sinLeer' && items.length ? 'Estás al día. No tienes avisos sin leer.' : 'Cuando el refugio avance con tu solicitud, te avisaremos aquí.'}
            </Text>
          </View>
        }
        renderItem={({ item }) => <Aviso notificacion={item} alPresionar={() => abrir(item)} />}
      />
    </View>
  );
}

function BotonPestana({ texto, cuenta, activa, fuerte = false, alPresionar }: { texto: string; cuenta: number; activa: boolean; fuerte?: boolean; alPresionar: () => void }) {
  const paleta = usarPaleta();
  return (
    <Pressable accessibilityRole="tab" accessibilityState={{ selected: activa }} accessibilityLabel={`${texto}, ${cuenta}`} onPress={alPresionar}
      style={[estilos.pestana, { borderBottomColor: activa ? paleta.ink : 'transparent' }]}>
      <Text style={{ color: activa ? paleta.ink : paleta.inkMuted, fontSize: 15, fontWeight: activa ? '600' : '400' }}>{texto}</Text>
      {cuenta > 0 && (
        <View style={[estilos.cuenta, fuerte ? { backgroundColor: paleta.ink, borderColor: paleta.ink } : { borderColor: paleta.border }]}>
          <Text style={{ color: fuerte ? paleta.surface100 : paleta.inkMuted, fontSize: 12, fontWeight: '700' }}>{cuenta}</Text>
        </View>
      )}
    </Pressable>
  );
}

function Aviso({ notificacion: n, alPresionar }: { notificacion: NotificacionUsuario; alPresionar: () => void }) {
  const paleta = usarPaleta();
  const aviso = describirNotificacion(n);
  const Icono = ICONOS[aviso.tipo];
  const colores: Record<TonoAviso, { fondo: string; icono: string }> = {
    marca: { fondo: paleta.brandTint, icono: paleta.brandStrong },
    acento: { fondo: paleta.accentTint, icono: paleta.accent },
    advertencia: { fondo: paleta.surface300, icono: paleta.warn },
    peligro: { fondo: paleta.surface300, icono: paleta.danger },
    neutro: { fondo: paleta.surface300, icono: paleta.inkMuted },
  };
  const color = colores[aviso.tono];
  const cuando = haceCuanto(n.fecha);

  const conAccion = !!aviso.accion && aviso.destino === 'solicitudes';

  // La acción va fuera del Pressable de la fila: en la web un botón no
  // puede contener otro.
  return (
    <View style={{ backgroundColor: n.leida ? 'transparent' : paleta.surface200 }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${n.leida ? '' : 'Nuevo. '}${aviso.detalle}. ${cuando}, ${aviso.categoria}`}
        onPress={alPresionar}
        style={({ pressed }) => [estilos.aviso, conAccion && { paddingBottom: espaciado.s2 }, pressed && { backgroundColor: paleta.surface300 }]}
      >
        <View style={[estilos.icono, { backgroundColor: color.fondo }]}>
          <Icono size={20} strokeWidth={1.9} color={color.icono} />
        </View>
        <View style={estilos.cuerpo}>
          <Text style={[estilos.frase, { color: paleta.inkMuted }]}>
            {aviso.frase.map((x, i) => (
              <Text key={i} style={x.resaltado ? { color: paleta.ink, fontWeight: '600' } : undefined}>{x.texto}</Text>
            ))}
          </Text>
          <Text style={[estilos.meta, { color: paleta.inkMuted }]}>{cuando} · {aviso.categoria}</Text>
          {aviso.nota && <Text style={[estilos.nota, { color: paleta.inkMuted, borderLeftColor: paleta.border }]}>{aviso.nota}</Text>}
        </View>
        {!n.leida && <View style={[estilos.punto, { backgroundColor: paleta.accent }]} />}
      </Pressable>
      {conAccion && (
        <View style={estilos.acciones}>
          <Pressable accessibilityRole="button" onPress={alPresionar} style={({ pressed }) => [estilos.accion, { backgroundColor: paleta.brandStrong, opacity: pressed ? 0.85 : 1 }]}>
            <Text style={{ color: paleta.onBrand, fontWeight: '600', fontSize: 14 }}>{aviso.accion}</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  barra: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s2, paddingHorizontal: espaciado.s4, borderBottomWidth: StyleSheet.hairlineWidth },
  pestanas: { flexDirection: 'row', gap: espaciado.s4 },
  pestana: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 46, borderBottomWidth: 2, marginBottom: -StyleSheet.hairlineWidth },
  cuenta: { minWidth: 20, height: 20, paddingHorizontal: 6, borderRadius: radios.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  aviso: { flexDirection: 'row', gap: espaciado.s3, paddingHorizontal: espaciado.s4, paddingVertical: espaciado.s4 },
  icono: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flex: 1, gap: 4, minWidth: 0 },
  frase: { fontSize: 15, lineHeight: 21 },
  meta: { fontSize: 13 },
  nota: { fontSize: 13, lineHeight: 18, paddingLeft: espaciado.s2, borderLeftWidth: 2, marginTop: 2 },
  // Alineada con el texto: margen del icono (42) más el espacio entre ambos.
  acciones: { flexDirection: 'row', paddingLeft: espaciado.s4 + 42 + espaciado.s3, paddingBottom: espaciado.s4 },
  accion: { minHeight: 36, paddingHorizontal: espaciado.s3, borderRadius: radios.sm, justifyContent: 'center' },
  punto: { width: 9, height: 9, borderRadius: 5, marginTop: 8 },
  vacio: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', gap: espaciado.s3, padding: espaciado.s6 },
  vacioIcono: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  vacioTexto: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
