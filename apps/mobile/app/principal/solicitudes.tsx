import { HistorialSolicitud } from '@/componentes/HistorialSolicitud';
import { useEspacioBarraPestanas } from '@/componentes/BarraPestanas';
import { VisitaSolicitud } from '@/componentes/VisitaSolicitud';
import { visitaVigente } from '@huellitas/shared';
import { MODO_DEMO } from '@/lib/api';
import { usePantallaActiva, useActualizarAlVolver } from '@/hooks/usePantallaActiva';
import { AccionesAdopcion } from '@/componentes/AccionesAdopcion';
import { useState } from 'react';
import { FlatList, Image, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ESTADO_SOLICITUD, EstadoSolicitud, formatearFecha } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Paginacion } from '@/componentes/Paginacion';
import { Boton } from '@/componentes/Boton';
import { useRouter } from 'expo-router';
import { CalendarDays, CircleX, Hash, PawPrint } from 'lucide-react-native';
import { Insignia } from '@/componentes/Insignia';
import { espaciado, radios, usarPaleta } from '@/temas';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';

const POR_PAGINA = 20;

export default function PantallaSolicitudes() {
  const paleta = usarPaleta();
  const espacioBarra = useEspacioBarraPestanas();
  const activa = usePantallaActiva();
  const { usuario } = useSesion();
  const router = useRouter();
  const [pagina, setPagina] = useState(1);

  const { data, isLoading, isError, error, refetch, isRefetching, isFetching } = useQuery({
    queryKey: ['mis-solicitudes', usuario?.id, pagina],
    queryFn: () => api.adopcion.misSolicitudes(pagina, POR_PAGINA),
    enabled: usuario !== null,
    refetchInterval: activa ? 10_000 : false,
    refetchIntervalInBackground: false,
  });

  const visitas = useQuery({
    queryKey: ['mis-visitas', usuario?.id], queryFn: () => api.adopcion.misVisitas(),
    enabled: usuario !== null && !MODO_DEMO, refetchInterval: activa ? 10_000 : false, retry: false,
  });
  useActualizarAlVolver(activa && usuario !== null && !MODO_DEMO, visitas.refetch);

  useActualizarAlVolver(activa && usuario !== null, refetch);

  if (!usuario) {
    return (
      <AvisoSesion titulo="Sigue tus solicitudes" mensaje="Con tu cuenta ves en qué va cada postulación y adjuntas los documentos que te pida el refugio." />
    );
  }

  if (isLoading) return <EstadoCargando mensaje="Cargando tus solicitudes…" />;

  if (isError) {
    return (
      <EstadoError
        titulo="No pudimos cargar tus solicitudes"
        error={error}
        alReintentar={() => void refetch()}
        reintentando={isFetching}
      />
    );
  }

  return (
    <FlatList
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={[estilos.lista, { paddingBottom: espacioBarra }]}
      data={data?.items ?? []}
      keyExtractor={(solicitud) => String(solicitud.id)}
      refreshing={isRefetching}
      onRefresh={() => void refetch()}
      ListEmptyComponent={
        <EstadoVacio
          ilustracion="durmiendo"
          titulo="Todavía no te has postulado"
          descripcion="Cuando envíes una solicitud, aquí verás en qué estado va."
          accion={<Boton titulo="Ver mascotas" alPresionar={() => router.navigate('/principal/catalogo')} />}
        />
      }
      renderItem={({ item }) => (
        <View style={[estilos.tarjeta, { borderColor: paleta.border, backgroundColor: paleta.surface200 }]}>
          <View style={estilos.cabecera}>
            {item.fotoMascota ? (
              <Image source={{ uri: item.fotoMascota }} style={estilos.foto} accessibilityLabel={`Foto de ${item.nombreMascota}`} />
            ) : (
              <View style={[estilos.foto, estilos.sinFoto, { backgroundColor: paleta.brandTint }]}>
                <PawPrint size={24} strokeWidth={1.75} color={paleta.brandStrong} />
              </View>
            )}
            <View style={estilos.cuerpo}>
              <View style={estilos.fila}>
                <Text style={[estilos.titulo, { color: paleta.ink }]} numberOfLines={1}>{item.nombreMascota}</Text>
                <Insignia estado={ESTADO_SOLICITUD[item.estado]} />
              </View>
              <View style={estilos.meta}>
                <Hash size={13} strokeWidth={1.75} color={paleta.inkMuted} />
                <Text style={[estilos.metaTexto, { color: paleta.inkMuted }]}>{item.codigo}</Text>
              </View>
              <View style={estilos.meta}>
                <CalendarDays size={13} strokeWidth={1.75} color={paleta.inkMuted} />
                <Text style={[estilos.metaTexto, { color: paleta.inkMuted }]}>Enviada el {formatearFecha(item.fechaEnvio)}</Text>
              </View>
            </View>
          </View>
          <ProgresoSolicitud estado={item.estado} />
          {visitaVigente(visitas.data ?? [], item.id) && <VisitaSolicitud visita={visitaVigente(visitas.data ?? [], item.id)!} estadoSolicitud={item.estado} />}
          {!MODO_DEMO && item.estado === EstadoSolicitud.EntrevistaVisita && visitas.isPending && <Text style={{ color: paleta.inkMuted }}>Cargando datos de la visita…</Text>}
          {item.estado === EstadoSolicitud.EntrevistaVisita && visitas.isError && <><Text accessibilityRole="alert" style={{ color: paleta.danger }}>No pudimos cargar los datos de la visita.</Text><Boton titulo="Reintentar visita" variante="secundario" alPresionar={() => void visitas.refetch()} /></>}
          <AccionesAdopcion solicitud={item} />
          <HistorialSolicitud solicitudId={item.id} />
        </View>
      )}
      ListFooterComponent={
        data ? <Paginacion pagina={data.pagina} totalPaginas={data.totalPaginas} ocupado={isRefetching} alCambiar={setPagina} /> : undefined
      }
    />
  );
}

