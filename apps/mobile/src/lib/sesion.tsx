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
import { almacen, api, registrarExpiracionSesion } from './api';

interface ValorSesion {
  readonly usuario: Usuario | null;
  readonly cargando: boolean;
  readonly iniciarSesion: (datos: LoginDto) => Promise<void>;
  readonly cerrarSesion: () => Promise<void>;
  /** Un visitante puede ver el catálogo, pero no postularse ni reportar. */
  readonly puedeActuar: boolean;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    registrarExpiracionSesion(() => setUsuario(null));
  }, []);

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

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      cargando,
      iniciarSesion,
      cerrarSesion,
      puedeActuar: usuario?.rol.nivel === NivelRol.Adoptante,
    }),
    [usuario, cargando, iniciarSesion, cerrarSesion],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return valor;
}
