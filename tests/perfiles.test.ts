import { describe, expect, it } from 'vitest';
import { crearApi, AlmacenMemoria, ErrorHttp, TipoVivienda, validarDatosPersonales,
  validarPerfilAdoptante, prepararPerfilAdoptante, type PerfilAdoptanteFormulario } from '../packages/shared/src';

const completo: PerfilAdoptanteFormulario = {
  tipoVivienda: TipoVivienda.Casa, espacioDisponible: '  Patio cerrado  ',
  tiempoDisponible: '  3 horas diarias  ', presenciaDeNinos: false,
  otrasMascotas: false, experienciaPrevia: false,
};
describe('HU-USU-05 datos personales', () => {
  it('rechaza nombres vacíos y teléfonos incompletos', () => {
    expect(validarDatosPersonales({ nombre: '  ', telefono: '123' })).toEqual({ nombre: expect.any(String), telefono: expect.any(String) });
  });
  it('admite nombre con tildes y teléfono separado', () => {
    expect(validarDatosPersonales({ nombre: 'María José', telefono: '300 123-4567' })).toEqual({});
  });
});
describe('HU-USU-06 formulario de adoptante', () => {
  it('acepta vivienda con valor cero y todas las respuestas No', () => {
    expect(validarPerfilAdoptante(completo)).toEqual({});
    expect(prepararPerfilAdoptante(completo)).toEqual({ ...completo, espacioDisponible: 'Patio cerrado', tiempoDisponible: '3 horas diarias' });
  });
  it.each(['presenciaDeNinos', 'otrasMascotas', 'experienciaPrevia'] as const)('distingue sin responder de No en %s', campo => {
    expect(validarPerfilAdoptante({ ...completo, [campo]: null })[campo]).toBeTruthy();
    expect(validarPerfilAdoptante({ ...completo, [campo]: false })[campo]).toBeUndefined();
  });
  it('rechaza vivienda inexistente y textos vacíos', () => {
    const incompleto = { ...completo, tipoVivienda: 99 as TipoVivienda, espacioDisponible: ' ', tiempoDisponible: '' };
    expect(Object.keys(validarPerfilAdoptante(incompleto))).toEqual(['tipoVivienda', 'espacioDisponible', 'tiempoDisponible']);
    expect(() => prepararPerfilAdoptante(incompleto)).toThrow();
  });
});
async function iniciar(correo = 'adoptante@huellitas.co') {
  const almacen = new AlmacenMemoria();
  const api = crearApi({ modoDemo: true, urlBase: '', almacen });
  const sesion = await api.autenticacion.login({ correo, contrasena: 'Demo1234' });
  await almacen.guardar(sesion.token);
  return { api, almacen };
}
describe('Guardado y consulta de perfiles en demo', () => {
  it('datos personales se guardan, se consultan y no alteran correo ni rol', async () => {
    const { api } = await iniciar();
    const antes = await api.usuarios.yo();
    const guardado = await api.usuarios.editarPerfil({ nombre: '  Nuevo nombre  ', telefono: '311 123-4567' });
    expect(guardado.nombre).toBe('Nuevo nombre'); expect(guardado.telefono).toBe('3111234567');
    expect(guardado.correo).toBe(antes.correo); expect(guardado.rol).toEqual(antes.rol);
    expect(await api.usuarios.yo()).toEqual(guardado);
    expect(await api.usuarios.misDatosPersonales()).toEqual(guardado);
  });
  it('guarda respuestas No y conserva el perfil al editar datos personales', async () => {
    const { api } = await iniciar();
    const perfil = await api.usuarios.guardarPerfilAdoptante(prepararPerfilAdoptante(completo));
    expect(perfil.porcentajeCompletitud).toBe(100); expect(perfil.presenciaDeNinos).toBe(false);
    expect((await api.usuarios.yo()).perfil).toEqual(perfil);
    await api.usuarios.editarPerfil({ nombre: 'Nombre actualizado' });
    expect((await api.usuarios.yo()).perfil).toEqual(perfil);
  });
  it('no pierde la edición al cambiar de usuario en la misma demo', async () => {
    const { api } = await iniciar();
    await api.usuarios.editarPerfil({ nombre: 'Nombre propio' });
    await api.autenticacion.logout('demo');
    await api.autenticacion.login({ correo: 'refugio@huellitas.co', contrasena: 'Demo1234' });
    expect((await api.usuarios.yo()).nombre).not.toBe('Nombre propio');
    await api.autenticacion.login({ correo: 'adoptante@huellitas.co', contrasena: 'Demo1234' });
    expect((await api.usuarios.yo()).nombre).toBe('Nombre propio');
  });
  it('rechaza escritura de perfil de adoptante por refugios', async () => {
    const { api } = await iniciar('refugio@huellitas.co');
    await expect(api.usuarios.guardarPerfilAdoptante(prepararPerfilAdoptante(completo))).rejects.toMatchObject({ estadoHttp: 403 });
  });
  it('rechaza datos inválidos sin reemplazar los datos guardados', async () => {
    const { api } = await iniciar();
    await expect(api.usuarios.editarPerfil({ nombre: '' })).rejects.toMatchObject({ estadoHttp: 400 });
    expect((await api.usuarios.yo()).nombre).toBe('Mariana Ríos');
  });
  it('recupera el contexto demo desde el token almacenado al reabrir la app', async () => {
    const { almacen } = await iniciar();
    const apiNueva = crearApi({ modoDemo: true, urlBase: '', almacen });
    expect((await apiNueva.usuarios.yo()).correo).toBe('adoptante@huellitas.co');
  });
  it('exige sesión para consultar o modificar perfiles', async () => {
    const api = crearApi({ modoDemo: true, urlBase: '', almacen: new AlmacenMemoria() });
    await expect(api.usuarios.yo()).rejects.toBeInstanceOf(ErrorHttp);
    await expect(api.usuarios.editarPerfil({ nombre: 'Nombre' })).rejects.toMatchObject({ estadoHttp: 401 });
    await expect(api.usuarios.guardarPerfilAdoptante(prepararPerfilAdoptante(completo))).rejects.toMatchObject({ estadoHttp: 401 });
  });
});
