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
import type { PreferenciaTema, Tema } from '@huellitas/shared/tokens';

const CONSULTA_OSCURO = '(prefers-color-scheme: dark)';

interface ValorTema {
  /** Lo que el usuario eligió: 'sistema', 'claro' u 'oscuro'. */
  readonly preferencia: PreferenciaTema;
  /** El tema que se está pintando ahora mismo. */
  readonly tema: Tema;
  readonly cambiarTema: (preferencia: PreferenciaTema) => void;
  /** Avanza el ciclo sistema → claro → oscuro → sistema. */
  readonly alternarTema: () => void;
}

const ContextoTema = createContext<ValorTema | null>(null);

/** Lo que el navegador tiene configurado, sin tocar la preferencia. */
function temaDelSistema(): Tema {
  if (typeof window === 'undefined' || !window.matchMedia) return 'claro';
  return window.matchMedia(CONSULTA_OSCURO).matches ? 'oscuro' : 'claro';
}

function preferenciaGuardada(): PreferenciaTema {
  try {
    const valor = window.localStorage.getItem(tokens.CLAVE_TEMA);
    return tokens.esPreferenciaTema(valor) ? valor : 'sistema';
  } catch {
    // Modo privado o cookies bloqueadas: el tema dura lo que dure la pestana.
    return 'sistema';
  }
}

export function ProveedorTema({ children }: { children: ReactNode }) {
  const [preferencia, setPreferencia] = useState<PreferenciaTema>(preferenciaGuardada);
  const [sistema, setSistema] = useState<Tema>(temaDelSistema);

  // Con la preferencia en 'sistema', hay que seguir al navegador en vivo:
  // el usuario puede cambiar el ajuste del sistema con la pestana abierta.
  useEffect(() => {
    if (!window.matchMedia) return;
    const consulta = window.matchMedia(CONSULTA_OSCURO);
    const alCambiar = (evento: MediaQueryListEvent) => {
      setSistema(evento.matches ? 'oscuro' : 'claro');
    };
    consulta.addEventListener('change', alCambiar);
    return () => consulta.removeEventListener('change', alCambiar);
  }, []);

  const tema = tokens.resolverTema(preferencia, sistema);

  // tokens.css define el tema oscuro en dos sitios: dentro de una media
  // query para :root:not([data-tema='claro']), y en :root[data-tema='oscuro'].
  // Por eso con 'sistema' hay que QUITAR el atributo, no escribir el tema
  // resuelto: si lo escribieramos, dejaria de seguir al navegador.
  useEffect(() => {
    const raiz = document.documentElement;
    if (preferencia === 'sistema') raiz.removeAttribute('data-tema');
    else raiz.dataset.tema = preferencia;

    // Pinta de su color la barra del navegador en movil y los controles
    // nativos (scrollbars, campos de fecha), que no leen las variables.
    raiz.style.colorScheme = tema === 'oscuro' ? 'dark' : 'light';
  }, [preferencia, tema]);

  const cambiarTema = useCallback((siguiente: PreferenciaTema) => {
    setPreferencia(siguiente);
    try {
      window.localStorage.setItem(tokens.CLAVE_TEMA, siguiente);
    } catch {
      /* sin almacenamiento: el cambio vale solo para esta pestana */
    }
  }, []);

  const alternarTema = useCallback(() => {
    setPreferencia((actual) => {
      const siguiente = tokens.siguientePreferenciaTema(actual);
      try {
        window.localStorage.setItem(tokens.CLAVE_TEMA, siguiente);
      } catch {
        /* sin almacenamiento */
      }
      return siguiente;
    });
  }, []);

  const valor = useMemo<ValorTema>(
    () => ({ preferencia, tema, cambiarTema, alternarTema }),
    [preferencia, tema, cambiarTema, alternarTema],
  );

  return <ContextoTema.Provider value={valor}>{children}</ContextoTema.Provider>;
}

export function useTema(): ValorTema {
  const valor = useContext(ContextoTema);
  if (!valor) throw new Error('useTema debe usarse dentro de ProveedorTema');
  return valor;
}
