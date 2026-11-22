import { Platform } from 'react-native';
import * as Location from 'expo-location';
import type { Coordenada } from '@/componentes/mapa/tipos';

/**
 * Convierte un punto del mapa en una dirección legible ("Calle 5 #38-25,
 * San Fernando"). En el celular la da el sistema operativo, gratis y sin
 * clave. En la web se usa Nominatim de OpenStreetMap, que pide como máximo
 * una consulta por segundo: quien llama debe esperar a que el mapa se
 * quede quieto antes de preguntar.
 */
export async function direccionDe({ latitud, longitud }: Coordenada): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitud}&lon=${longitud}&zoom=18&accept-language=es`;
      const respuesta = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!respuesta.ok) return null;
      const datos = (await respuesta.json()) as { address?: Record<string, string> };
      const a = datos.address ?? {};
      const calle = [a.road, a.house_number].filter(Boolean).join(' ');
      return [calle, a.neighbourhood ?? a.suburb, a.city ?? a.town].filter(Boolean).slice(0, 2).join(', ') || null;
    }
    const [lugar] = await Location.reverseGeocodeAsync({ latitude: latitud, longitude: longitud });
    if (!lugar) return null;
    const calle = [lugar.street, lugar.streetNumber].filter(Boolean).join(' ') || lugar.name;
    return [calle, lugar.district ?? lugar.subregion, lugar.city].filter(Boolean).slice(0, 2).join(', ') || null;
  } catch {
    return null;
  }
}

export interface ResultadoDireccion {
  /** Lo que se muestra en la lista: "Calle 5 38-20, San Fernando". */
  readonly etiqueta: string;
  readonly coordenada: Coordenada;
}

/** Cali y alrededores (Jamundí, Yumbo): fuera de esto no se reporta. */
const CAJA_CALI = { oeste: -76.62, este: -76.43, norte: 3.56, sur: 3.28 };
const enCali = ({ latitud, longitud }: Coordenada) =>
  latitud <= CAJA_CALI.norte && latitud >= CAJA_CALI.sur && longitud >= CAJA_CALI.oeste && longitud <= CAJA_CALI.este;

/**
 * Busca una dirección escrita ("Calle 5 # 38-20", "Parque del Perro") y
 * devuelve hasta 5 lugares dentro de Cali. Se llama al enviar la búsqueda,
 * no en cada tecla: Nominatim no permite autocompletar.
 * En el celular busca primero con el sistema operativo (entiende mejor las
 * direcciones con número) y, si no encuentra nada, con Nominatim.
 */
export async function buscarDirecciones(texto: string): Promise<readonly ResultadoDireccion[]> {
  // "#" y "No." confunden a los buscadores: "Calle 5 # 38-20" → "Calle 5 38-20".
  const limpio = texto.replace(/#|\bn[oº°]\.?(?=\s*\d)/gi, ' ').replace(/\s+/g, ' ').trim();
  if (limpio.length < 3) return [];
  if (Platform.OS !== 'web') {
    const delSistema = await buscarEnSistema(limpio);
    if (delSistema.length) return delSistema;
  }
  return buscarEnNominatim(limpio);
}

async function buscarEnSistema(texto: string): Promise<ResultadoDireccion[]> {
  try {
    const consulta = /\bcali\b/i.test(texto) ? texto : `${texto}, Cali, Valle del Cauca, Colombia`;
    const puntos = (await Location.geocodeAsync(consulta))
      .map((p) => ({ latitud: p.latitude, longitud: p.longitude }))
      .filter(enCali)
      .slice(0, 3);
    const resultados = await Promise.all(puntos.map(async (coordenada) => ({ coordenada, etiqueta: (await direccionDe(coordenada)) ?? texto })));
    // El sistema a veces repite el mismo lugar con coordenadas casi iguales.
    return resultados.filter((r, i) => resultados.findIndex((o) => o.etiqueta === r.etiqueta) === i);
  } catch {
    return [];
  }
}

async function buscarEnNominatim(texto: string): Promise<ResultadoDireccion[]> {
  try {
    const { oeste, norte, este, sur } = CAJA_CALI;
    const parametros = new URLSearchParams({
      q: texto, format: 'jsonv2', addressdetails: '1', limit: '5', countrycodes: 'co',
      viewbox: `${oeste},${norte},${este},${sur}`, bounded: '1', 'accept-language': 'es',
    });
    // Nominatim pide identificar la app; el navegador no deja cambiar el User-Agent y manda su Referer.
    const cabeceras: Record<string, string> = { Accept: 'application/json' };
    if (Platform.OS !== 'web') cabeceras['User-Agent'] = 'Huellitas/1.0 (app de reportes de animales)';
    const respuesta = await fetch(`https://nominatim.openstreetmap.org/search?${parametros}`, { headers: cabeceras });
    if (!respuesta.ok) return [];
    const lugares = (await respuesta.json()) as { lat: string; lon: string; name?: string; display_name: string; address?: Record<string, string> }[];
    return lugares.map((l) => {
      const a = l.address ?? {};
      const calle = [a.road, a.house_number].filter(Boolean).join(' ');
      const principal = l.name || calle || l.display_name.split(',')[0]!;
      const barrio = a.neighbourhood ?? a.suburb ?? a.city_district;
      return {
        etiqueta: [principal, barrio && barrio !== principal ? barrio : null].filter(Boolean).join(', '),
        coordenada: { latitud: Number(l.lat), longitud: Number(l.lon) },
      };
    });
  } catch {
    return [];
  }
}
