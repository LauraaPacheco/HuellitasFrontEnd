import { expect, it } from 'vitest';
import { crearApi } from '../packages/shared/src/api';
import { AlmacenMemoria } from '../packages/shared/src/api/client';
import { NivelRol } from '../packages/shared/src/types/enums';
it.each([
  ['admin@huellitas.co', NivelRol.Administrador],
  ['refugio@huellitas.co', NivelRol.Refugio],
  ['adoptante@huellitas.co', NivelRol.Adoptante],
])('login demo devuelve el rol correcto para %s', async (correo, nivel) => {
  const api = crearApi({ urlBase: '', almacen: new AlmacenMemoria(), modoDemo: true });
  const sesion = await api.autenticacion.login({ correo, contrasena: 'Demo1234' });
  expect(sesion.usuario.rol.nivel).toBe(nivel);
  expect(sesion.usuario.correo).toBe(correo);
  const renovada = await api.autenticacion.renovar(sesion.refreshToken);
  expect(renovada.usuario.rol.nivel).toBe(nivel);
  await api.autenticacion.logout(renovada.refreshToken);
  await expect(api.autenticacion.renovar(renovada.refreshToken)).rejects.toMatchObject({ estadoHttp: 401 });
});
it('demo rechaza contraseñas incorrectas y enlaces vencidos', async () => {
  const api = crearApi({ urlBase: '', almacen: new AlmacenMemoria(), modoDemo: true });
  await expect(api.autenticacion.login({ correo: 'refugio@huellitas.co', contrasena: 'incorrecta' })).rejects.toMatchObject({ estadoHttp: 401 });
  await expect(api.autenticacion.confirmarCorreo('vencido')).rejects.toMatchObject({ estadoHttp: 400 });
  await expect(api.autenticacion.confirmarCorreo('vigente')).resolves.toBeUndefined();
});
