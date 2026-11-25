import { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { X } from 'lucide-react-native';
import {
  COLOR_TIPO_REPORTE, ESTADO_REPORTE, ETIQUETA_TIPO_REPORTE, EstadoReporte, TIPOS_REPORTE_ORDEN, TipoReporte, haceCuanto,
  type PinReporte,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { Insignia } from '@/componentes/Insignia';
import { Mapa } from '@/componentes/mapa/Mapa';
import { CENTRO_CALI, type MarcadorMapa } from '@/componentes/mapa/tipos';
import { espaciado, radios, usarPaleta } from '@/temas';

const estadoPin = (e: EstadoReporte): MarcadorMapa['estado'] =>
  e === EstadoReporte.Recibido ? 'libre' : e === EstadoReporte.EnAtencion ? 'atencion' : 'cerrado';

/**
 * HU-REP-04: mapa de los reportes activos de Cali (GET /Reportes/mapa, que
 * es público). El color dice el tipo y se puede filtrar por él; al tocar un
 * marcador se ve lo que se sabe del caso.
 */
export default function PantallaMapaReportes() {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const [tipo, setTipo] = useState<TipoReporte | null>(null);
  const [seleccionado, setSeleccionado] = useState<number | null>(null);
  // Alto de la tarjeta de abajo, para subir el "Legal" del mapa por encima.
  const [altoAbajo, setAltoAbajo] = useState(0);
  const consulta = useQuery({ queryKey: ['reportes', 'mapa'], queryFn: () => api.reportes.mapa(), retry: false });

  const visibles = useMemo(() => (consulta.data ?? []).filter((r) => tipo === null || r.tipo === tipo), [consulta.data, tipo]);
  const marcadores = useMemo(() => visibles.map((r): MarcadorMapa => ({
    id: r.id, latitud: r.latitud, longitud: r.longitud, color: COLOR_TIPO_REPORTE[r.tipo], estado: estadoPin(r.estado),
    titulo: `${ETIQUETA_TIPO_REPORTE[r.tipo]}, ${ESTADO_REPORTE[r.estado].etiqueta}`,
  })), [visibles]);
  const actual = visibles.find((r) => r.id === seleccionado) ?? null;
  const sombra = { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 };

  return (
    <View style={{ flex: 1, backgroundColor: paleta.surface200 }}>
      <Mapa inicial={CENTRO_CALI} acercamiento="ciudad" alMover={() => {}} mostrarUsuario={false}
        marcadores={marcadores} seleccionado={seleccionado} alTocarMarcador={setSeleccionado}
        margenCreditos={altoAbajo + margenes.bottom + espaciado.s4} />

      {/* Arriba: filtro por tipo, con el color de cada uno. */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.filtros}
        contentContainerStyle={estilos.filtrosContenido} accessibilityRole="radiogroup" accessibilityLabel="Filtrar por tipo de reporte">
        {[null, ...TIPOS_REPORTE_ORDEN].map((t) => {
          const activo = t === tipo;
          return (
            <Pressable key={t ?? 'todos'} accessibilityRole="radio" accessibilityState={{ checked: activo }}
              onPress={() => { setTipo(t); setSeleccionado(null); }}
              style={[estilos.chip, sombra, { backgroundColor: activo ? paleta.brandStrong : paleta.surface100 }]}>
              {t !== null && <View style={[estilos.punto, { backgroundColor: COLOR_TIPO_REPORTE[t] }]} />}
              <Text style={{ color: activo ? paleta.onBrand : paleta.ink, fontWeight: '600', fontSize: 14 }}>
                {t === null ? 'Todos' : ETIQUETA_TIPO_REPORTE[t]}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {consulta.isPending && <View style={estilos.centro}><EstadoCargando compacto mensaje="Cargando reportes…" /></View>}

      <View style={[estilos.abajo, { bottom: margenes.bottom + espaciado.s3 }]} pointerEvents="box-none"
        onLayout={(e) => setAltoAbajo(e.nativeEvent.layout.height)}>
        {consulta.isError ? (
          <View style={[estilos.tarjeta, sombra, { backgroundColor: paleta.surface100 }]}>
            <Text accessibilityRole="alert" style={{ color: paleta.ink }}>No pudimos cargar los reportes.</Text>
            <Boton titulo="Reintentar" variante="secundario" alPresionar={() => void consulta.refetch()} />
          </View>
        ) : actual ? (
          <DetalleReporte pin={actual} alCerrar={() => setSeleccionado(null)} />
        ) : consulta.data && (
          <View style={[estilos.resumen, sombra, { backgroundColor: paleta.surface100 }]}>
            <Text style={{ color: paleta.ink, fontWeight: '600' }}>
              {visibles.length === 0 ? 'No hay reportes activos de este tipo' : `${visibles.length} ${visibles.length === 1 ? 'reporte activo' : 'reportes activos'}`}
            </Text>
            <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>Centro lleno: sin tomar · hueco: en atención · claro: rescatado</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function DetalleReporte({ pin, alCerrar }: { readonly pin: PinReporte; readonly alCerrar: () => void }) {
  const paleta = usarPaleta();
  const detalle = useQuery({ queryKey: ['reportes', 'detalle', pin.id], queryFn: () => api.reportes.obtener(pin.id), retry: false });
  const d = detalle.data;
  return (
    <View style={[estilos.tarjeta, { backgroundColor: paleta.surface100, shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 }]}>
      <View style={estilos.cabecera}>
        <View style={[estilos.punto, estilos.puntoGrande, { backgroundColor: COLOR_TIPO_REPORTE[pin.tipo] }]} />
        <View style={{ flex: 1 }}>
          <Text style={{ color: paleta.ink, fontSize: 17, fontWeight: '700' }}>{ETIQUETA_TIPO_REPORTE[pin.tipo]}</Text>
          <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>{pin.numeroReporte}{d ? ` · ${haceCuanto(d.fechaReporte)}` : ''}</Text>
        </View>
        <Insignia estado={ESTADO_REPORTE[pin.estado]} />
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} onPress={alCerrar}
          style={[estilos.cerrar, { backgroundColor: paleta.surface200 }]}>
          <X size={16} strokeWidth={2} color={paleta.inkMuted} />
        </Pressable>
      </View>
      {detalle.isPending ? (
        <EstadoCargando compacto mensaje="Cargando…" />
      ) : d ? (
        <View style={estilos.cuerpo}>
          {d.fotos[0] && <Image source={{ uri: d.fotos[0] }} style={estilos.foto} accessibilityLabel={`Foto del reporte ${pin.numeroReporte}`} />}
          <Text style={{ flex: 1, color: paleta.ink, lineHeight: 21 }} numberOfLines={4}>{d.descripcion}</Text>
        </View>
      ) : (
        <Text style={{ color: paleta.inkMuted }}>No pudimos cargar el detalle de este reporte.</Text>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  filtros: { position: 'absolute', top: espaciado.s3, left: 0, right: 0, flexGrow: 0 },
  filtrosContenido: { paddingHorizontal: espaciado.s4, gap: espaciado.s2, paddingBottom: espaciado.s2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: espaciado.s4, borderRadius: radios.pill },
  punto: { width: 10, height: 10, borderRadius: 5 },
  puntoGrande: { width: 14, height: 14, borderRadius: 7 },
  centro: { position: 'absolute', top: 70, alignSelf: 'center' },
  abajo: { position: 'absolute', left: espaciado.s3, right: espaciado.s3 },
  resumen: { borderRadius: radios.lg, paddingVertical: espaciado.s3, paddingHorizontal: espaciado.s4, gap: 2 },
  tarjeta: { borderRadius: radios.lg, padding: espaciado.s4, gap: espaciado.s3 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  cerrar: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flexDirection: 'row', gap: espaciado.s3, alignItems: 'flex-start' },
  foto: { width: 72, height: 72, borderRadius: radios.md },
});
