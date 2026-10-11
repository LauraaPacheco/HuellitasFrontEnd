/**
 * Tokens del design system de Huellitas.
 *
 * Son valores planos a proposito: la web los convierte en variables CSS
 * y la app movil los usa directo en los StyleSheet. Si cambia un color
 * aqui, cambia en las dos apps.
 */

export const colores = {
  claro: {
    surface100: '#ffffff',
    surface200: '#f3f7f5',
    surface300: '#e5eeeb',
    border: '#cbd9d5',
    ink: '#0b1413',
    inkMuted: '#4a5d5a',
    brandStrong: '#00694a',
    brand: '#00a676',
    brandTint: '#dcf6ec',
    onBrand: '#ffffff',
    accent: '#ff5a36',
    accentTint: '#ffe7e0',
    warn: '#b45309',
    danger: '#c62828',
    focus: '#00694a',
  },
  oscuro: {
    surface100: '#0e1414',
    surface200: '#172221',
    surface300: '#1f2e2c',
    border: '#2e403d',
    ink: '#f2f7f5',
    inkMuted: '#a9bab6',
    brandStrong: '#2ed9a5',
    brand: '#38e3ad',
    brandTint: '#0f2c24',
    onBrand: '#062018',
    accent: '#ff7a5c',
    accentTint: '#331611',
    warn: '#f5b056',
    danger: '#ff8a8a',
    focus: '#38e3ad',
  },
} as const;

export type Tema = keyof typeof colores;
export type TokenColor = keyof typeof colores.claro;
export type PaletaColores = (typeof colores)[Tema];

export const espaciado = {
  s1: 4,
  s2: 8,
  s3: 12,
  s4: 16,
  s5: 24,
  s6: 32,
  s7: 48,
} as const;

export const radios = {
  sm: 10,
  md: 16,
  lg: 24,
  pill: 999,
} as const;

export const fuentes = {
  display: 'SpaceGrotesk',
  cuerpo: 'Inter',
} as const;

/** Escala tipografica: tamano, interlineado y grosor. */
export const tipografia = {
  displayXl: { tamano: 44, interlineado: 46, grosor: '700', familia: 'display' },
  displayL: { tamano: 34, interlineado: 38, grosor: '700', familia: 'display' },
  heading: { tamano: 24, interlineado: 30, grosor: '700', familia: 'cuerpo' },
  title: { tamano: 19, interlineado: 26, grosor: '600', familia: 'cuerpo' },
  bodyLg: { tamano: 17, interlineado: 26, grosor: '400', familia: 'cuerpo' },
  body: { tamano: 15, interlineado: 23, grosor: '400', familia: 'cuerpo' },
  label: { tamano: 13, interlineado: 16, grosor: '600', familia: 'cuerpo' },
  caption: { tamano: 13, interlineado: 19, grosor: '400', familia: 'cuerpo' },
} as const;

export type EstiloTexto = keyof typeof tipografia;

/** Area tocable minima: 44x44, aunque el icono sea de 24. */
export const AREA_TOCABLE_MINIMA = 44;

/** Fondo y texto de cada tono de insignia de estado. */
export function colorInsignia(
  tono: 'neutro' | 'marca' | 'acento' | 'advertencia' | 'peligro',
  tema: Tema = 'claro',
): { fondo: string; texto: string } {
  const p = colores[tema];
  switch (tono) {
    case 'marca':
      return { fondo: p.brandTint, texto: p.ink };
    case 'acento':
      return { fondo: p.accentTint, texto: p.ink };
    case 'advertencia':
      return { fondo: p.surface300, texto: p.warn };
    case 'peligro':
      return { fondo: p.surface300, texto: p.danger };
    default:
      return { fondo: p.surface300, texto: p.ink };
  }
}

/* ------------------------------------------------------------------ *
 * Tema claro / oscuro
 *
 * Solo dos estados. La primera vez que se abre la app se toma el ajuste
 * del sistema; a partir de que el usuario toca el boton, manda su
 * eleccion y se guarda.
 * ------------------------------------------------------------------ */

/** Clave con la que las dos apps guardan el tema elegido. */
export const CLAVE_TEMA = 'huellitas.tema';

/** Valida lo que viene del almacenamiento, que puede traer cualquier cosa. */
export function esTema(valor: unknown): valor is Tema {
  return valor === 'claro' || valor === 'oscuro';
}

/** El otro tema: lo que se aplica al tocar el boton. */
export function temaOpuesto(tema: Tema): Tema {
  return tema === 'oscuro' ? 'claro' : 'oscuro';
}

/** Nombre del tema, para la etiqueta visible del boton. */
export function nombreTema(tema: Tema): string {
  return tema === 'oscuro' ? 'Oscuro' : 'Claro';
}

/**
 * Etiqueta accesible del boton. El design system pide que un control con
 * solo icono lleve texto accesible, y conviene que diga en que tema esta
 * y a cual pasa.
 */
export function etiquetaBotonTema(tema: Tema): string {
  return `Tema ${nombreTema(tema).toLowerCase()}. Cambiar a ${nombreTema(temaOpuesto(tema)).toLowerCase()}.`;
}
