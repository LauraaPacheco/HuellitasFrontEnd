import { afterEach, expect, it, vi } from 'vitest';
import { AlmacenMemoria, crearApi, sesionDesdeRespuesta } from '../packages/shared/src';

afterEach(() => vi.unstubAllGlobals());

it('recupera el refugio del perfil aunque la sesión inicial no contenga la asociación', async () => {
  const almacen = new AlmacenMemoria();
  await almacen.guardar('token-prueba');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    id: 1001, refugioId: 1, nombre: 'Encargado', correo: 'refugio@huellitas.test',
    telefono: null, fotoUrl: null, estado: 'Activo', fechaRegistro: '2026-11-12',
  })));
  const contexto = sesionDesdeRespuesta({ accessToken: '', refreshToken: '', expiraEnSegundos: 1, nombre: 'Encargado', rol: 'Refugio' }).usuario;
  expect(contexto.refugioId).toBeNull();
  const api = crearApi({ urlBase: 'http://api.test', almacen });
  expect((await api.usuarios.yo(contexto)).refugioId).toBe(1);
});

it('elimina una asociación anterior si el perfil vigente ya no tiene refugio', async () => {
  const almacen = new AlmacenMemoria();
  await almacen.guardar('token-prueba');
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    id: 1001, refugioId: null, nombre: 'Encargado', correo: 'refugio@huellitas.test',
    telefono: null, fotoUrl: null, estado: 'Activo', fechaRegistro: '2026-11-12',
  })));
  const contexto = sesionDesdeRespuesta({ accessToken: '', refreshToken: '', expiraEnSegundos: 1, nombre: 'Encargado', rol: 'Refugio' }).usuario;
  const api = crearApi({ urlBase: 'http://api.test', almacen });
  expect((await api.usuarios.yo({ ...contexto, refugioId: 5 })).refugioId).toBeNull();
});

it('conserva el ID del refugio en la ficha pública para poder navegar a su perfil', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
    id: 8, nombre: 'Luna', especie: 'Gato', raza: 'Criollo', sexo: 'Hembra',
    edadAproximada: 2, descripcion: null, esterilizada: true, estado: 'Disponible',
    refugio: 'Refugio de pruebas', refugioId: 1, refugioTelefono: null, fotos: [],
  })));
  const api = crearApi({ urlBase: 'http://api.test', almacen: new AlmacenMemoria() });
  expect((await api.mascotas.obtenerFicha(8)).refugioId).toBe(1);
});
