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
import type { PaletaColores, Tema } from '@huellitas/shared/tokens';

export type { Tema } from '@huellitas/shared/tokens';

interface ValorTema {
  /** El tema que se está pintando ahora mismo. */
  readonly tema: Tema;
  readonly paleta: PaletaColores;
  readonly cambiarTema: (tema: Tema) => void;
  /** Pasa de claro a oscuro y al revés. */
  readonly alternarTema: () => void;
}

const ContextoTema = createContext<ValorTema | null>(null);

export function ProveedorTema({ children }: { children: ReactNode }) {
  // useColorScheme sigue el ajuste del telefono. Vale como punto de
  // partida: en cuanto el usuario toca el boton manda su eleccion, por eso
  // no hay un tercer estado "automatico" en la interfaz.
  const esquemaSistema = useColorScheme();
  const temaSistema: Tema = esquemaSistema === 'dark' ? 'oscuro' : 'claro';
  const [elegido, setElegido] = useState<Tema | null>(null);
  const tema = elegido ?? temaSistema;

  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const guardado = await AsyncStorage.getItem(tokens.CLAVE_TEMA);
        if (vigente && tokens.esTema(guardado)) setElegido(guardado);
      } catch {
        /* sin almacenamiento: manda el ajuste del telefono */
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const cambiarTema = useCallback((siguiente: Tema) => {
    // Se pinta ya y se guarda despues: el boton no debe esperar al disco.
    setElegido(siguiente);
    void AsyncStorage.setItem(tokens.CLAVE_TEMA, siguiente).catch(() => {
      /* el cambio vale mientras la app siga abierta */
    });
  }, []);

  const alternarTema = useCallback(() => {
    setElegido((actual) => {
      const siguiente = tokens.temaOpuesto(actual ?? temaSistema);
      void AsyncStorage.setItem(tokens.CLAVE_TEMA, siguiente).catch(() => {});
      return siguiente;
    });
  }, [temaSistema]);

  const valor = useMemo<ValorTema>(
    () => ({
      tema,
      paleta: tokens.colores[tema],
      cambiarTema,
      alternarTema,
    }),
    [tema, cambiarTema, alternarTema],
  );

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
