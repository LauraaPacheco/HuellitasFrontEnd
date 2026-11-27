import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { HeartHandshake } from 'lucide-react-native';
import { ErrorHttp } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * HU-REF-03: pedir ser padrino de una mascota. Es para quien quiere
 * ayudarla sin adoptarla; el refugio acepta o rechaza la solicitud.
 */
export default function PantallaApadrinar() {
  const paleta = usarPaleta();
  const router = useRouter();
  const cliente = useQueryClient();
  const { usuario, puedeActuar, cargando } = useSesion();
  const mascotaId = Number(useLocalSearchParams<{ mascotaId: string }>().mascotaId);
  const valido = Number.isSafeInteger(mascotaId) && mascotaId > 0;
  const [mensaje, setMensaje] = useState('');
  const ficha = useQuery({ queryKey: ['mascota', mascotaId], queryFn: () => api.mascotas.obtenerFicha(mascotaId), enabled: valido, retry: false });
  const enviar = useMutation({
    mutationFn: () => api.refugios.apadrinar(mascotaId, mensaje),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['apadrinamientos'] }),
  });

  if (cargando) return <EstadoCargando mensaje="Cargando…" />;
  if (!usuario) return <AvisoSesion titulo="Apadrina una mascota" mensaje="Crea tu cuenta para apoyar a una mascota mientras encuentra hogar." />;
  if (!puedeActuar) return <EstadoVacio titulo="Solo para adoptantes" descripcion="Apadrinar está disponible para las cuentas de adoptante." />;
  if (!valido) return <EstadoVacio ilustracion="confundido" titulo="Esta mascota no existe" descripcion="El enlace no es válido." />;
  if (ficha.isPending) return <EstadoCargando mensaje="Cargando…" />;
  const nombre = ficha.data?.nombre ?? 'esta mascota';

  if (enviar.isSuccess) {
    return (
      <EstadoVacio
        ilustracion="trio"
        titulo="¡Solicitud enviada!"
        descripcion={`El refugio revisará tu solicitud para apadrinar a ${nombre}. Puedes seguirla en Perfil › Mis apadrinamientos.`}
        accion={<Boton titulo="Ver mis apadrinamientos" alPresionar={() => router.replace('/apadrinamientos')} />}
      />
    );
  }

  const error = enviar.error instanceof ErrorHttp ? enviar.error.detalle ?? enviar.error.message : enviar.error ? 'No pudimos enviar la solicitud. Intenta de nuevo.' : '';

  return (
    <ScrollView style={{ backgroundColor: paleta.surface100 }} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <View style={[estilos.tarjeta, { backgroundColor: paleta.brandTint }]}>
        <HeartHandshake size={28} strokeWidth={1.75} color={paleta.brandStrong} />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[estilos.titulo, { color: paleta.ink }]}>Apadrinar a {nombre}</Text>
          <Text style={[estilos.texto, { color: paleta.inkMuted }]}>Como padrino apoyas su cuidado (alimento, vacunas, visitas) mientras encuentra una familia. No es una adopción.</Text>
        </View>
      </View>
      <Campo
        etiqueta="Cuéntale al refugio cómo quieres ayudar (opcional)"
        valor={mensaje}
        alCambiar={setMensaje}
        multilinea
        marcador="Puedo aportar el alimento de cada mes"
        deshabilitado={enviar.isPending}
      />
      {error !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
      <Boton titulo="Enviar solicitud" cargando={enviar.isPending} alPresionar={() => enviar.mutate()} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, gap: espaciado.s4 },
  tarjeta: { flexDirection: 'row', gap: espaciado.s3, padding: espaciado.s4, borderRadius: radios.md, alignItems: 'flex-start' },
  titulo: { fontSize: 18, fontWeight: '700' },
  texto: { fontSize: 14, lineHeight: 20 },
});
