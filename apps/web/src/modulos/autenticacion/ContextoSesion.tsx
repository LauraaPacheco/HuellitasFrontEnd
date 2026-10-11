import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { NivelRol, type LoginDto, type Usuario } from '@huellitas/shared';
import { almacen, api } from '@/lib/api';

interface ValorSesion {
  readonly usuario: Usuario | null;
  readonly cargando: boolean;
  readonly iniciarSesion: (datos: LoginDto) => Promise<void>;
  readonly cerrarSesion: () => Promise<void>;
  readonly tieneNivel: (...niveles: NivelRol[]) => boolean;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  // Al abrir la app, si hay token guardado recuperamos al usuario.
  useEffect(() => {
    let vigente = true;
    void (async () => {
      const token = await almacen.obtener();
      if (!token) {
        if (vigente) setCargando(false);
        return;
      }
      try {
        const actual = await api.usuarios.yo();
        if (vigente) setUsuario(actual);
      } catch {
        await almacen.limpiar();
      } finally {
        if (vigente) setCargando(false);
      }
    })();
    return () => {
      vigente = false;
    };
  }, []);

  const iniciarSesion = useCallback(async (datos: LoginDto) => {
    const sesion = await api.autenticacion.login(datos);
    await almacen.guardar(sesion.token);
    setUsuario(sesion.usuario);
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      await api.autenticacion.logout();
    } finally {
      await almacen.limpiar();
      setUsuario(null);
    }
  }, []);

  const tieneNivel = useCallback(
    (...niveles: NivelRol[]) =>
      usuario !== null && niveles.includes(usuario.rol.nivel),
    [usuario],
  );

  const valor = useMemo<ValorSesion>(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion, tieneNivel }),
    [usuario, cargando, iniciarSesion, cerrarSesion, tieneNivel],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) {
    throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  }
  return valor;
}
