import { useQueryClient } from '@tanstack/react-query';
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
  ErrorHttp,
  type LoginDto,
  type EditarPerfilDto,
  type SesionGuardada,
  type Usuario,
} from '@huellitas/shared';
import { almacen, almacenSesion, api, MODO_DEMO } from '@/lib/api';

interface ValorSesion {
  readonly usuario: Usuario | null;
  readonly cargando: boolean;
  readonly iniciarSesion: (datos: LoginDto) => Promise<void>;
  readonly cerrarSesion: () => Promise<void>;
  readonly guardarDatosPersonales: (datos: EditarPerfilDto) => Promise<void>;
  readonly tieneNivel: (...niveles: NivelRol[]) => boolean;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  /** Recupera la sesión y consulta el perfil vigente del servidor. */
  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const crudo = await almacenSesion.obtener();
        if (crudo && vigente) {
          const sesion = JSON.parse(crudo) as SesionGuardada;
          try {
            const actualizado = { ...sesion, usuario: await api.usuarios.yo(sesion.usuario) };
            if (vigente) { setUsuario(actualizado.usuario); await almacenSesion.guardar(JSON.stringify(actualizado)); }
          } catch (error) {
            if (error instanceof ErrorHttp && error.estadoHttp === 401) throw error;
            // Un fallo temporal de red no elimina una sesión previamente guardada.
            if (vigente) setUsuario(sesion.usuario);
          }
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
    try {
      const sesion = { ...respuesta, usuario: await api.usuarios.yo(respuesta.usuario) };
      await almacenSesion.guardar(JSON.stringify(sesion)); cache.clear(); setUsuario(sesion.usuario);
    } catch (error) { await almacen.limpiar(); await almacenSesion.limpiar(); throw error; }
  }, [cache]);

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
      await cache.cancelQueries(); cache.clear();
      setUsuario(null);
    }
  }, [cache]);

  const guardarDatosPersonales = useCallback(async (datos: EditarPerfilDto) => {
    const token = await almacen.obtener();
    if (!token) throw new Error('La sesión terminó.');
    const actualizado = await api.usuarios.editarPerfil(datos);
    const crudo = await almacenSesion.obtener();
    if (!crudo || await almacen.obtener() !== token) throw new Error('La sesión cambió.');
    const sesion = JSON.parse(crudo) as SesionGuardada;
    if (sesion.token !== token) throw new Error('La sesión cambió.');
    await almacenSesion.guardar(JSON.stringify({ ...sesion, usuario: actualizado })); setUsuario(actualizado);
  }, []);

  const tieneNivel = useCallback(
    (...niveles: NivelRol[]) =>
      usuario !== null && niveles.includes(usuario.rol.nivel),
    [usuario],
  );

  const valor = useMemo<ValorSesion>(
    () => ({ usuario, cargando, iniciarSesion, cerrarSesion, guardarDatosPersonales, tieneNivel }),
    [usuario, cargando, iniciarSesion, cerrarSesion, guardarDatosPersonales, tieneNivel],
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
