import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Cat, Dog, Mars, PawPrint, Venus, type LucideIcon } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { Sexo, type FiltroMascota, type OpcionCatalogo } from '@huellitas/shared';
import { api } from '@/lib/api';
import { espaciado, radios, usarPaleta } from '@/temas';

/** Solo los filtros que el catálogo público del backend acepta. */
export type FiltrosCatalogo = Pick<FiltroMascota, 'especieId' | 'tamanoId' | 'sexo'>;

export function contarFiltros(filtro: FiltrosCatalogo): number {
  return [filtro.especieId, filtro.tamanoId, filtro.sexo].filter(v => v !== undefined).length;
}

interface Props {
  readonly visible: boolean;
  readonly filtro: FiltrosCatalogo;
  readonly especies: readonly OpcionCatalogo[];
  readonly tamanos: readonly OpcionCatalogo[];
  readonly cargandoCatalogos: boolean;
  readonly errorCatalogos: boolean;
  readonly alReintentar: () => void;
  readonly alAplicar: (filtro: FiltrosCatalogo) => void;
  readonly alCerrar: () => void;
}

/**
 * Hoja inferior de filtros del catálogo.
 *
 * Los cambios se acumulan en un borrador y solo se aplican al confirmar,
 * para no recargar el listado con cada toque. Mientras está abierta
 * consulta cuántas mascotas coinciden con el borrador.
 */
