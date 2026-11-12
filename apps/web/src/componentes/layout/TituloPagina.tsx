import { createContext, useContext, useEffect } from 'react';
import type { LucideIcon } from 'lucide-react';

/**
 * Canal para que el titulo de la pagina llegue a la barra superior movil.
 *
 * En celular la barra fija muestra el titulo junto a la hamburguesa, asi
 * que el Encabezado de cada pagina lo registra aqui. Fuera del Layout no
 * hay proveedor y registrar no hace nada.
 */
export const ContextoTituloPagina = createContext<((titulo: string | undefined) => void) | null>(null);

export function useRegistrarTitulo(titulo: string) {
  const registrar = useContext(ContextoTituloPagina);
  useEffect(() => {
    registrar?.(titulo);
    return () => registrar?.(undefined);
  }, [registrar, titulo]);
}

/** Seccion del menu en la que esta la pagina: su icono y su nombre. */
export interface SeccionActual {
  readonly ruta: string;
  readonly icono: LucideIcon;
  readonly etiqueta: string;
}

export const ContextoSeccion = createContext<SeccionActual | undefined>(undefined);

export function useSeccionActual() {
  return useContext(ContextoSeccion);
}
