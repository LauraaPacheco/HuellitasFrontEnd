import { forwardRef, useImperativeHandle, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';
import MapView, { type MapStyleElement } from 'react-native-maps';
import { usarTema } from '@/temas';
import type { ControlMapa, PropsMapa } from './tipos';

const ACERCAMIENTO = { latitudeDelta: 0.006, longitudeDelta: 0.006 };

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
export const Mapa = forwardRef<ControlMapa, PropsMapa>(function Mapa({ inicial, alMover, alMantener, margenCreditos = 0, mostrarUsuario = true, style }, ref) {
  const mapa = useRef<MapView>(null);
  const oscuro = usarTema().tema === 'oscuro';
  useImperativeHandle(ref, () => ({
    centrarEn: (c) => mapa.current?.animateToRegion({ latitude: c.latitud, longitude: c.longitud, ...ACERCAMIENTO }, 400),
  }));
  return (
    <MapView
      ref={mapa}
      style={[StyleSheet.absoluteFill, style]}
      initialRegion={{ latitude: inicial.latitud, longitude: inicial.longitud, ...ACERCAMIENTO }}
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
    />
  );
});
