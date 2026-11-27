import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ClipboardCheck } from 'lucide-react-native';
import {
  ESTADO_SEGUIMIENTO, ETIQUETA_RESULTADO_SEGUIMIENTO, EstadoSeguimiento, formatearFecha, type SolicitudResumen,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * HU-TRA-05 y HU-REF-04 en una adopción finalizada: el plan de
 * seguimiento (1, 3 y 6 meses) con el próximo reporte por enviar, y el
 * acceso para calificar al refugio.
 *
 * Ambas cosas necesitan el ID de la adopción, que el backend todavía no
 * manda en la solicitud; mientras falte se avisa en lugar de mostrar
 * botones que fallarían.
 */
export function SeguimientoAdopcion({ solicitud: s }: { readonly solicitud: SolicitudResumen }) {
  const paleta = usarPaleta();
  const router = useRouter();
  const adopcionId = s.adopcionId ?? null;
  const plan = useQuery({
    queryKey: ['plan-seguimiento', adopcionId],
    queryFn: () => api.trazabilidad.planSeguimiento(adopcionId!),
    enabled: adopcionId !== null,
    retry: false,
  });

  if (adopcionId === null) {
    return (
      <View style={[estilos.caja, { backgroundColor: paleta.surface100 }]}>
        <Text style={[estilos.texto, { color: paleta.inkMuted }]}>Pronto podrás enviar aquí los seguimientos de {s.nombreMascota} y calificar al refugio.</Text>
      </View>
    );
  }

  const seguimientos = plan.data?.seguimientos ?? [];
  const siguiente = seguimientos.find((g) => g.estado !== EstadoSeguimiento.Enviado);

  return (
    <View style={[estilos.caja, { backgroundColor: paleta.surface100 }]}>
      <View style={estilos.cabecera}>
        <ClipboardCheck size={16} strokeWidth={1.75} color={paleta.brandStrong} />
        <Text style={[estilos.titulo, { color: paleta.ink }]}>Seguimiento de la adopción</Text>
      </View>
      {plan.isPending ? (
        <Text style={{ color: paleta.inkMuted }}>Cargando…</Text>
      ) : plan.isError ? (
        <Text accessibilityRole="alert" style={{ color: paleta.inkMuted }}>No pudimos cargar el plan de seguimiento.</Text>
      ) : (
        <View style={{ gap: espaciado.s2 }}>
          {seguimientos.map((g) => (
            <View key={g.id} style={estilos.fila} accessible accessibilityLabel={`Seguimiento ${g.numero}: ${ESTADO_SEGUIMIENTO[g.estado].etiqueta}`}>
              <View style={{ flex: 1 }}>
                <Text style={[estilos.numero, { color: paleta.ink }]}>Seguimiento {g.numero}</Text>
                <Text style={[estilos.texto, { color: paleta.inkMuted }]}>
                  {g.fechaEnvio ? `Enviado el ${formatearFecha(g.fechaEnvio)}` : `Para el ${formatearFecha(g.fechaProgramada)}`}
                  {g.resultado !== null ? ` · ${ETIQUETA_RESULTADO_SEGUIMIENTO[g.resultado]}` : ''}
                </Text>
              </View>
              <Insignia estado={ESTADO_SEGUIMIENTO[g.estado]} />
            </View>
          ))}
          {siguiente && (
            <Boton
              titulo={`Enviar seguimiento ${siguiente.numero}`}
              alPresionar={() => router.push({ pathname: '/seguimiento/[seguimientoId]', params: { seguimientoId: String(siguiente.id), numero: String(siguiente.numero), mascota: s.nombreMascota } })}
            />
          )}
        </View>
      )}
      {s.refugioId ? (
        <Boton
          titulo="Calificar al refugio"
          variante="secundario"
          alPresionar={() => router.push({ pathname: '/calificar/[adopcionId]', params: { adopcionId: String(adopcionId), refugioId: String(s.refugioId), mascota: s.nombreMascota } })}
        />
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  caja: { padding: espaciado.s3, borderRadius: radios.md, gap: espaciado.s3 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  titulo: { fontSize: 14, fontWeight: '600' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  numero: { fontSize: 14, fontWeight: '600' },
  texto: { fontSize: 13, lineHeight: 18 },
});
