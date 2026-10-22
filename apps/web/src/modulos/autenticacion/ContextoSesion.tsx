import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  NivelRol,
  type LoginDto,
  type SesionGuardada,
  type Usuario,
} from '@huellitas/shared';
import { almacen, almacenSesion, api, MODO_DEMO } from '@/lib/api';

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

  /**
   * Al abrir la app recuperamos la sesion de lo que quedo guardado.
   *
   * Lo normal seria preguntarle al backend con GET /usuarios/yo, pero ese
   * endpoint todavia no existe. Mientras tanto confiamos en lo guardado:
   * si el token ya vencio, la primera llamada protegida respondera 401 y
   * la app volvera al login sola.
   */
  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const crudo = await almacenSesion.obtener();
        if (crudo && vigente) {
          const sesion = JSON.parse(crudo) as SesionGuardada;
          setUsuario(sesion.usuario);
        }
      } catch {
        await almacenSesion.limpiar();
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
    const respuesta = await api.autenticacion.login(datos);
    await almacen.guardar(respuesta.token);
    const sesion = MODO_DEMO ? { ...respuesta, usuario: await api.usuarios.yo() } : respuesta;
    await almacenSesion.guardar(JSON.stringify(sesion));
    setUsuario(sesion.usuario);
  }, []);

  const cerrarSesion = useCallback(async () => {
    try {
      // El backend revoca el refresh token, asi que hay que mandarselo.
      const crudo = await almacenSesion.obtener();
      const refresh = crudo ? (JSON.parse(crudo) as SesionGuardada).refreshToken : null;
      if (refresh) await api.autenticacion.logout(refresh);
    } catch {
      /* si falla, igual se cierra del lado del front */
    } finally {
      await almacen.limpiar();
      await almacenSesion.limpiar();
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
