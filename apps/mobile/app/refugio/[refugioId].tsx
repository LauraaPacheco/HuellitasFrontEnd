import { ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { ESTADO_VERIFICACION, EstadoVerificacion } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { espaciado, usarPaleta } from '@/temas';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function PantallaRefugio() {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const id = Number(useLocalSearchParams<{ refugioId: string }>().refugioId);
  const valido = Number.isInteger(id) && id > 0;
  const consulta = useQuery({ queryKey: ['perfil-publico-refugio', id], queryFn: () => api.refugios.obtener(id), enabled: valido, retry: false });
  const refugio = consulta.data;
  if (consulta.isPending && valido) return <Text style={{ padding: 24, color: paleta.ink }}>Cargando refugio…</Text>;
  if (!valido || consulta.isError || !refugio || refugio.estadoVerificacion !== EstadoVerificacion.Verificado) return (
    <View style={{ padding: espaciado.s5, gap: espaciado.s4 }}>
      <Text accessibilityRole="alert" style={{ color: paleta.ink }}>El perfil no está disponible o el refugio aún no está verificado.</Text>
      {valido && <Boton titulo="Reintentar" alPresionar={() => void consulta.refetch()} />}
    </View>
  );
  return <ScrollView style={{ flex: 1, backgroundColor: paleta.surface100 }} contentContainerStyle={{ padding: espaciado.s5, paddingBottom: margenes.bottom + espaciado.s5, gap: espaciado.s4 }}>
    <Text accessibilityRole="header" style={{ color: paleta.ink, fontSize: 26, fontWeight: '700' }}>{refugio.nombre}</Text>
    <Insignia estado={ESTADO_VERIFICACION[refugio.estadoVerificacion]} />
    <Text style={{ color: paleta.ink, lineHeight: 23 }}>{refugio.descripcion || 'El refugio todavía no agregó una descripción.'}</Text>
    {[['Dirección', refugio.direccion], ['Teléfono', refugio.telefono], ['Correo de contacto', refugio.correo], ['Redes sociales', refugio.redesSociales]].map(([etiqueta, valor]) => <View key={etiqueta} style={{ gap: espaciado.s1 }}>
      <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>{etiqueta}</Text><Text style={{ color: paleta.ink }}>{valor || 'Sin información'}</Text>
    </View>)}
    <Text accessibilityRole="header" style={{ color: paleta.ink, fontSize: 20, fontWeight: '600' }}>Requisitos de adopción</Text>
    {refugio.requisitos.some(r => r.activo) ? [...refugio.requisitos].filter(r => r.activo).sort((a,b) => a.orden-b.orden).map(r => <Text key={r.id} style={{ color: paleta.ink, lineHeight: 23 }}>• {r.descripcion} ({r.esObligatorio ? 'Obligatorio' : 'Opcional'})</Text>)
      : <Text style={{ color: paleta.inkMuted }}>El refugio todavía no publicó sus requisitos. Consulta sus condiciones antes de postularte.</Text>}
  </ScrollView>;
}
