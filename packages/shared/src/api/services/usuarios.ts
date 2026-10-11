import type { ClienteApi } from '../client';
import { RUTAS } from '../rutas';
import type { Paginado } from '../../types/comun';
import type { CambioRolDto, FiltroUsuario } from '../../types/administracion';
import type {
  EditarPerfilDto,
  PerfilAdoptante,
  PerfilAdoptanteDto,
  Usuario,
} from '../../types/usuarios';

export class ServicioUsuarios {
  constructor(private readonly api: ClienteApi) {}

  yo(): Promise<Usuario> {
    return this.api.get<Usuario>(RUTAS.usuarios.yo);
  }

  listar(filtro: FiltroUsuario = {}): Promise<Paginado<Usuario>> {
    return this.api.get<Paginado<Usuario>>(RUTAS.usuarios.base, { ...filtro });
  }

  obtener(id: number): Promise<Usuario> {
    return this.api.get<Usuario>(RUTAS.usuarios.porId(id));
  }

  editarPerfil(datos: EditarPerfilDto): Promise<Usuario> {
    return this.api.put<Usuario>(RUTAS.usuarios.yo, datos);
  }

  guardarPerfilAdoptante(datos: PerfilAdoptanteDto): Promise<PerfilAdoptante> {
    return this.api.put<PerfilAdoptante>(RUTAS.usuarios.perfilAdoptante, datos);
  }

  /** Derecho de acceso del titular (Ley 1581 de 2012). */
  misDatosPersonales(): Promise<Usuario> {
    return this.api.get<Usuario>(RUTAS.usuarios.misDatos);
  }

  cambiarRol(id: number, datos: CambioRolDto): Promise<void> {
    return this.api.put<void>(RUTAS.usuarios.cambiarRol(id), datos);
  }

  desactivar(id: number, motivo: string): Promise<void> {
    return this.api.post<void>(RUTAS.usuarios.desactivar(id), { motivo });
  }
}
