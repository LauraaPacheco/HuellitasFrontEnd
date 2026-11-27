import { StyleSheet, Text, View } from 'react-native';
import { espaciado, usarPaleta } from '@/temas';

export interface EventoLinea {
  readonly titulo: string;
  readonly meta: string;
  readonly nota?: string | null;
}

/** Línea de tiempo vertical: un punto por evento unidos por una línea. El último se resalta. */
export function LineaEventos({ eventos, resaltarUltimo = false }: { readonly eventos: readonly EventoLinea[]; readonly resaltarUltimo?: boolean }) {
  const paleta = usarPaleta();
  return (
    <View>
      {eventos.map((e, i) => {
        const ultimo = i === eventos.length - 1;
        const resaltado = resaltarUltimo ? ultimo : i === 0;
        return (
          <View key={`${e.meta}-${i}`} style={estilos.evento} accessible accessibilityLabel={`${e.titulo}, ${e.meta}${e.nota ? `. ${e.nota}` : ''}`}>
            <View style={estilos.columna}>
              <View style={[estilos.punto, { borderColor: paleta.brand, backgroundColor: resaltado ? paleta.brandStrong : paleta.surface100 }]} />
              {!ultimo && <View style={[estilos.linea, { backgroundColor: paleta.border }]} />}
            </View>
            <View style={[estilos.cuerpo, !ultimo && { paddingBottom: espaciado.s4 }]}>
              <Text style={[estilos.titulo, { color: paleta.ink }]}>{e.titulo}</Text>
              <Text style={[estilos.meta, { color: paleta.inkMuted }]}>{e.meta}</Text>
              {e.nota ? <Text style={[estilos.nota, { color: paleta.ink }]}>{e.nota}</Text> : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  evento: { flexDirection: 'row', gap: espaciado.s3 },
  columna: { width: 18, alignItems: 'center' },
  punto: { width: 18, height: 18, borderRadius: 9, borderWidth: 2, marginTop: 1 },
  linea: { flex: 1, width: 2, marginTop: 2 },
  cuerpo: { flex: 1, gap: 2 },
  titulo: { fontSize: 15, fontWeight: '600' },
  meta: { fontSize: 13 },
  nota: { fontSize: 14, lineHeight: 20, marginTop: 2 },
});
