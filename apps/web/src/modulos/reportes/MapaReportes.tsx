import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { COLOR_TIPO_REPORTE, ESTADO_REPORTE, ETIQUETA_TIPO_REPORTE, EstadoReporte, esReportePrioritario, type PinReporte } from '@huellitas/shared';

/*
 * Tiles de OpenStreetMap: sirven para desarrollo y poco tráfico. Antes de
 * publicar hay que cambiarlos por un proveedor (OpenFreeMap, MapTiler o
 * Stadia) con su atribución. El modo oscuro está en reportes.css.
 */
const TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATRIBUCION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
/** Centro de Cali, por si todavía no hay reportes con ubicación. */
const CALI: L.LatLngTuple = [3.4516, -76.532];

/** Lo mínimo para dibujar un pin: lo que trae GET /mapa. */
export type ReporteUbicado = Pick<PinReporte, 'id' | 'numeroReporte' | 'tipo' | 'estado' | 'latitud' | 'longitud'>;

/**
 * HU-REP-04: el color dice el tipo (herido, maltrato, en calle, otro) y el
 * centro del pin el estado: lleno si nadie lo ha tomado, hueco si está en
 * atención y el pin atenuado si ya fue rescatado.
 */
export function claseEstadoPin(estado: EstadoReporte): string {
  if (estado === EstadoReporte.Recibido) return 'pin--libre';
  if (estado === EstadoReporte.EnAtencion) return 'pin--atencion';
  return 'pin--cerrado';
}

function icono(r: ReporteUbicado, seleccionado: boolean) {
  return L.divIcon({
    className: '',
    html: `<span class="pin ${claseEstadoPin(r.estado)}${seleccionado ? ' pin--activo' : ''}" style="--pin:${COLOR_TIPO_REPORTE[r.tipo]}"><span></span></span>`,
    iconSize: [30, 38],
    iconAnchor: [15, 36],
  });
}

interface Props {
  readonly reportes: readonly ReporteUbicado[];
  readonly seleccionado: number | null;
  readonly alSeleccionar: (id: number) => void;
}

/** Mapa de Cali con un pin por reporte. Al tocar un pin se selecciona en la lista. */
export function MapaReportes({ reportes, seleccionado, alSeleccionar }: Props) {
  const contenedor = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const capa = useRef<L.LayerGroup | null>(null);
  const marcadores = useRef(new Map<number, L.Marker>());
  const encuadrado = useRef(false);
  const alSeleccionarActual = useRef(alSeleccionar);
  alSeleccionarActual.current = alSeleccionar;

  useEffect(() => {
    if (!contenedor.current || mapa.current) return;
    const m = L.map(contenedor.current, { scrollWheelZoom: true }).setView(CALI, 12);
    L.tileLayer(TILES, { maxZoom: 19, attribution: ATRIBUCION }).addTo(m);
    m.attributionControl.setPrefix(false);
    capa.current = L.layerGroup().addTo(m);
    mapa.current = m;
    // Leaflet no se entera si el contenedor cambia de tamaño (layout responsivo).
    const observador = new ResizeObserver(() => m.invalidateSize());
    observador.observe(contenedor.current);
    return () => { observador.disconnect(); m.remove(); mapa.current = null; capa.current = null; encuadrado.current = false; };
  }, []);

  // Pinta los pines cada vez que cambia la lista (filtros, reporte tomado).
  useEffect(() => {
    const m = mapa.current;
    const grupo = capa.current;
    if (!m || !grupo) return;
    grupo.clearLayers();
    marcadores.current.clear();
    for (const r of reportes) {
      const marcador = L.marker([r.latitud, r.longitud], {
        icon: icono(r, r.id === seleccionado),
        title: `${r.numeroReporte} · ${ETIQUETA_TIPO_REPORTE[r.tipo]} · ${ESTADO_REPORTE[r.estado].etiqueta}`,
        alt: `${r.numeroReporte}, ${ETIQUETA_TIPO_REPORTE[r.tipo]}, ${ESTADO_REPORTE[r.estado].etiqueta}`,
        keyboard: true,
        zIndexOffset: r.id === seleccionado ? 1000 : esReportePrioritario(r.tipo) ? 500 : 0,
      });
      marcador.on('click', () => alSeleccionarActual.current(r.id));
      marcador.addTo(grupo);
      marcadores.current.set(r.id, marcador);
    }
    // Solo se encuadra la primera vez, para no mover el mapa al filtrar.
    if (!encuadrado.current && reportes.length) {
      m.fitBounds(L.latLngBounds(reportes.map((r) => [r.latitud, r.longitud])), { padding: [40, 40], maxZoom: 15 });
      encuadrado.current = true;
    }
  }, [reportes, seleccionado]);

  // Al elegir un reporte en la lista, el mapa va hasta él.
  useEffect(() => {
    const m = mapa.current;
    const r = reportes.find((x) => x.id === seleccionado);
    if (!m || !r) return;
    if (!m.getBounds().pad(-0.15).contains([r.latitud, r.longitud])) {
      m.flyTo([r.latitud, r.longitud], Math.max(m.getZoom(), 14), { duration: 0.5 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seleccionado]);

  return <div ref={contenedor} className="reportes-mapa" role="region" aria-label="Mapa de reportes en Cali" />;
}
