import { Text, View } from 'react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { EstadoSolicitud, formatearFechaHora, type VisitaResumen } from '@huellitas/shared';
import { api } from '@/lib/api';
import { usarPaleta } from '@/temas';
import { Boton } from './Boton';

export function VisitaSolicitud({ visita, estadoSolicitud }: { visita: VisitaResumen; estadoSolicitud: EstadoSolicitud }) {
  const paleta = usarPaleta();
  const cache = useQueryClient();
  const respuesta = useMutation({
    mutationFn: (aceptar: boolean) => api.adopcion.confirmarVisita(visita.solicitudId, aceptar),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['mis-visitas'] }),
        cache.invalidateQueries({ queryKey: ['mis-solicitudes'] }),
      ]);
    },
  });
  const pendiente = visita.estado === 'Propuesta' && estadoSolicitud === EstadoSolicitud.EntrevistaVisita;
  const estado = visita.estado === 'Confirmada' ? 'Aceptaste esta visita.' : visita.estado === 'Reprogramada'
    ? 'Rechazaste esta fecha. El refugio debe proponerte una nueva.' : visita.estado === 'Propuesta'
      ? 'El refugio te propone una visita.' : `Visita ${visita.estado.toLowerCase()}.`;
  return <View style={{ gap: 10, padding: 14, borderWidth: 1, borderColor: paleta.border, borderRadius: 16, backgroundColor: paleta.surface200 }}>
    <Text accessibilityRole="header" style={{ color: paleta.ink, fontWeight: '600', fontSize: 16 }}>Visita con {visita.refugioNombre}</Text>
    <Text style={{ color: paleta.ink }}>{formatearFechaHora(visita.fecha)}</Text>
    <Text style={{ color: paleta.ink }}>Modalidad: {visita.modalidad}</Text>
    <Text accessibilityLiveRegion="polite" style={{ color: paleta.inkMuted }}>{estado}</Text>
    {pendiente && <>
      <Boton titulo="Aceptar visita" cargando={respuesta.isPending && respuesta.variables === true} deshabilitado={respuesta.isPending} alPresionar={() => respuesta.mutate(true)} />
      <Boton titulo="Rechazar visita" variante="peligro" cargando={respuesta.isPending && respuesta.variables === false} deshabilitado={respuesta.isPending} alPresionar={() => respuesta.mutate(false)} />
    </>}
    {respuesta.isError && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{respuesta.error.message}</Text>}
  </View>;
}
