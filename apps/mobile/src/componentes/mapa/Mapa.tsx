import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker, type MapStyleElement } from 'react-native-maps';
import { usarTema } from '@/temas';
import type { ControlMapa, PropsMapa } from './tipos';

const ACERCAMIENTO = { latitudeDelta: 0.006, longitudeDelta: 0.006 };
const CIUDAD = { latitudeDelta: 0.16, longitudeDelta: 0.16 };

/** Estilo nocturno de Google Maps (Android). En iPhone Apple Maps ya trae su modo oscuro. */
const NOCHE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2523' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#9fb0ac' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#141b1a' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#22302d' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#1f3a30' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#2e3d3a' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1a2321' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#3d504c' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#25302e' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#14272b' }] },
];

/**
 * Mapa en el celular con react-native-maps: Apple Maps en iPhone (sin
 * clave) y Google Maps en Android (en Expo Go funciona solo; un build
 * propio necesita la API key de Google en app.json).
 * La web usa Mapa.web.tsx (Leaflet con OpenStreetMap).
 */
export const Mapa = forwardRef<ControlMapa, PropsMapa>(function Mapa({ inicial, alMover, alMantener, margenCreditos = 0, mostrarUsuario = true, acercamiento = 'calle', marcadores, seleccionado, alTocarMarcador, style }, ref) {
  const mapa = useRef<MapView>(null);
  const oscuro = usarTema().tema === 'oscuro';
  useImperativeHandle(ref, () => ({
    centrarEn: (c) => mapa.current?.animateToRegion({ latitude: c.latitud, longitude: c.longitud, ...ACERCAMIENTO }, 400),
  }));
  return (
    <MapView
      ref={mapa}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={{ latitude: inicial.latitud, longitude: inicial.longitud, ...(acercamiento === 'ciudad' ? CIUDAD : ACERCAMIENTO) }}
      showsUserLocation={mostrarUsuario}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      // El mapa sigue el tema de la app, no solo el del sistema.
      userInterfaceStyle={oscuro ? 'dark' : 'light'}
      customMapStyle={Platform.OS === 'android' && oscuro ? NOCHE : []}
      // Solo mueve el "Legal" de Apple Maps; no cambia el centro del mapa.
      legalLabelInsets={{ top: 0, left: 8, right: 0, bottom: margenCreditos }}
      onLongPress={(e) => alMantener?.({ latitud: e.nativeEvent.coordinate.latitude, longitud: e.nativeEvent.coordinate.longitude })}
      onRegionChangeComplete={(r) => alMover({ latitud: r.latitude, longitud: r.longitude })}
    >
      {marcadores?.map((m) => {
        const activo = m.id === seleccionado;
        return (
          // La clave cambia al seleccionar para que se redibuje (tracksViewChanges apagado).
          // Sin title: el detalle sale en la tarjeta de la pantalla, no en una burbuja.
          <Marker key={`${m.id}-${activo}`} coordinate={{ latitude: m.latitud, longitude: m.longitud }}
            anchor={{ x: 0.5, y: 1 }} zIndex={activo ? 10 : 1} tracksViewChanges={false}
            onPress={() => alTocarMarcador?.(m.id)}>
            <Pin color={m.color} estado={m.estado} activo={activo} />
          </Marker>
        );
      })}
    </MapView>
  );
});

/** Gota de color con el centro según el estado; igual a la del panel web. */
function Pin({ color, estado, activo }: { color: string; estado: 'libre' | 'atencion' | 'cerrado'; activo: boolean }) {
  const tamano = activo ? 34 : 26;
  return (
    <View style={{ opacity: estado === 'cerrado' ? 0.55 : 1, padding: 2 }}>
      <View style={[estilosPin.gota, { width: tamano, height: tamano, borderRadius: tamano / 2, backgroundColor: color }]}>
        <View style={estado === 'atencion'
          ? { width: tamano * 0.42, height: tamano * 0.42, borderRadius: tamano, borderWidth: 2.5, borderColor: '#fff' }
          : { width: tamano * 0.4, height: tamano * 0.4, borderRadius: tamano, backgroundColor: '#fff' }} />
      </View>
    </View>
  );
}

const estilosPin = StyleSheet.create({
  gota: { borderBottomLeftRadius: 0, transform: [{ rotate: '-45deg' }], borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, elevation: 4 },
});
