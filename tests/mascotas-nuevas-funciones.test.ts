import { afterEach, expect, it, vi } from 'vitest';
import { crearApi, AlmacenMemoria, EstadoMascota, Sexo, TipoRegistroClinico } from '../packages/shared/src';

/** Contratos de HU-MAS-04, 06, 07 y 08 contra el backend real (d98646c). */
async function preparar(...respuestas: Response[]) {
  const fetch = vi.fn(); respuestas.forEach(r => fetch.mockResolvedValueOnce(r));
  vi.stubGlobal('fetch', fetch);
  const almacen = new AlmacenMemoria(); await almacen.guardar('token-prueba');
  return { api: crearApi({ urlBase: 'http://api.test', almacen }), fetch };
}
const resumen = { id: 3, nombre: 'Luna', especie: 'Perro', raza: null, sexo: 'Hembra', edadAproximada: 2, fotoPrincipal: null, estado: 'Disponible', fechaCreacion: '2026-11-01' };
const paginado = <T,>(items: T[]) => ({ items, pagina: 1, tamanoPagina: 50, totalRegistros: items.length, totalPaginas: 1 });
afterEach(() => vi.unstubAllGlobals());

it('favoritos: lista paginada y el ID de la mascota va en la URL, sin cuerpo', async () => {
  const { api, fetch } = await preparar(Response.json(paginado([resumen])), Response.json({ mensaje: 'ok' }), Response.json({ mensaje: 'ok' }));
  const lista = await api.mascotas.misFavoritos();
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Favoritos?pagina=1&tamano=50');
  expect(lista.items[0]).toMatchObject({ id: 3, sexo: Sexo.Hembra, estado: EstadoMascota.Disponible });
  await api.mascotas.marcarFavorito(3);
  expect(fetch.mock.calls[1][0]).toBe('http://api.test/api/v1/Favoritos/3');
  expect(fetch.mock.calls[1][1].method).toBe('POST');
  expect(fetch.mock.calls[1][1].body).toBeUndefined();
  await api.mascotas.quitarFavorito(3);
  expect(fetch.mock.calls[2][1].method).toBe('DELETE');
});

it('historial: traduce el tipo por nombre y envía la fecha como DateOnly', async () => {
  const { api, fetch } = await preparar(
    Response.json(paginado([{ registroClinicoId: 9, tipo: 'Desparasitacion', fecha: '2026-11-02', descripcion: ' Interna ', soporteVeterinario: null }])),
    Response.json({ mensaje: 'ok' }),
  );
  const historial = await api.mascotas.historialClinico(3, { tamanoPagina: 5 });
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Mascotas/3/historial?pagina=1&tamano=5');
  expect(historial.items[0]).toMatchObject({ id: 9, mascotaId: 3, tipo: TipoRegistroClinico.Desparasitacion, descripcion: 'Interna' });
  await api.mascotas.agregarRegistroClinico({ mascotaId: 3, tipo: TipoRegistroClinico.Vacuna, fecha: '2026-11-10T08:00:00', descripcion: ' Rabia ', soporteVeterinario: '' });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ tipo: 0, fecha: '2026-11-10', descripcion: 'Rabia', soporteVeterinario: null });
});

it('historial: no envía atenciones futuras ni sin descripción', async () => {
  const { api, fetch } = await preparar();
  await expect(api.mascotas.agregarRegistroClinico({ mascotaId: 3, tipo: TipoRegistroClinico.Vacuna, fecha: '2999-01-01', descripcion: 'x' })).rejects.toMatchObject({ estadoHttp: 400 });
  await expect(api.mascotas.agregarRegistroClinico({ mascotaId: 3, tipo: TipoRegistroClinico.Vacuna, fecha: '2026-01-01', descripcion: '  ' })).rejects.toMatchObject({ estadoHttp: 400 });
  expect(fetch).not.toHaveBeenCalled();
});

it('recomendaciones: conserva puntaje y factores sobre el resumen de siempre', async () => {
  const { api, fetch } = await preparar(Response.json([{ ...resumen, puntaje: 80, factores: ['Ideal para apartamento por su tamaño.'] }]));
  const [r] = await api.mascotas.recomendaciones();
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Mascotas/recomendaciones');
  expect(r).toMatchObject({ id: 3, puntajeCompatibilidad: 80, factores: ['Ideal para apartamento por su tamaño.'] });
});

it('demo: el adoptante marca, lista y quita favoritos; el refugio registra historial', async () => {
  const api = crearApi({ urlBase: '', almacen: new AlmacenMemoria(), modoDemo: true });
  await api.autenticacion.login({ correo: 'adoptante@huellitas.co', contrasena: 'Demo1234' });
  const antes = (await api.mascotas.misFavoritos()).items.map(m => m.id);
  await api.mascotas.marcarFavorito(1);
  expect((await api.mascotas.misFavoritos()).items.map(m => m.id)).toEqual([...new Set([...antes, 1])].sort((a, b) => a - b));
  await expect(api.mascotas.marcarFavorito(1)).rejects.toMatchObject({ estadoHttp: 409 });
  await api.mascotas.quitarFavorito(1);
  expect((await api.mascotas.recomendaciones()).length).toBeGreaterThan(0);
  expect((await api.mascotas.compartir(1)).urlFicha).toMatch(/\/mascotas\/1$/);

  await api.autenticacion.login({ correo: 'refugio@huellitas.co', contrasena: 'Demo1234' });
  await expect(api.mascotas.misFavoritos()).rejects.toMatchObject({ estadoHttp: 403 });
  const mia = (await api.mascotas.inventario()).items[0]!;
  const total = (await api.mascotas.historialClinico(mia.id)).total;
  await api.mascotas.agregarRegistroClinico({ mascotaId: mia.id, tipo: TipoRegistroClinico.Tratamiento, fecha: '2026-11-01', descripcion: 'Antibiótico' });
  const despues = await api.mascotas.historialClinico(mia.id);
  expect(despues.total).toBe(total + 1);
});
