import { useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { ImagePlus, X } from 'lucide-react-native';
import { ErrorHttp, validarArchivoServidor } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, radios, usarPaleta } from '@/temas';

const MAX_FOTOS = 4;

/**
 * HU-TRA-05: el adoptante cuenta cómo está su mascota (salud y adaptación)
 * y puede sumar fotos. Las fotos se suben antes a /api/v1/Archivos.
 */
export default function PantallaReporteSeguimiento() {
  const paleta = usarPaleta();
  const router = useRouter();
  const cliente = useQueryClient();
  const { usuario, puedeActuar, cargando } = useSesion();
  const params = useLocalSearchParams<{ seguimientoId: string; numero?: string; mascota?: string }>();
  const seguimientoId = Number(params.seguimientoId);
  const mascota = params.mascota ?? 'tu mascota';
  const [salud, setSalud] = useState('');
  const [adaptacion, setAdaptacion] = useState('');
  const [comentarios, setComentarios] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState('');

  const enviar = useMutation({
    mutationFn: () => api.trazabilidad.enviarReporte(seguimientoId, { estadoSalud: salud, adaptacion, comentarios, fotosUrls: fotos }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['plan-seguimiento'] }),
    onError: (e) => setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos enviar el seguimiento. Intenta de nuevo.'),
  });

  async function agregarFotos() {
    setError('');
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_FOTOS - fotos.length, quality: 0.8 });
    if (resultado.canceled) return;
    setSubiendo(true);
    try {
      const nuevas: string[] = [];
      for (const activo of resultado.assets) {
        const nombre = activo.fileName ?? `foto-${Date.now()}.jpg`;
        const problema = validarArchivoServidor(nombre, activo.fileSize ?? 1, true);
        if (problema) { setError(`${nombre}: ${problema}`); continue; }
        const form = new FormData();
        form.append('tipo', 'mascotas');
        if (Platform.OS === 'web' && activo.file) form.append('archivo', activo.file);
        else form.append('archivo', { uri: activo.uri, name: nombre, type: activo.mimeType ?? 'image/jpeg' } as unknown as Blob);
        nuevas.push(await api.archivos.subir(form));
      }
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch (e) {
      setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos subir las fotos.');
    } finally {
      setSubiendo(false);
    }
  }

  function intentarEnviar() {
    if (!salud.trim() || !adaptacion.trim()) { setError('Cuéntanos cómo está de salud y cómo se ha adaptado.'); return; }
    setError('');
    enviar.mutate();
  }

  if (cargando) return <EstadoCargando mensaje="Cargando…" />;
  if (!usuario) return <AvisoSesion titulo="Seguimiento" mensaje="Inicia sesión para enviar el seguimiento de tu adopción." />;
  if (!puedeActuar || !Number.isSafeInteger(seguimientoId)) return <EstadoVacio ilustracion="confundido" titulo="No encontramos este seguimiento" descripcion="Vuelve a tus solicitudes e inténtalo de nuevo." />;

  if (enviar.isSuccess) {
    return (
      <EstadoVacio
        ilustracion="trio"
        titulo="¡Gracias por contarnos!"
        descripcion={`El refugio revisará el seguimiento de ${mascota} y te avisará si necesita algo más.`}
        accion={<Boton titulo="Volver a mis solicitudes" alPresionar={() => (router.canGoBack() ? router.back() : router.replace('/principal/solicitudes'))} />}
      />
    );
  }

  const ocupado = enviar.isPending || subiendo;
  return (
    <ScrollView style={{ backgroundColor: paleta.surface100 }} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Text style={[estilos.intro, { color: paleta.inkMuted }]}>
        Seguimiento {params.numero ?? ''} de {mascota}. El refugio lo usa para saber que todo va bien.
      </Text>
      <Campo etiqueta="¿Cómo está de salud?" valor={salud} alCambiar={setSalud} multilinea marcador="Come bien, ya le pusieron la vacuna de refuerzo" deshabilitado={ocupado} />
      <Campo etiqueta="¿Cómo se ha adaptado a la casa?" valor={adaptacion} alCambiar={setAdaptacion} multilinea marcador="Duerme en su cama y ya juega con los niños" deshabilitado={ocupado} />
      <Campo etiqueta="Algo más que quieras contar (opcional)" valor={comentarios} alCambiar={setComentarios} multilinea deshabilitado={ocupado} />

      <View style={{ gap: espaciado.s2 }}>
        <Text style={[estilos.etiqueta, { color: paleta.ink }]}>Fotos (opcional, hasta {MAX_FOTOS})</Text>
        <View style={estilos.fotos}>
          {fotos.map((uri, i) => (
            <View key={uri} style={estilos.foto}>
              <Image source={{ uri }} style={estilos.imagen} accessibilityLabel={`Foto ${i + 1}`} />
              <Pressable accessibilityRole="button" accessibilityLabel={`Quitar foto ${i + 1}`} hitSlop={6} disabled={ocupado}
                onPress={() => setFotos((f) => f.filter((x) => x !== uri))} style={[estilos.quitar, { backgroundColor: paleta.surface100 }]}>
                <X size={14} strokeWidth={2} color={paleta.ink} />
              </Pressable>
            </View>
          ))}
          {fotos.length < MAX_FOTOS && (
            <Pressable accessibilityRole="button" accessibilityLabel="Agregar fotos" disabled={ocupado} onPress={() => void agregarFotos()}
              style={({ pressed }) => [estilos.foto, estilos.agregar, { borderColor: paleta.border, backgroundColor: paleta.surface200, opacity: pressed || ocupado ? 0.6 : 1 }]}>
              <ImagePlus size={22} strokeWidth={1.75} color={paleta.brandStrong} />
              <Text style={{ color: paleta.inkMuted, fontSize: 12 }}>{subiendo ? 'Subiendo…' : 'Agregar'}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {error !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
      <Boton titulo="Enviar seguimiento" cargando={enviar.isPending} deshabilitado={subiendo} alPresionar={intentarEnviar} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, gap: espaciado.s4 },
  intro: { fontSize: 14, lineHeight: 20 },
  etiqueta: { fontSize: 14, fontWeight: '600' },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s2 },
  foto: { width: 76, height: 76, borderRadius: radios.sm, overflow: 'hidden' },
  imagen: { width: '100%', height: '100%' },
  quitar: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  agregar: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: 2 },
});
