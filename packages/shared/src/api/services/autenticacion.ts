import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type {
  LoginDto,
  RecuperacionDto,
  RegistroDto,
  RestablecerDto,
  SesionDto,
  Usuario,
} from '../../types/usuarios';

export class ServicioAutenticacion {
  constructor(private readonly api: ClienteApi) {}

  registrar(datos: RegistroDto): Promise<Usuario> {
    return this.api.post<Usuario>(RUTAS.autenticacion.registrar, datos);
  }

  confirmarCorreo(token: string): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.confirmarCorreo, { token });
  }

  /** Vuelve a mandar el enlace de verificacion a un correo sin confirmar. */
  reenviarVerificacion(correo: string): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.reenviarVerificacion, { correo });
  }

  login(datos: LoginDto): Promise<SesionDto> {
    return this.api.post<SesionDto>(RUTAS.autenticacion.login, datos);
  }

  logout(): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.logout);
  }

  olvideContrasena(datos: RecuperacionDto): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.olvideContrasena, datos);
  }

  restablecer(datos: RestablecerDto): Promise<void> {
    return this.api.post<void>(RUTAS.autenticacion.restablecer, datos);
  }
}
