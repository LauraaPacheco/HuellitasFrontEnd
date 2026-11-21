import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Star } from 'lucide-react-native';
import { ErrorHttp } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, usarPaleta } from '@/temas';

const ETIQUETAS = ['', 'Muy mala', 'Mala', 'Regular', 'Buena', 'Excelente'];

/** HU-REF-04: el adoptante califica al refugio de 1 a 5 después de adoptar. Una vez por adopción. */
export default function PantallaCalificar() {
  const paleta = usarPaleta();
  const router = useRouter();
  const cliente = useQueryClient();
  const { usuario, puedeActuar, cargando } = useSesion();
  const params = useLocalSearchParams<{ adopcionId: string; refugioId?: string; mascota?: string }>();
  const adopcionId = Number(params.adopcionId);
  const refugioId = Number(params.refugioId);
  const [puntaje, setPuntaje] = useState(0);
  const [comentario, setComentario] = useState('');
  const [error, setError] = useState('');

  const calificar = useMutation({
    mutationFn: () => api.refugios.calificar(refugioId, { adopcionId, puntaje, comentario }),
    onSuccess: () => void cliente.invalidateQueries({ queryKey: ['opiniones', refugioId] }),
    onError: (e) => setError(e instanceof ErrorHttp && e.estadoHttp === 409 ? 'Ya calificaste esta adopción. ¡Gracias!' : e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos enviar tu calificación.'),
  });

  if (cargando) return <EstadoCargando mensaje="Cargando…" />;
  if (!usuario) return <AvisoSesion titulo="Califica al refugio" mensaje="Inicia sesión para calificar tu experiencia." />;
  if (!puedeActuar || !Number.isSafeInteger(adopcionId) || !Number.isSafeInteger(refugioId)) {
    return <EstadoVacio ilustracion="confundido" titulo="No encontramos esta adopción" descripcion="Vuelve a tus solicitudes e inténtalo de nuevo." />;
  }
  if (calificar.isSuccess) {
    return (
      <EstadoVacio
        ilustracion="trio"
        titulo="¡Gracias por tu opinión!"
        descripcion="Ayuda a otras familias a conocer el refugio."
        accion={<Boton titulo="Ver el refugio" alPresionar={() => router.replace(`/refugio/${refugioId}`)} />}
      />
    );
  }

  return (
    <ScrollView style={{ backgroundColor: paleta.surface100 }} contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled">
      <Text style={[estilos.pregunta, { color: paleta.ink }]}>¿Cómo fue tu experiencia adoptando a {params.mascota ?? 'tu mascota'}?</Text>
      <View style={estilos.estrellas} accessibilityRole="radiogroup" accessibilityLabel="Calificación de 1 a 5 estrellas">
        {[1, 2, 3, 4, 5].map((i) => (
          <Pressable key={i} accessibilityRole="radio" accessibilityState={{ checked: puntaje === i }} accessibilityLabel={`${i} ${i === 1 ? 'estrella' : 'estrellas'}, ${ETIQUETAS[i]}`}
            hitSlop={4} disabled={calificar.isPending} onPress={() => { setPuntaje(i); setError(''); }} style={estilos.estrella}>
            <Star size={38} strokeWidth={1.5} color={i <= puntaje ? '#f5a524' : paleta.inkMuted} fill={i <= puntaje ? '#f5a524' : 'transparent'} />
          </Pressable>
        ))}
      </View>
      <Text style={[estilos.etiqueta, { color: paleta.inkMuted }]}>{puntaje ? ETIQUETAS[puntaje] : 'Toca las estrellas'}</Text>
      <Campo etiqueta="Cuéntale a otras familias (opcional)" valor={comentario} alCambiar={setComentario} multilinea marcador="Nos acompañaron en todo el proceso" deshabilitado={calificar.isPending} />
      {error !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
      <Boton titulo="Enviar calificación" cargando={calificar.isPending} deshabilitado={!puntaje} alPresionar={() => calificar.mutate()} />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, gap: espaciado.s4 },
  pregunta: { fontSize: 18, fontWeight: '700', lineHeight: 25 },
  estrellas: { flexDirection: 'row', justifyContent: 'center', gap: espaciado.s2 },
  estrella: { padding: 2 },
  etiqueta: { textAlign: 'center', fontSize: 14 },
});
