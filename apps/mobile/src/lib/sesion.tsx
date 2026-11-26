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
  type PerfilAdoptanteDto,
  type SesionGuardada,
  type Usuario,
} from '@huellitas/shared';
import { almacen, almacenSesion, api, MODO_DEMO, registrarExpiracionSesion, registrarRenovacionSesion } from './api';

interface ValorSesion {
  readonly usuario: Usuario | null;
  readonly cargando: boolean;
  readonly iniciarSesion: (datos: LoginDto) => Promise<void>;
  readonly cerrarSesion: () => Promise<void>;
  /** Un visitante puede ver el catálogo, pero no postularse ni reportar. */
  readonly puedeActuar: boolean;
  readonly guardarDatosPersonales: (datos: EditarPerfilDto) => Promise<void>;
  readonly guardarPerfilAdoptante: (datos: PerfilAdoptanteDto) => Promise<void>;
  /** HU-ADM-03: acepta la política vigente que el login marcó como pendiente. */
  readonly aceptarPolitica: () => Promise<void>;
}

const ContextoSesion = createContext<ValorSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const cache = useQueryClient();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    registrarExpiracionSesion(() => setUsuario(null));
  }, []);

  useEffect(() => registrarRenovacionSesion(sesion => setUsuario(sesion.usuario)), []);

  /** Recupera la sesión y consulta el perfil vigente del servidor. */
  useEffect(() => {
    let vigente = true;
    void (async () => {
      try {
        const crudo = await almacenSesion.obtener();
        if (crudo && vigente) {
          const sesion = JSON.parse(crudo) as SesionGuardada;
          try {
            const actualizado = await api.cliente.actualizarUsuarioSesion(await api.usuarios.yo(sesion.usuario));
            if (vigente) { setUsuario(actualizado.usuario); }
          } catch (error) {
            if ((error instanceof ErrorHttp && error.estadoHttp === 401) || !await almacen.obtener()) throw error;
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
    await api.cliente.guardarSesion(respuesta);
    try {
      const sesion = await api.cliente.actualizarUsuarioSesion(await api.usuarios.yo(respuesta.usuario));
      cache.clear(); setUsuario(sesion.usuario);
    } catch (error) { await api.cliente.limpiarSesion(); throw error; }
  }, [cache]);

  const cerrarSesion = useCallback(async () => {
    api.cliente.invalidarRenovacion();
    try {
      // El backend revoca el refresh token, asi que hay que mandarselo.
      const crudo = await almacenSesion.obtener();
      const refresh = crudo ? (JSON.parse(crudo) as SesionGuardada).refreshToken : null;
      if (refresh) await api.autenticacion.logout(refresh);
    } catch {
      /* si falla, igual se cierra del lado del front */
    } finally {
      await api.cliente.limpiarSesion();
      await cache.cancelQueries(); cache.clear();
      setUsuario(null);
    }
  }, [cache]);

  const guardarDatosPersonales = useCallback(async (datos: EditarPerfilDto) => {
    const actualizado = await api.usuarios.editarPerfil(datos);
    const sesion = await api.cliente.actualizarUsuarioSesion(actualizado);
    setUsuario(sesion.usuario);
  }, []);

  const guardarPerfilAdoptante = useCallback(async (datos: PerfilAdoptanteDto) => {
    const crudo = await almacenSesion.obtener();
    if (!crudo) throw new Error('Inicia sesión para guardar tu perfil.');
    const anterior = JSON.parse(crudo) as SesionGuardada;
    const perfil = await api.usuarios.guardarPerfilAdoptante(datos);
    const sesion = await api.cliente.actualizarUsuarioSesion({ ...anterior.usuario, perfil });
    setUsuario(sesion.usuario);
  }, []);

  const aceptarPolitica = useCallback(async () => {
    if (!usuario?.politicaPendiente) return;
    await api.administracion.aceptarPolitica(usuario.politicaPendiente);
    const sesion = await api.cliente.actualizarUsuarioSesion({ ...usuario, politicaPendiente: null });
    setUsuario(sesion.usuario);
  }, [usuario]);

  const valor = useMemo<ValorSesion>(
    () => ({
      usuario,
      aceptarPolitica,
      cargando,
      iniciarSesion,
      cerrarSesion,
      guardarDatosPersonales,
      guardarPerfilAdoptante,
      puedeActuar: usuario?.rol.nivel === NivelRol.Adoptante,
    }),
    [usuario, cargando, iniciarSesion, cerrarSesion, guardarDatosPersonales, guardarPerfilAdoptante, aceptarPolitica],
  );

  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): ValorSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion debe usarse dentro de ProveedorSesion');
  return valor;
}
