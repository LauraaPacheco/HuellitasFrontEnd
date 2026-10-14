import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import {
  sesionDesdeRespuesta,
  type RespuestaRegistroApi,
  type RespuestaTokenApi,
  type SesionGuardada,
} from '../sesion';
import type {
  LoginDto,
  RecuperacionDto,
  RegistroDto,
  RestablecerDto,
} from '../../types/usuarios';

/**
 * Autenticacion contra el backend real.
 *
 * Las formas que el backend devuelve no son las que el front usa; la
 * traduccion esta en ../sesion.ts, no repartida por las pantallas.
 */
export class ServicioAutenticacion {
  constructor(private readonly api: ClienteApi) {}

  /** HU-USU-01. Devuelve el id creado; la cuenta nace sin confirmar. */
  registrar(datos: RegistroDto): Promise<RespuestaRegistroApi> {
    return this.api.post<RespuestaRegistroApi>(RUTAS.autenticacion.registrar, datos);
  }

  /**
   * El backend expone la confirmacion como GET con el token en la query,
   * porque es el enlace que se abre desde el correo.
   */
  confirmarCorreo(token: string): Promise<void> {
    return this.api.get<void>(RUTAS.autenticacion.confirmarCorreo, { token });
  }

  /** Vuelve a mandar el enlace de verificacion a un correo sin confirmar. */
  reenviarVerificacion(correo: string): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.reenviarVerificacion, { correo });
  }

  /** HU-USU-02. */
  async login(datos: LoginDto): Promise<SesionGuardada> {
    const respuesta = await this.api.post<RespuestaTokenApi>(
      RUTAS.autenticacion.login,
      datos,
    );
    return sesionDesdeRespuesta(respuesta, datos.correo);
  }

  /** Cambia un refresh token por un access token nuevo. */
  async renovar(refreshToken: string): Promise<SesionGuardada> {
    const respuesta = await this.api.post<RespuestaTokenApi>(
      RUTAS.autenticacion.refrescar,
      { refreshToken },
    );
    return sesionDesdeRespuesta(respuesta);
  }

  /** El backend revoca el refresh token, asi que hay que mandarselo. */
  logout(refreshToken: string): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.logout, { refreshToken });
  }

  /** Pendiente en el backend: hoy solo responde el modo demo. */
  olvideContrasena(datos: RecuperacionDto): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.olvideContrasena, datos);
  }

  /** Pendiente en el backend: hoy solo responde el modo demo. */
  restablecer(datos: RestablecerDto): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.restablecer, datos);
  }
}
