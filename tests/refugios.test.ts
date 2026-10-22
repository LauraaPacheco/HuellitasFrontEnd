import { describe, expect, it } from 'vitest';
import { crearApi, AlmacenMemoria, EstadoVerificacion, validarRefugio, normalizarRefugio, type SolicitudRefugioDto } from '../packages/shared/src';
const datos: SolicitudRefugioDto = { nombre: '  Refugio de prueba  ', nit: '900123400-1', direccion: 'Calle de prueba 123', telefono: '300 123-4567', correo: 'refugio@example.com', encargado: 'Persona de prueba', descripcion: 'Descripción para la prueba' };
const nueva = () => crearApi({ modoDemo: true, urlBase: '', almacen: new AlmacenMemoria() });
async function login(api: ReturnType<typeof nueva>, correo: string) {
  await api.autenticacion.login({ correo, contrasena: 'Demo1234' });
}
describe('HU-REF-01 y HU-REF-02', () => {
  it('valida contacto y normaliza sin cambiar datos de entrada', () => {
    expect(validarRefugio(datos)).toBeNull();
    expect(validarRefugio({ ...datos, nit: 'abc' })).toMatch(/NIT/);
    expect(validarRefugio({ ...datos, correo: 'abc' })).toMatch(/correo/);
    expect(validarRefugio({ ...datos, telefono: '123' })).toMatch(/10/);
    expect(normalizarRefugio(datos).nombre).toBe('Refugio de prueba');
    expect(normalizarRefugio(datos).telefono).toBe('3001234567');
    expect(datos.nombre).toBe('  Refugio de prueba  ');
  });
  it('solicitud pública queda pendiente y evita NIT duplicado', async () => {
    const api = nueva();
    const creado = await api.refugios.solicitarRegistro(datos);
    expect(creado.estadoVerificacion).toBe(EstadoVerificacion.Pendiente);
    expect(creado.fechaVerificacion).toBeNull();
    await expect(api.refugios.obtener(creado.id)).rejects.toMatchObject({ estadoHttp: 403 });
    await expect(api.refugios.solicitarRegistro(datos)).rejects.toMatchObject({ estadoHttp: 409 });
    await login(api, 'admin@huellitas.co');
    expect((await api.refugios.listar()).items.some(r => r.id === creado.id)).toBe(true);
  });
  it('administrador verifica una solicitud y aparece públicamente', async () => {
    const api = nueva(); await login(api, 'admin@huellitas.co');
    await api.refugios.verificar(2);
    const refugio = await api.refugios.obtener(2);
    expect(refugio.estadoVerificacion).toBe(EstadoVerificacion.Verificado);
    expect(refugio.fechaVerificacion).toBeTruthy();
    await expect(api.refugios.verificar(2)).rejects.toMatchObject({ estadoHttp: 409 });
    await api.autenticacion.logout('demo');
    expect((await api.refugios.obtener(2)).estadoVerificacion).toBe(EstadoVerificacion.Verificado);
  });
  it('rechazo exige motivo y conserva el estado hasta recibirlo', async () => {
    const api = nueva(); await login(api, 'admin@huellitas.co');
    await expect(api.refugios.rechazar(2, { motivo: ' ' })).rejects.toMatchObject({ estadoHttp: 400 });
    expect((await api.refugios.obtener(2)).estadoVerificacion).toBe(EstadoVerificacion.Pendiente);
    await api.refugios.rechazar(2, { motivo: '  Información por completar  ' });
    expect((await api.refugios.obtener(2)).motivoRechazo).toBe('Información por completar');
    expect((await api.refugios.obtener(2)).estadoVerificacion).toBe(EstadoVerificacion.Rechazado);
  });
  it('adoptantes y refugios no pueden verificar solicitudes', async () => {
    const api = nueva();
    await expect(api.refugios.verificar(2)).rejects.toMatchObject({ estadoHttp: 403 });
    await login(api, 'adoptante@huellitas.co');
    await expect(api.refugios.verificar(2)).rejects.toMatchObject({ estadoHttp: 403 });
    await login(api, 'refugio@huellitas.co');
    await expect(api.refugios.verificar(2)).rejects.toMatchObject({ estadoHttp: 403 });
  });
  it('edición del propio refugio preserva NIT y verificación', async () => {
    const api = nueva(); await login(api, 'refugio@huellitas.co');
    const antes = await api.refugios.obtener(1);
    const actualizado = await api.refugios.editar(1, { ...datos, nit: 'manipulado', estadoVerificacion: 0 } as typeof datos);
    expect(actualizado.nombre).toBe('Refugio de prueba');
    expect(actualizado.nit).toBe(antes.nit); expect(actualizado.estadoVerificacion).toBe(antes.estadoVerificacion);
    expect((await api.refugios.obtener(1)).nombre).toBe('Refugio de prueba');
    await expect(api.refugios.editar(3, datos)).rejects.toMatchObject({ estadoHttp: 403 });
  });
  it('permite crear, editar y eliminar un requisito del propio refugio', async () => {
    const api = nueva(); await login(api, 'refugio@huellitas.co');
    const requisito = await api.refugios.guardarRequisito(1, '  Conversación previa  ', false);
    expect(requisito.descripcion).toBe('Conversación previa'); expect(requisito.esObligatorio).toBe(false);
    await api.refugios.editarRequisito(1, requisito.id, { descripcion: 'Entrevista previa', esObligatorio: true });
    expect((await api.refugios.requisitos(1)).find(r => r.id === requisito.id)?.descripcion).toBe('Entrevista previa');
    await api.refugios.eliminarRequisito(1, requisito.id);
    expect((await api.refugios.requisitos(1)).some(r => r.id === requisito.id)).toBe(false);
    await expect(api.refugios.guardarRequisito(3, 'Ajeno', true)).rejects.toMatchObject({ estadoHttp: 403 });
  });
  it('suspensión exige motivo, solo la permite al administrador y oculta el perfil público', async () => {
    const api = nueva(); await login(api, 'refugio@huellitas.co');
    await expect(api.refugios.suspender(1, { motivo: 'Revisión' })).rejects.toMatchObject({ estadoHttp: 403 });
    await login(api, 'admin@huellitas.co');
    await expect(api.refugios.suspender(1, { motivo: ' ' })).rejects.toMatchObject({ estadoHttp: 400 });
    await api.refugios.suspender(1, { motivo: 'Reclamo por revisar' });
    const suspendido = await api.refugios.obtener(1);
    expect(suspendido.estadoVerificacion).toBe(EstadoVerificacion.Suspendido);
    expect(suspendido.motivoRechazo).toBe('Reclamo por revisar');
    await api.autenticacion.logout('demo');
    await expect(api.refugios.obtener(1)).rejects.toMatchObject({ estadoHttp: 403 });
    expect((await api.refugios.listar()).items.some(r => r.id === 1)).toBe(false);
  });
  it('el público solo recibe refugios verificados y rechaza identificadores inexistentes', async () => {
    const api = nueva();
    expect((await api.refugios.listar()).items.every(r => r.estadoVerificacion === EstadoVerificacion.Verificado)).toBe(true);
    await expect(api.refugios.obtener(9999)).rejects.toMatchObject({ estadoHttp: 404 });
  });
});