/** Los pasos de una solicitud que avanza, y en que paso va cada estado. */
const PASOS = ['Enviada', 'Revisión', 'Visita', 'Aprobada', 'Adoptada'] as const;
const PASO: Partial<Record<EstadoSolicitud, number>> = {
  [EstadoSolicitud.Enviada]: 0,
  [EstadoSolicitud.EnRevision]: 1,
  [EstadoSolicitud.EntrevistaVisita]: 2,
  [EstadoSolicitud.Aprobada]: 3,
  [EstadoSolicitud.Finalizada]: 4,
};
/** Que significa cada estado para quien se postulo, en una frase. */
const EXPLICACION: Record<EstadoSolicitud, string> = {
  [EstadoSolicitud.Enviada]: 'El refugio todavía no la ha revisado.',
  [EstadoSolicitud.EnRevision]: 'El refugio está revisando tu perfil.',
  [EstadoSolicitud.EntrevistaVisita]: 'El refugio quiere conocerte: te contactará para acordar la entrevista o visita.',
  [EstadoSolicitud.Aprobada]: '¡Aprobada! El refugio coordinará la entrega contigo.',
  [EstadoSolicitud.Rechazada]: 'El refugio no aprobó esta solicitud.',
  [EstadoSolicitud.Finalizada]: 'Adopción finalizada. ¡Gracias por adoptar!',
  [EstadoSolicitud.Cancelada]: 'Cancelaste esta solicitud.',
  [EstadoSolicitud.Cerrada]: 'Se cerró porque la mascota encontró hogar con otra familia.',
  [EstadoSolicitud.Desconocido]: 'No pudimos leer el estado de esta solicitud. Consulta con el refugio.',
};

function ProgresoSolicitud({ estado }: { estado: EstadoSolicitud }) {
  const paleta = usarPaleta();
  const paso = PASO[estado];

  // Rechazada, cancelada o cerrada: no hay camino que mostrar, solo el motivo.
  if (paso === undefined) {
    return (
      <View style={[estilos.cerrada, { backgroundColor: paleta.surface100 }]}>
        <CircleX size={16} strokeWidth={1.75} color={paleta.inkMuted} />
        <Text style={[estilos.explicacion, { color: paleta.inkMuted, flex: 1 }]}>{EXPLICACION[estado]}</Text>
      </View>
    );
  }

  return (
    <View style={estilos.progreso} accessible accessibilityLabel={`Paso ${paso + 1} de ${PASOS.length}: ${PASOS[paso]}. ${EXPLICACION[estado]}`}>
      <View style={estilos.barras}>
        {PASOS.map((nombre, i) => (
          <View key={nombre} style={[estilos.barra, { backgroundColor: i <= paso ? paleta.brandStrong : paleta.surface300 }]} />
        ))}
      </View>
      <View style={estilos.pasos}>
        {PASOS.map((nombre, i) => (
          <Text key={nombre} numberOfLines={1} style={[estilos.paso, { color: i === paso ? paleta.brandStrong : paleta.inkMuted, fontWeight: i === paso ? '700' : '400' }]}>
            {nombre}
          </Text>
        ))}
      </View>
      <Text style={[estilos.explicacion, { color: paleta.ink }]}>{EXPLICACION[estado]}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { padding: espaciado.s4, gap: espaciado.s3, flexGrow: 1 },
  tarjeta: { borderWidth: 1, borderRadius: radios.lg, padding: espaciado.s3, gap: espaciado.s3 },
  cabecera: { flexDirection: 'row', gap: espaciado.s3, alignItems: 'center' },
  foto: { width: 64, height: 64, borderRadius: radios.md },
  sinFoto: { alignItems: 'center', justifyContent: 'center' },
  cuerpo: { flex: 1, minWidth: 0, gap: 4 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s2, marginBottom: 2 },
  titulo: { flexShrink: 1, fontSize: 17, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaTexto: { fontSize: 13 },
  progreso: { gap: 6 },
  barras: { flexDirection: 'row', gap: 4 },
  barra: { flex: 1, height: 5, borderRadius: 3 },
  pasos: { flexDirection: 'row', gap: 4 },
  paso: { flex: 1, fontSize: 11, textAlign: 'center' },
  explicacion: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  cerrada: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, padding: espaciado.s3, borderRadius: radios.md },
});
