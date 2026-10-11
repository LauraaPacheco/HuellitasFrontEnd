import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { tokens } from '@huellitas/shared';
import type { PaletaColores, PreferenciaTema, Tema } from '@huellitas/shared/tokens';

export type { PreferenciaTema, Tema } from '@huellitas/shared/tokens';

interface ValorTema {
  /** Lo que el usuario eligió: 'sistema', 'claro' u 'oscuro'. */
  readonly preferencia: PreferenciaTema;
  /** El tema que se está pintando ahora mismo. */
  readonly tema: Tema;
  readonly paleta: PaletaColores;
  readonly cambiarTema: (preferencia: PreferenciaTema) => void;
  /** Avanza el ciclo sistema → claro → oscuro → sistema. */
  readonly alternarTema: () => void;
}

const ContextoTema = createContext<ValorTema | null>(null);

export function ProveedorTema({ children }: { children: ReactNode }) {
  // useColorScheme sigue en vivo el ajuste del teléfono, que es justo lo
  // que debe pasar mientras la preferencia sea 'sistema'.
  const esquemaSistema = useColorScheme();
  const temaSistema: Tema = esquemaSistema === 'dark' ? 'oscuro' : 'claro';
  const [preferencia, setPreferencia] = useState<PreferenciaTema>('sistema');

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const guardado = await AsyncStorage.getItem(tokens.CLAVE_TEMA);
        if (vigente && tokens.esPreferenciaTema(guardado)) setPreferencia(guardado);
      } catch {
        /* sin almacenamiento: manda el ajuste del telefono */
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const cambiarTema = useCallback((siguiente: PreferenciaTema) => {
    // Se pinta ya y se guarda despues: el boton no debe esperar al disco.
    setPreferencia(siguiente);
    void AsyncStorage.setItem(tokens.CLAVE_TEMA, siguiente).catch(() => {
      /* el cambio vale mientras la app siga abierta */
    });
  }, []);

  const alternarTema = useCallback(() => {
    setPreferencia((actual) => {
      const siguiente = tokens.siguientePreferenciaTema(actual);
      void AsyncStorage.setItem(tokens.CLAVE_TEMA, siguiente).catch(() => {});
      return siguiente;
    });
  }, []);

  const valor = useMemo<ValorTema>(() => {
    const tema = tokens.resolverTema(preferencia, temaSistema);
    return {
      preferencia,
      tema,
      paleta: tokens.colores[tema],
      cambiarTema,
      alternarTema,
    };
  }, [preferencia, temaSistema, cambiarTema, alternarTema]);

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

/**
 * Tema activo. Fuera del proveedor cae al ajuste del sistema en vez de
 * lanzar: asi un componente se puede renderizar aislado en una prueba.
 */
export function usarTema(): ValorTema {
  const valor = useContext(ContextoTema);
  const esquemaSistema = useColorScheme();
  if (valor) return valor;

  const tema: Tema = esquemaSistema === 'dark' ? 'oscuro' : 'claro';
  return {
    preferencia: 'sistema',
    tema,
    paleta: tokens.colores[tema],
    cambiarTema: () => {},
    alternarTema: () => {},
  };
}

/** Paleta activa. Es el atajo que usan casi todas las pantallas. */
export function usarPaleta(): PaletaColores {
  return usarTema().paleta;
}

export const espaciado = tokens.espaciado;
export const radios = tokens.radios;
export const tipografia = tokens.tipografia;
export const AREA_TOCABLE_MINIMA = tokens.AREA_TOCABLE_MINIMA;
export const colorInsignia = tokens.colorInsignia;