export function HojaFiltros({ visible, filtro, especies, tamanos, cargandoCatalogos, errorCatalogos, alReintentar, alAplicar, alCerrar }: Props) {
  const paleta = usarPaleta();
  const { bottom } = useSafeAreaInsets();
  const [borrador, setBorrador] = useState<FiltrosCatalogo>(filtro);

  // Solo al abrir: el padre arma `filtro` en cada render y reiniciaría el borrador.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (visible) setBorrador(filtro); }, [visible]);

  const conteo = useQuery({
    queryKey: ['mascotas', 'conteo', borrador],
    queryFn: () => api.mascotas.buscar({ ...borrador, pagina: 1, tamanoPagina: 1 }),
    enabled: visible,
  });

  const activas = especies.filter(e => e.activo);
  const tamanosActivos = tamanos.filter(t => t.activo);
  const textoAplicar = conteo.isPending ? 'Ver mascotas'
    : conteo.isError ? 'Aplicar filtros'
    : conteo.data.total === 0 ? 'Sin coincidencias'
    : `Ver ${conteo.data.total} ${conteo.data.total === 1 ? 'mascota' : 'mascotas'}`;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={alCerrar}>
      <View style={estilos.contenedor}>
        <Pressable accessibilityRole="button" accessibilityLabel="Cerrar filtros" style={estilos.fondo} onPress={alCerrar} />
        <View style={[estilos.hoja, { backgroundColor: paleta.surface200, borderColor: paleta.border, paddingBottom: bottom + espaciado.s4 }]}>
          <View style={[estilos.agarre, { backgroundColor: paleta.border }]} />
          <View style={estilos.cabecera}>
            <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>Filtros</Text>
            <Pressable accessibilityRole="button" hitSlop={12} disabled={contarFiltros(borrador) === 0}
              onPress={() => setBorrador({})}>
              <Text style={{ color: contarFiltros(borrador) === 0 ? paleta.inkMuted : paleta.brand, fontSize: 15, fontWeight: '600' }}>Limpiar</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ gap: espaciado.s5 }} bounces={false}>
            {cargandoCatalogos ? <ActivityIndicator /> : errorCatalogos ? (
              <View style={{ gap: espaciado.s2 }}>
                <Text style={{ color: paleta.inkMuted }}>No pudimos cargar especies y tamaños.</Text>
                <Pressable accessibilityRole="button" onPress={alReintentar}>
                  <Text style={{ color: paleta.brand, fontWeight: '600' }}>Reintentar</Text>
                </Pressable>
              </View>
            ) : <>
              <Seccion etiqueta="Especie">
                <Segmentado etiqueta="Especie" valor={borrador.especieId ?? 0}
                  opciones={[{ valor: 0, etiqueta: 'Todas' }, ...activas.map(e => ({ valor: e.id, etiqueta: e.nombre, icono: /perro/i.test(e.nombre) ? Dog : /gato/i.test(e.nombre) ? Cat : PawPrint }))]}
                  alCambiar={v => setBorrador(b => ({ ...b, especieId: v || undefined }))} />
              </Seccion>

              {tamanosActivos.length > 0 && (
                <Seccion etiqueta="Tamaño">
                  <View accessibilityRole="radiogroup" accessibilityLabel="Tamaño" style={estilos.fila}>
                    {tamanosActivos.map((t, i) => {
                      const elegido = borrador.tamanoId === t.id;
                      return (
                        <Pressable key={t.id} accessibilityRole="radio" accessibilityState={{ checked: elegido }}
                          accessibilityLabel={`Tamaño: ${t.nombre}`}
                          onPress={() => setBorrador(b => ({ ...b, tamanoId: elegido ? undefined : t.id }))}
                          style={[estilos.tarjetaTamano, {
                            borderColor: elegido ? paleta.brand : paleta.border,
                            backgroundColor: elegido ? paleta.brandStrong : paleta.surface100,
                          }]}>
                          <View style={estilos.icono} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
                            <PawPrint size={20 + Math.min(i, 3) * 5} strokeWidth={1.8} color={elegido ? paleta.onBrand : paleta.inkMuted} />
                          </View>
                          <Text numberOfLines={1} style={{ color: elegido ? paleta.onBrand : paleta.ink, fontSize: 14, fontWeight: elegido ? '600' : '400' }}>{t.nombre}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </Seccion>
              )}
            </>}

            <Seccion etiqueta="Sexo">
              <Segmentado etiqueta="Sexo" valor={borrador.sexo ?? -1}
                opciones={[{ valor: -1, etiqueta: 'Todos' }, { valor: Sexo.Macho, etiqueta: 'Macho', icono: Mars }, { valor: Sexo.Hembra, etiqueta: 'Hembra', icono: Venus }]}
                alCambiar={v => setBorrador(b => ({ ...b, sexo: v === -1 ? undefined : v as Sexo }))} />
            </Seccion>
          </ScrollView>

          <Pressable accessibilityRole="button" accessibilityLabel={textoAplicar}
            onPress={() => alAplicar(borrador)}
            style={({ pressed }) => [estilos.aplicar, { backgroundColor: paleta.brandStrong, opacity: pressed ? 0.85 : 1 }]}>
            {conteo.isFetching && !conteo.isPending ? <ActivityIndicator color={paleta.onBrand} /> :
              <Text style={{ color: paleta.onBrand, fontSize: 16, fontWeight: '600' }}>{textoAplicar}</Text>}
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function Seccion({ etiqueta, children }: { readonly etiqueta: string; readonly children: React.ReactNode }) {
  const paleta = usarPaleta();
  return (
    <View style={{ gap: espaciado.s2 }}>
      <Text style={{ color: paleta.inkMuted, fontSize: 13, fontWeight: '600' }}>{etiqueta}</Text>
      {children}
    </View>
  );
}

/** Las especies adicionales conservan su espacio en una fila desplazable. */
function Segmentado({ etiqueta, opciones, valor, alCambiar }: {
  readonly etiqueta: string;
  readonly opciones: readonly { valor: number; etiqueta: string; icono?: LucideIcon }[];
  readonly valor: number;
  readonly alCambiar: (valor: number) => void;
}) {
  const paleta = usarPaleta();
  return (
    <ScrollView horizontal={opciones.length > 3} showsHorizontalScrollIndicator={opciones.length > 3} contentContainerStyle={{ flexGrow: 1 }}><View accessibilityRole="radiogroup" accessibilityLabel={etiqueta}
      style={[estilos.segmentado, { flex: 1, backgroundColor: paleta.surface100, borderColor: paleta.border }]}>
      {opciones.map(o => {
        const elegida = o.valor === valor;
        return (
          <Pressable key={o.valor} accessibilityRole="radio" accessibilityState={{ checked: elegida }}
            accessibilityLabel={`${etiqueta}: ${o.etiqueta}`} onPress={() => alCambiar(o.valor)}
            style={[estilos.segmento, {
              flexBasis: 0, minWidth: opciones.length > 3 ? 100 : undefined,
              borderColor: elegida ? paleta.brand : 'transparent',
              backgroundColor: elegida ? paleta.brandTint : 'transparent',
            }]}>
            {o.icono && <o.icono size={18} color={elegida ? paleta.brand : paleta.ink} strokeWidth={1.8} />}
            <Text numberOfLines={1} style={{ color: elegida ? paleta.brand : paleta.ink, fontSize: 14, fontWeight: elegida ? '600' : '400' }}>{o.etiqueta}</Text>
          </Pressable>
        );
      })}
    </View></ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenedor: { flex: 1, justifyContent: 'flex-end' },
  fondo: { ...StyleSheet.absoluteFill, backgroundColor: '#0009' },
  hoja: {
    maxHeight: '85%', borderTopLeftRadius: radios.lg, borderTopRightRadius: radios.lg, borderWidth: 1, borderBottomWidth: 0,
    paddingHorizontal: espaciado.s4, paddingTop: espaciado.s2, gap: espaciado.s4,
  },
  agarre: { width: 40, height: 4, borderRadius: radios.pill, alignSelf: 'center' },
  cabecera: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titulo: { fontSize: 19, fontWeight: '700' },
  fila: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s2 },
  tarjetaTamano: {
    flexGrow: 1, flexBasis: '28%', minHeight: 90, gap: espaciado.s1, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: radios.sm, paddingHorizontal: espaciado.s2,
  },
  icono: { height: 34, justifyContent: 'center' },
  segmentado: { flexDirection: 'row', gap: espaciado.s1, padding: espaciado.s1, borderWidth: 1, borderRadius: radios.md },
  segmento: { flexDirection: 'row', gap: 6, flexGrow: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: radios.sm, paddingHorizontal: espaciado.s2 },
  aplicar: { minHeight: 52, borderRadius: radios.md, alignItems: 'center', justifyContent: 'center' },
});
