import { useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, Switch, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ErrorHttp, EstadoMascota, EstadoUsuario, NivelRol, type ConfirmacionPostulacion } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { espaciado, usarPaleta } from '@/temas';

export default function PantallaPostulacion() {
  const { mascotaId: parametro } = useLocalSearchParams<{ mascotaId: string }>();
  const mascotaId = Number(parametro);
  const router = useRouter(); const paleta = usarPaleta(); const cache = useQueryClient();
  const { usuario } = useSesion();
  const [motivacion, setMotivacion] = useState(''); const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false); const [error, setError] = useState('');
  const [confirmacion, setConfirmacion] = useState<ConfirmacionPostulacion>();
  const ocupado = useRef(false);
  const valido = Number.isSafeInteger(mascotaId) && mascotaId > 0;
  const ficha = useQuery({ queryKey: ['mascota', mascotaId], queryFn: () => api.mascotas.obtenerFicha(mascotaId), enabled: valido, retry: false });
  const perfil = useQuery({ queryKey: ['perfil-postulacion', usuario?.id], queryFn: () => api.usuarios.yo(usuario!), enabled: usuario?.rol.nivel === NivelRol.Adoptante, retry: false });
  const cuenta = perfil.data;
  const disponible = ficha.data?.estado === EstadoMascota.Disponible || ficha.data?.estado === EstadoMascota.EnProceso;
  const habilitado = !!cuenta && cuenta.estado === EstadoUsuario.Activo && (cuenta.perfil?.porcentajeCompletitud ?? 0) === 100 && disponible;
  async function enviar() {
    if (ocupado.current || confirmacion || !habilitado) return;
    if (!motivacion.trim() || !acepta) { setError('Cuéntanos por qué quieres adoptar y acepta el compromiso.'); return; }
    ocupado.current = true; setEnviando(true); setError('');
    try {
      const resultado = await api.adopcion.postular({ mascotaId, respuestasFormulario: { motivacion: motivacion.trim() }, aceptaCompromisos: acepta });
      setConfirmacion(resultado);
      void cache.invalidateQueries({ queryKey: ['mascota', mascotaId] });
      void cache.invalidateQueries({ queryKey: ['mascotas'] });
      void cache.invalidateQueries({ queryKey: ['mis-solicitudes'] });
    } catch (e) {
      setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos confirmar el envío. Revisa tu conexión antes de reintentar.');
    } finally { ocupado.current = false; setEnviando(false); }
  }
  const texto = { color: paleta.ink, fontSize: 16 };
  return <ScrollView style={{ backgroundColor: paleta.surface100 }} contentContainerStyle={{ padding: espaciado.s5, paddingBottom: 48, gap: espaciado.s4 }} keyboardShouldPersistTaps="handled">
    {confirmacion ? <>
      <Text accessibilityRole="header" style={{ ...texto, fontSize: 25, fontWeight: '700' }}>Solicitud enviada</Text>
      <Text style={texto}>{confirmacion.mensaje}</Text>
      <Text selectable style={{ ...texto, fontWeight: '700' }}>Código: {confirmacion.solicitud.codigo}</Text>
      <Text style={texto}>{confirmacion.solicitud.mascotaNombre} · {confirmacion.solicitud.estado}</Text>
      <Text style={{ color: paleta.inkMuted }}>Conserva este código. El envío no significa que la adopción esté aprobada.</Text>
      <Boton titulo="Volver al catálogo" alPresionar={() => router.replace('/principal/catalogo')} />
    </> : !usuario ? <><Text style={texto}>Inicia sesión para enviar una solicitud.</Text><Boton titulo="Iniciar sesión" alPresionar={() => router.push('/login')} /></>
    : usuario.rol.nivel !== NivelRol.Adoptante ? <Text style={texto}>Solo una cuenta adoptante puede enviar solicitudes.</Text>
    : !valido ? <Text style={texto}>El identificador de mascota no es válido.</Text>
    : ficha.isPending || perfil.isPending ? <ActivityIndicator />
    : ficha.isError || perfil.isError ? <><Text accessibilityRole="alert" style={texto}>No pudimos cargar la información para postularte.</Text><Boton titulo="Reintentar" alPresionar={() => { void ficha.refetch(); void perfil.refetch(); }} /></>
    : <>
      <Text accessibilityRole="header" style={{ ...texto, fontSize: 25, fontWeight: '700' }}>Adoptar a {ficha.data?.nombre}</Text>
      {!disponible ? <Text style={texto}>Esta mascota ya no admite postulaciones.</Text>
      : cuenta?.estado !== EstadoUsuario.Activo ? <Text style={texto}>Tu cuenta debe estar activa y verificada para postularte.</Text>
      : (cuenta?.perfil?.porcentajeCompletitud ?? 0) < 100 ? <><Text style={texto}>Completa tu perfil de adoptante antes de enviar la solicitud.</Text><Boton titulo="Completar mi perfil" alPresionar={() => router.push('/perfil-adoptante')} /></>
      : <>
        <Text style={{ color: paleta.inkMuted }}>El refugio revisará tu perfil y esta información antes de decidir.</Text>
        <Campo etiqueta="¿Por qué quieres adoptar?" multilinea valor={motivacion} alCambiar={setMotivacion} deshabilitado={enviando} />
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}><Switch accessibilityLabel="Acepto el compromiso de cuidado responsable" value={acepta} onValueChange={setAcepta} disabled={enviando} trackColor={{ true: paleta.brandStrong }} /><Text style={{ ...texto, flex: 1 }}>Me comprometo al cuidado responsable y a conversar con el refugio sobre sus requisitos.</Text></View>
        {error !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
        <Boton titulo="Enviar solicitud" cargando={enviando} deshabilitado={!acepta || !motivacion.trim()} alPresionar={() => void enviar()} />
      </>}
    </>}
    {!confirmacion && <Boton titulo="Volver a la ficha" variante="secundario" deshabilitado={enviando} alPresionar={() => router.back()} />}
  </ScrollView>;
}
