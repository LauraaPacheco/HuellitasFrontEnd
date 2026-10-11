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
 * Preferencia de tema
 *
 * El tema tiene tres estados, no dos: ademas de claro y oscuro, el
 * usuario puede dejar que manden los ajustes del telefono o del
 * navegador. Es el valor inicial, y conviene poder volver a el.
 * ------------------------------------------------------------------ */

/** Lo que el usuario elige. 'sistema' delega en el sistema operativo. */
export type PreferenciaTema = 'sistema' | Tema;

/** Clave con la que las dos apps guardan la preferencia. */
export const CLAVE_TEMA = 'huellitas.tema';

/** Orden del ciclo del boton: sistema, claro, oscuro, y vuelve. */
export const CICLO_TEMA: readonly PreferenciaTema[] = ['sistema', 'claro', 'oscuro'];

/** Valida lo que viene del almacenamiento, que puede traer cualquier cosa. */
export function esPreferenciaTema(valor: unknown): valor is PreferenciaTema {
  return typeof valor === 'string' && (CICLO_TEMA as readonly string[]).includes(valor);
}

/** Resuelve la preferencia contra lo que reporta el sistema. */
export function resolverTema(
  preferencia: PreferenciaTema,
  temaDelSistema: Tema,
): Tema {
  return preferencia === 'sistema' ? temaDelSistema : preferencia;
}

/** Siguiente paso del ciclo. */
export function siguientePreferenciaTema(actual: PreferenciaTema): PreferenciaTema {
  const posicion = CICLO_TEMA.indexOf(actual);
  return CICLO_TEMA[(posicion + 1) % CICLO_TEMA.length] ?? 'sistema';
}

/** Nombre corto del estado, para la etiqueta visible del control. */
export function nombrePreferenciaTema(preferencia: PreferenciaTema): string {
  switch (preferencia) {
    case 'claro':
      return 'Claro';
    case 'oscuro':
      return 'Oscuro';
    default:
      return 'Automático';
  }
}

/**
 * Etiqueta accesible del boton. El design system pide que un control con
 * solo icono lleve texto accesible, y conviene que diga en que estado
 * esta y a cual pasa, porque el icono solo no distingue 'oscuro' de
 * 'automatico de noche'.
 */
export function etiquetaBotonTema(preferencia: PreferenciaTema): string {
  const siguiente = siguientePreferenciaTema(preferencia);
  return `Tema: ${nombrePreferenciaTema(preferencia).toLowerCase()}. Cambiar a ${nombrePreferenciaTema(siguiente).toLowerCase()}.`;
}
