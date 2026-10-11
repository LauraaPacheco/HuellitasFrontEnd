import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { tokens } from '@huellitas/shared';
import type { Tema } from '@huellitas/shared/tokens';

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

interface ValorTema {
  /** El tema que se está pintando ahora mismo. */
  readonly tema: Tema;
  readonly cambiarTema: (tema: Tema) => void;
  /** Pasa de claro a oscuro y al revés. */
  readonly alternarTema: () => void;
}

const ContextoTema = createContext<ValorTema | null>(null);

/** Lo que el navegador tiene configurado. */
function temaDelSistema(): Tema {
  if (typeof window === 'undefined' || !window.matchMedia) return 'claro';
  return window.matchMedia(CONSULTA_OSCURO).matches ? 'oscuro' : 'claro';
}

function temaGuardado(): Tema | null {
  try {
    const valor = window.localStorage.getItem(tokens.CLAVE_TEMA);
    return tokens.esTema(valor) ? valor : null;
  } catch {
    // Modo privado o cookies bloqueadas: el tema dura lo que dure la pestana.
    return null;
  }
}

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [elegido, setElegido] = useState<Tema | null>(temaGuardado);
  const [sistema, setSistema] = useState<Tema>(temaDelSistema);
  const tema = elegido ?? sistema;

  // Mientras el usuario no haya elegido, la pagina sigue al navegador en
  // vivo. Desde que toca el boton, manda su eleccion y esto deja de
  // importar: por eso no hay un tercer estado "automatico" en la interfaz.
  useEffect(() => {
    if (!window.matchMedia) return;
    const consulta = window.matchMedia(CONSULTA_OSCURO);
    const alCambiar = (evento: MediaQueryListEvent) => {
      setSistema(evento.matches ? 'oscuro' : 'claro');
    };
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.dataset.tema = tema;
    // Pinta de su color los controles nativos (scrollbars, campos de
    // fecha), que no leen las variables CSS.
    raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  }, [tema]);

  const cambiarTema = useCallback((siguiente: Tema) => {
    setElegido(siguiente);
    try {
      window.localStorage.setItem(tokens.CLAVE_TEMA, siguiente);
    } catch {
      /* sin almacenamiento: el cambio vale solo para esta pestana */
    }
  }, []);

  const alternarTema = useCallback(() => {
    setElegido((actual) => {
      const siguiente = tokens.temaOpuesto(actual ?? temaDelSistema());
      try {
        window.localStorage.setItem(tokens.CLAVE_TEMA, siguiente);
      } catch {
        /* sin almacenamiento */
      }
      return siguiente;
    });
  }, []);

  const valor = useMemo<ValorTema>(
    () => ({ tema, cambiarTema, alternarTema }),
    [tema, cambiarTema, alternarTema],
  );

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema);
  if (!valor) throw new Error('useTema debe usarse dentro de ProveedorTema');
  return valor;
}
