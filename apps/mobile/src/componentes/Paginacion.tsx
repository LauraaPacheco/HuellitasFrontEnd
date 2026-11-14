import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { espaciado, radios, usarPaleta } from '@/temas';

/** Fila compacta: ‹ Página 1 de 3 ›. La misma en todas las listas. */
export function Paginacion({
  pagina,
  totalPaginas,
  ocupado = false,
  alCambiar,
}: {
  readonly pagina: number;
  readonly totalPaginas: number;
  readonly ocupado?: boolean;
  readonly alCambiar: (pagina: number) => void;
}) {
  const paleta = usarPaleta();
  if (totalPaginas <= 1) return null;

  return (
    <View style={estilos.fila}>
      <Flecha direccion="anterior" deshabilitado={pagina <= 1 || ocupado} alPresionar={() => alCambiar(pagina - 1)} />
      <Text style={{ color: paleta.inkMuted, fontSize: 14 }}>
        Página {pagina} de {totalPaginas}
      </Text>
      <Flecha direccion="siguiente" deshabilitado={pagina >= totalPaginas || ocupado} alPresionar={() => alCambiar(pagina + 1)} />
    </View>
  );
}

function Flecha({ direccion, deshabilitado, alPresionar }: { direccion: 'anterior' | 'siguiente'; deshabilitado: boolean; alPresionar: () => void }) {
  const paleta = usarPaleta();
  const Icono = direccion === 'anterior' ? ChevronLeft : ChevronRight;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={direccion === 'anterior' ? 'Página anterior' : 'Página siguiente'}
      accessibilityState={{ disabled: deshabilitado }}
      disabled={deshabilitado}
      onPress={alPresionar}
      style={({ pressed }) => [
        estilos.boton,
        { borderColor: paleta.border, backgroundColor: pressed ? paleta.surface300 : paleta.surface200, opacity: deshabilitado ? 0.45 : 1 },
      ]}
    >
      <Icono size={20} strokeWidth={1.75} color={paleta.ink} />
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: espaciado.s2 },
  boton: { width: 44, height: 44, borderWidth: 1, borderRadius: radios.md, alignItems: 'center', justifyContent: 'center' },
});
