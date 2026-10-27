import { ErrorHttp, type ConfiguracionCliente, type ClienteApi }  from '../client';
import { claimsDelToken, sesionDesdeRespuesta } from '../sesion';
import { EstadoUsuario, NivelRol, TipoVivienda } from '../../types/enums';
import type { PerfilUsuarioApi, PerfilAdoptanteApi } from '../contratosBackend';
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
  constructor(private readonly api: ClienteApi, private readonly opciones?: Partial<ConfiguracionCliente> & { modoDemo?: boolean }) {}

  async yo(contexto?: Usuario): Promise<Usuario> {
    if (this.opciones?.modoDemo) return this.api.get<Usuario>(RUTAS.usuarios.yo);
    const token = await this.opciones?.almacen?.obtener() ?? '';
    const claims = claimsDelToken(token);
    const rol = contexto?.rol.nombre ?? String(claims['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ?? 'Visitante');
    const base = contexto ?? sesionDesdeRespuesta({ accessToken: token, refreshToken: '', expiraEnSegundos: 0, nombre: '', rol }).usuario;
    const datos = await this.api.get<PerfilUsuarioApi>(RUTAS.usuarios.yo);
    const perfil = base.rol.nivel === NivelRol.Adoptante ? await this.perfilAdoptante(datos.id) : null;
    return { ...base, id: datos.id, nombre: datos.nombre, correo: datos.correo, telefono: datos.telefono,
      fotoUrl: datos.fotoUrl, estado: datos.estado === 'Activo' ? EstadoUsuario.Activo : EstadoUsuario.PendienteVerificacion,
      activo: datos.estado === 'Activo', fechaRegistro: datos.fechaRegistro, fechaCreacion: datos.fechaRegistro,
      politicaAceptada: datos.politicaAceptada, fechaAceptacionPolitica: datos.fechaAceptacionPolitica, perfil };
  }

  async perfilAdoptante(usuarioId = 0): Promise<PerfilAdoptante> {
    const dto = await this.api.get<PerfilAdoptanteApi>(RUTAS.usuarios.perfilAdoptante);
    const vivienda = dto.tipoVivienda === null ? null : ({ Casa: TipoVivienda.Casa, Apartamento: TipoVivienda.Apartamento, Finca: TipoVivienda.Finca } as Record<string, TipoVivienda>)[dto.tipoVivienda] ?? null;
    return { ...dto, tipoVivienda: vivienda, id: 0, usuarioId, activo: true, fechaCreacion: '', fechaModificacion: null };
  }

  listar(filtro: FiltroUsuario = {}): Promise<Paginado<Usuario>> {
    return this.api.get<Paginado<Usuario>>(RUTAS.usuarios.base, { ...filtro });
  }

  obtener(id: number): Promise<Usuario> {
    return this.api.get<Usuario>(RUTAS.usuarios.porId(id));
  }

  async editarPerfil(datos: EditarPerfilDto): Promise<Usuario> {
    if (this.opciones?.modoDemo) return this.api.put<Usuario>(RUTAS.usuarios.yo, datos);
    const anterior = await this.yo();
    await this.api.put(RUTAS.usuarios.yo, { nombre: datos.nombre ?? anterior.nombre, telefono: datos.telefono ?? anterior.telefono,
      fotoUrl: datos.fotoUrl === undefined ? anterior.fotoUrl : datos.fotoUrl });
    return this.yo(anterior);
  }

  async guardarPerfilAdoptante(datos: PerfilAdoptanteDto): Promise<PerfilAdoptante> {
    if (this.opciones?.modoDemo) return this.api.put<PerfilAdoptante>(RUTAS.usuarios.perfilAdoptante, datos);
    await this.api.put(RUTAS.usuarios.perfilAdoptante, datos);
    return this.perfilAdoptante(Number(claimsDelToken(await this.opciones?.almacen?.obtener() ?? '').sub ?? 0));
  }

  misDatosPersonales(): Promise<Usuario> { return this.yo(); }

  async cambiarPassword(passwordActual: string, passwordNueva: string): Promise<void> {
    this.seguridadReal(); await this.api.put('/api/v1/Usuarios/cambiar-password', { passwordActual, passwordNueva });
  }
  async cambiarCorreo(nuevoCorreo: string, passwordActual: string): Promise<void> {
    this.seguridadReal(); await this.api.put('/api/v1/Usuarios/cambiar-correo', { nuevoCorreo, passwordActual });
  }
  async desactivarCuenta(passwordActual: string): Promise<void> {
    this.seguridadReal(); await this.api.patch('/api/v1/Usuarios/desactivar', { passwordActual });
  }
  private seguridadReal() { if (this.opciones?.modoDemo) throw new ErrorHttp({ titulo: 'Los cambios de seguridad requieren conexión al servidor.', estadoHttp: 501 }); }

  cambiarRol(id: number, datos: CambioRolDto): Promise<void> {
    return this.api.put<void>(RUTAS.usuarios.cambiarRol(id), datos);
  }

  desactivar(id: number, motivo: string): Promise<void> {
    return this.api.post<void>(RUTAS.usuarios.desactivar(id), { motivo });
  }
}
