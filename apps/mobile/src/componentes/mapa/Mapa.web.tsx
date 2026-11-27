import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { usarTema } from '@/temas';
import type { ControlMapa, PropsMapa } from './tipos';

/*
 * OpenStreetMap no tiene versión oscura: en modo oscuro se invierten los
 * colores de los tiles y se devuelve el tono con hue-rotate, para que el
 * agua siga siendo azul y los parques verdes. Solo a los tiles, no al pin.
 */
const ESTILO_OSCURO = `
.mapa-oscuro .leaflet-tile-pane { filter: invert(1) hue-rotate(180deg) brightness(0.92) contrast(0.88) saturate(0.7); }
.mapa-oscuro.leaflet-container { background: #141b1a; }
.mapa-oscuro .leaflet-control-attribution { background: rgba(20, 27, 26, 0.75); color: #a9bab6; }
.mapa-oscuro .leaflet-control-attribution a { color: #38e3ad; }
`;

/*
 * Tiles de OpenStreetMap. Su política permite desarrollo y poco tráfico,
 * no una app en producción: para publicar, cambiar esta URL por un
 * proveedor (OpenFreeMap, MapTiler o Stadia) y su atribución.
 */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const ZOOM = 16;

/**
 * Mapa para la versión web de la app: react-native-maps no funciona en el
 * navegador, así que aquí se usa Leaflet directamente, con la misma API
 * que Mapa.tsx.
 */
export const Mapa = forwardRef<ControlMapa, PropsMapa>(function Mapa({ inicial, alMover, alMantener, margenCreditos = 0, style }, ref) {
  // En la web, el ref de un View es el div del DOM.
  const contenedor = useRef<unknown>(null);
  const mapa = useRef<L.Map | null>(null);
  const oscuro = usarTema().tema === 'oscuro';
  const alMoverActual = useRef(alMover);
  alMoverActual.current = alMover;
  const alMantenerActual = useRef(alMantener);
  alMantenerActual.current = alMantener;

  useImperativeHandle(ref, () => ({
    centrarEn: (c) => mapa.current?.flyTo([c.latitud, c.longitud], ZOOM, { duration: 0.4 }),
  }));

  useEffect(() => {
    const nodo = contenedor.current as unknown as HTMLElement | null;
    if (!nodo || mapa.current) return;
    const m = L.map(nodo, { zoomControl: false, attributionControl: true }).setView([inicial.latitud, inicial.longitud], ZOOM);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATRIBUCION }).addTo(m);
    m.attributionControl.setPrefix(false);
    m.on('moveend', () => {
      const c = m.getCenter();
      alMoverActual.current({ latitud: c.lat, longitud: c.lng });
    });
    // En el navegador, mantener presionado (o clic derecho) dispara "contextmenu".
    m.on('contextmenu', (e: L.LeafletMouseEvent) => alMantenerActual.current?.({ latitud: e.latlng.lat, longitud: e.latlng.lng }));
    mapa.current = m;
    m.getContainer().classList.toggle('mapa-oscuro', oscuro);
    // Leaflet no se entera si el contenedor cambia de tamaño (al montar mide
    // 0, o la pantalla le deja menos alto): se le avisa y conserva el centro.
    const observador = new ResizeObserver(() => m.invalidateSize());
    observador.observe(nodo);
    return () => { observador.disconnect(); m.remove(); mapa.current = null; };
    // Solo al montar: después el centro se cambia con centrarEn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!document.getElementById('mapa-estilo-oscuro')) {
      const estilo = document.createElement('style');
      estilo.id = 'mapa-estilo-oscuro';
      estilo.textContent = ESTILO_OSCURO;
      document.head.appendChild(estilo);
    }
  }, []);

  useEffect(() => {
    mapa.current?.getContainer().classList.toggle('mapa-oscuro', oscuro);
  }, [oscuro]);

  // Sube los créditos de OpenStreetMap por encima de lo que los tape.
  useEffect(() => {
    const creditos = mapa.current?.attributionControl.getContainer();
    if (creditos) creditos.style.marginBottom = `${margenCreditos}px`;
  }, [margenCreditos]);

  return <View ref={contenedor as never} style={[StyleSheet.absoluteFill, style]} />;
});
