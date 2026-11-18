import { useEffect, useRef, useState, type ComponentProps } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Tabs } from 'expo-router';
import { espaciado, usarPaleta } from '@/temas';

type PropsBarra = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

/* Las mismas medidas de la barra inferior de la web. */
const ALTO = 64;
const RADIO_ESQUINA = 20;
const MEDIO_ANCHO_MUESCA = 50;
const PROFUNDIDAD = 34;
const BURBUJA = 52;

/**
 * Espacio que deben dejar al final las pantallas con pestanas: la barra
 * flota sobre el contenido (como en la web) y sin este relleno lo ultimo
 * quedaria tapado.
 */
export function useEspacioBarraPestanas() {
  const { bottom } = useSafeAreaInsets();
  return ALTO + Math.max(bottom, espaciado.s2) + espaciado.s4;
}

/**
 * Barra con esquinas de arriba redondeadas y una muesca curva bajo la
 * pestana activa. Las de abajo van rectas: la barra se apoya en el borde
 * inferior de la pantalla.
 */
function formaBarra(ancho: number, cx: number) {
  const r = RADIO_ESQUINA;
  const m = MEDIO_ANCHO_MUESCA;
  const p = PROFUNDIDAD;
  return [
    `M ${r} 0`, `L ${cx - m} 0`,
    `C ${cx - m * 0.45} 0 ${cx - m * 0.72} ${p} ${cx} ${p}`,
    `C ${cx + m * 0.72} ${p} ${cx + m * 0.45} 0 ${cx + m} 0`,
    `L ${ancho - r} 0`, `Q ${ancho} 0 ${ancho} ${r}`,
    `L ${ancho} ${ALTO}`, `L 0 ${ALTO}`,
    `L 0 ${r}`, `Q 0 0 ${r} 0`, 'Z',
  ].join(' ');
}

/**
 * Barra de pestanas de la app, con el mismo diseno que la barra inferior
 * de la web, en el verde de la marca y apoyada en el borde inferior, y la pestana activa sube
 * en un circulo sobre una muesca. Al cambiar de pestana, circulo y muesca
 * se deslizan juntos.
 */
export function BarraPestanas({ state, descriptors, emitter, navigateToTab }: PropsBarra) {
  const paleta = usarPaleta();
  const { bottom } = useSafeAreaInsets();
  const [ancho, setAncho] = useState(0);

  const total = state.routes.length;
  // Los centros se alejan de las esquinas lo justo para que la muesca de
  // los extremos no se coma la curva del borde.
  const margen = RADIO_ESQUINA + MEDIO_ANCHO_MUESCA;
  const centro = (indice: number) => margen + ((ancho - margen * 2) / Math.max(total - 1, 1)) * indice;

  const animado = useRef(new Animated.Value(0)).current;
  const [cx, setCx] = useState(0);
  const listo = useRef(false);

  useEffect(() => {
    const id = animado.addListener(({ value }) => setCx(value));
    return () => animado.removeListener(id);
  }, [animado]);

  useEffect(() => {
    if (!ancho) return;
    const destino = centro(state.index);
    if (!listo.current) {
      animado.setValue(destino);
      listo.current = true;
      return;
    }
    Animated.timing(animado, {
      toValue: destino,
      duration: 320,
      easing: Easing.bezier(0.3, 0.8, 0.3, 1),
      useNativeDriver: false,
    }).start();
    // centro depende de ancho y total, que ya estan en las dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.index, ancho, total]);

  const rutaActiva = state.routes[state.index];
  const opcionesActivas = rutaActiva ? descriptors[rutaActiva.key]?.options : undefined;

  return (
    // Flota sobre la pantalla y sin fondo propio: por la muesca y alrededor
    // de la burbuja se ve el contenido, no una franja del color de fondo.
    // box-none deja pasar los toques del espacio vacio al contenido.
    <View pointerEvents="box-none" style={estilos.contenedor}>
      <View
        style={estilos.barra}
        onLayout={(e: LayoutChangeEvent) => setAncho(e.nativeEvent.layout.width)}
        accessibilityRole="tablist"
      >
        {ancho > 0 && (
          <>
            <Svg width={ancho} height={ALTO} style={StyleSheet.absoluteFill}>
              <Path d={formaBarra(ancho, cx)} fill={paleta.brandStrong} />
            </Svg>
            <View
              pointerEvents="none"
              style={[estilos.burbuja, { backgroundColor: paleta.brandStrong, transform: [{ translateX: cx - BURBUJA / 2 }] }]}
            >
              {opcionesActivas?.tabBarIcon?.({ focused: true, color: paleta.onBrand, size: 22 })}
            </View>
            <Text
              pointerEvents="none"
              numberOfLines={1}
              style={[estilos.etiqueta, { color: paleta.onBrand, left: cx - 50 }]}
            >
              {opcionesActivas?.title}
            </Text>
          </>
        )}

        {ancho > 0 && state.routes.map((ruta, indice) => {
          const opciones = descriptors[ruta.key]?.options;
          const enfocada = state.index === indice;
          return (
            <Pressable
              key={ruta.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: enfocada }}
              accessibilityLabel={opciones?.title}
              onPress={() => {
                const evento = emitter.emit({ type: 'tabPress', target: ruta.key, canPreventDefault: true });
                if (!enfocada && !evento.defaultPrevented) navigateToTab(ruta.key);
              }}
              // El activo sube a cubrir la burbuja: tocarla funciona y su
              // icono no se dibuja dos veces.
              style={[
                estilos.boton,
                { left: centro(indice) - 26 },
                enfocada ? estilos.botonActivo : null,
              ]}
            >
              {!enfocada && opciones?.tabBarIcon?.({ focused: false, color: paleta.onBrand, size: 22 })}
            </Pressable>
          );
        })}
      </View>
      {/* El verde sigue bajo el indicador de inicio hasta el borde. */}
      <View style={{ height: Math.max(bottom, espaciado.s2), backgroundColor: paleta.brandStrong }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingTop: BURBUJA / 2 + 4 },
  barra: { height: ALTO, width: '100%' },
  burbuja: {
    position: 'absolute', top: -BURBUJA / 2, left: 0,
    width: BURBUJA, height: BURBUJA, borderRadius: BURBUJA / 2,
    alignItems: 'center', justifyContent: 'center',
  },
  etiqueta: { position: 'absolute', bottom: 7, width: 100, textAlign: 'center', fontSize: 11, fontWeight: '600' },
  boton: {
    position: 'absolute', top: 10, width: 52, height: 44,
    alignItems: 'center', justifyContent: 'center', opacity: 0.9,
  },
  botonActivo: { top: -BURBUJA / 2, height: BURBUJA, opacity: 1 },
});
