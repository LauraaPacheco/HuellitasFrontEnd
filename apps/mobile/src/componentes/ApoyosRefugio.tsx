import { StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { HandHeart, Star } from 'lucide-react-native';
import { ETIQUETA_TIPO_NECESIDAD, EstadoNecesidad, formatearFecha } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/Boton';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { espaciado, radios, usarPaleta } from '@/temas';

/** Lo que el refugio necesita que le donen (HU-REF-03). Solo lo publicado. */
export function NecesidadesRefugio({ refugioId }: { readonly refugioId: number }) {
  const paleta = usarPaleta();
  const consulta = useQuery({ queryKey: ['necesidades', refugioId, 'publicas'], queryFn: () => api.refugios.necesidades(refugioId, { tamanoPagina: 50 }), retry: false });

  if (consulta.isPending) return <EstadoCargando compacto mensaje="Cargando necesidades…" />;
  if (consulta.isError) return <Reintentar texto="No pudimos cargar lo que necesita el refugio." alReintentar={() => void consulta.refetch()} />;
  const abiertas = consulta.data.items.filter((n) => n.estado === EstadoNecesidad.Publicada);
  if (!abiertas.length) return <Aviso texto="Por ahora el refugio no ha publicado necesidades de donación." />;

  return (
    <View style={estilos.lista}>
      <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>Si quieres ayudar sin adoptar, esto es lo que les hace falta.</Text>
      {abiertas.map((n) => (
        <View key={n.id} style={[estilos.tarjeta, { borderColor: paleta.border, backgroundColor: paleta.surface200 }]}>
          <View style={[estilos.chip, { backgroundColor: paleta.brandTint }]}>
            <HandHeart size={14} strokeWidth={1.75} color={paleta.brandStrong} />
            <Text style={[estilos.chipTexto, { color: paleta.brandStrong }]}>{ETIQUETA_TIPO_NECESIDAD[n.tipo]}</Text>
          </View>
          <Text style={[estilos.texto, { color: paleta.ink }]}>{n.descripcion}</Text>
          {n.medioDonacion && (
            <Text selectable style={[estilos.meta, { color: paleta.inkMuted }]}>Cómo donar: <Text style={{ color: paleta.ink, fontWeight: '600' }}>{n.medioDonacion}</Text></Text>
          )}
        </View>
      ))}
    </View>
  );
}

/** Opiniones de quienes adoptaron (HU-REF-04), con el promedio. */
export function OpinionesRefugio({ refugioId }: { readonly refugioId: number }) {
  const paleta = usarPaleta();
  const consulta = useQuery({ queryKey: ['opiniones', refugioId], queryFn: () => api.refugios.opiniones(refugioId, { tamanoPagina: 20 }), retry: false });

  if (consulta.isPending) return <EstadoCargando compacto mensaje="Cargando opiniones…" />;
  if (consulta.isError) return <Reintentar texto="No pudimos cargar las opiniones." alReintentar={() => void consulta.refetch()} />;
  const items = consulta.data.items;
  if (!items.length) return <Aviso texto="Aún no hay opiniones. Las dejan quienes ya adoptaron en este refugio." />;
  const promedio = items.reduce((s, o) => s + o.puntaje, 0) / items.length;

  return (
    <View style={estilos.lista}>
      <View style={estilos.resumen} accessible accessibilityLabel={`${promedio.toFixed(1)} de 5 estrellas en promedio, ${consulta.data.total} opiniones`}>
        <Text style={[estilos.promedio, { color: paleta.ink }]}>{promedio.toFixed(1)}</Text>
        <Estrellas puntaje={promedio} />
        <Text style={[estilos.meta, { color: paleta.inkMuted }]}>{consulta.data.total} {consulta.data.total === 1 ? 'opinión' : 'opiniones'}</Text>
      </View>
      {items.map((o) => (
        <View key={o.id} style={[estilos.tarjeta, { borderColor: paleta.border, backgroundColor: paleta.surface200 }]}>
          <View style={estilos.cabecera}>
            <Text style={[estilos.autor, { color: paleta.ink }]} numberOfLines={1}>{o.autor}</Text>
            <View accessible accessibilityLabel={`${o.puntaje} de 5 estrellas`}><Estrellas puntaje={o.puntaje} /></View>
          </View>
          {o.comentario && <Text style={[estilos.texto, { color: paleta.ink }]}>{o.comentario}</Text>}
          <Text style={[estilos.meta, { color: paleta.inkMuted }]}>{formatearFecha(o.fecha)}</Text>
        </View>
      ))}
    </View>
  );
}

function Estrellas({ puntaje }: { readonly puntaje: number }) {
  return (
    <View style={estilos.estrellas} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      {[1, 2, 3, 4, 5].map((i) => {
        const llena = i <= Math.round(puntaje);
        return <Star key={i} size={15} strokeWidth={1.75} color={llena ? '#f5a524' : '#9aa9a6'} fill={llena ? '#f5a524' : 'transparent'} />;
      })}
    </View>
  );
}

function Aviso({ texto }: { readonly texto: string }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.tarjeta, { borderColor: 'transparent', backgroundColor: paleta.surface200 }]}>
      <Text style={[estilos.texto, { color: paleta.inkMuted }]}>{texto}</Text>
    </View>
  );
}

function Reintentar({ texto, alReintentar }: { readonly texto: string; readonly alReintentar: () => void }) {
  const paleta = usarPaleta();
  return (
    <View style={estilos.lista}>
      <Text accessibilityRole="alert" style={{ color: paleta.inkMuted }}>{texto}</Text>
      <Boton titulo="Reintentar" variante="secundario" alPresionar={alReintentar} />
    </View>
  );
}

const estilos = StyleSheet.create({
  lista: { gap: espaciado.s3 },
  ayuda: { fontSize: 14, lineHeight: 20 },
  tarjeta: { borderWidth: 1, borderRadius: radios.md, padding: espaciado.s3, gap: espaciado.s2 },
  chip: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 3, borderRadius: radios.pill },
  chipTexto: { fontSize: 13, fontWeight: '600' },
  texto: { fontSize: 15, lineHeight: 22 },
  meta: { fontSize: 13 },
  resumen: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, flexWrap: 'wrap' },
  promedio: { fontSize: 26, fontWeight: '700' },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s2 },
  autor: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  estrellas: { flexDirection: 'row', gap: 2 },
});
