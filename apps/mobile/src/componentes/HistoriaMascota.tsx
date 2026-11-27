import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ETIQUETA_TIPO_EVENTO, formatearFecha } from '@huellitas/shared';
import { api } from '@/lib/api';
import { LineaEventos } from '@/componentes/LineaEventos';
import { espaciado, usarPaleta } from '@/temas';

const INICIALES = 4;

/**
 * HU-TRA-02: la bitácora pública de la mascota (no pide sesión). Muestra
 * los últimos eventos y deja ver el resto. Si no hay nada o falla, no
 * ocupa espacio en la ficha.
 */
export function HistoriaMascota({ mascotaId }: { readonly mascotaId: number }) {
  const paleta = usarPaleta();
  const [todo, setTodo] = useState(false);
  const consulta = useQuery({ queryKey: ['historia-mascota', mascotaId], queryFn: () => api.trazabilidad.historialMascota(mascotaId), retry: false });
  const eventos = consulta.data ?? [];
  if (!eventos.length) return null;
  const visibles = todo ? eventos : eventos.slice(0, INICIALES);

  return (
    <View style={estilos.seccion}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>Su historia</Text>
      <LineaEventos eventos={visibles.map((e) => ({ titulo: ETIQUETA_TIPO_EVENTO[e.tipo], meta: formatearFecha(e.fecha), nota: e.descripcion }))} />
      {eventos.length > INICIALES && (
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => setTodo((v) => !v)} style={estilos.mas}>
          <Text style={{ color: paleta.brandStrong, fontWeight: '600' }}>{todo ? 'Ver menos' : `Ver los ${eventos.length - INICIALES} anteriores`}</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  seccion: { gap: espaciado.s3 },
  titulo: { fontSize: 17, fontWeight: '600' },
  mas: { minHeight: 36, justifyContent: 'center' },
});
