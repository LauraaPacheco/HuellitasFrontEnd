import { afterEach, expect, it, vi } from 'vitest';
import { crearApi, AlmacenMemoria, ClienteApi, ServicioAutenticacion, ServicioCatalogos, validarRestablecimiento } from '../packages/shared/src';
afterEach(() => vi.unstubAllGlobals());
it('valida código, longitud y confirmación de la nueva contraseña', () => {
  expect(validarRestablecimiento('', 'Demo1234', 'Demo1234')).toMatch(/código/);
  expect(validarRestablecimiento('token', 'corta', 'corta')).toMatch(/8 y 100/);
  expect(validarRestablecimiento('token', 'x'.repeat(101), 'x'.repeat(101))).toMatch(/8 y 100/);
  expect(validarRestablecimiento('token', 'Demo1234', 'Otra1234')).toMatch(/coinciden/);
  expect(validarRestablecimiento('token', 'x'.repeat(8), 'x'.repeat(8))).toBeNull();
  expect(validarRestablecimiento('token', 'x'.repeat(100), 'x'.repeat(100))).toBeNull();
});
it('usa las rutas y cuerpos del controlador Usuarios real', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json({ mensaje: 'ok' })));
  vi.stubGlobal('fetch', fetch);
  const auth = new ServicioAutenticacion(new ClienteApi({ urlBase: 'https://api.example', almacen: new AlmacenMemoria() }));
  await auth.olvideContrasena({ correo: 'persona@example.com' });
  expect(fetch.mock.calls[0][0]).toBe('https://api.example/api/v1/Usuarios/recuperar');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ correo: 'persona@example.com' });
  await auth.restablecer({ token: 'token', nuevaContrasena: 'Demo1234' });
  expect(fetch.mock.calls[1][0]).toBe('https://api.example/api/v1/Usuarios/restablecer');
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ token: 'token', nuevaContrasena: 'Demo1234' });
});
it('los cinco catálogos usan el controlador versionado y razas filtra por especie', async () => {
  const fetch = vi.fn().mockImplementation(() => Promise.resolve(Response.json([]))); vi.stubGlobal('fetch', fetch);
  const catalogos = new ServicioCatalogos(new ClienteApi({ urlBase: 'https://api.example', almacen: new AlmacenMemoria() }));
  await catalogos.especies(); await catalogos.razas(2); await catalogos.tamanos(); await catalogos.colores(); await catalogos.temperamentos();
  expect(fetch.mock.calls.map(c => c[0])).toEqual(['especies', 'razas?especieId=2', 'tamanos', 'colores', 'temperamentos'].map(r => `https://api.example/api/v1/Catalogos/${r}`));
});
it('demo admite recuperar, rechaza código incorrecto y evita reutilizarlo', async () => {
  const api = crearApi({ modoDemo: true, urlBase: '', almacen: new AlmacenMemoria() });
  await api.autenticacion.olvideContrasena({ correo: 'adoptante@huellitas.co' });
  await expect(api.autenticacion.restablecer({ token: 'vencido', nuevaContrasena: 'Demo1234' })).rejects.toMatchObject({ estadoHttp: 400 });
  await expect(api.autenticacion.restablecer({ token: 'demo-recuperacion', nuevaContrasena: 'corta' })).rejects.toMatchObject({ estadoHttp: 400 });
  await expect(api.autenticacion.restablecer({ token: 'demo-recuperacion', nuevaContrasena: 'Nueva1234' })).resolves.toBeUndefined();
  await expect(api.autenticacion.restablecer({ token: 'demo-recuperacion', nuevaContrasena: 'Nueva1234' })).rejects.toMatchObject({ estadoHttp: 400 });
});
