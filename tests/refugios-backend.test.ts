import { afterEach, expect, it, vi } from 'vitest';
import { crearApi, AlmacenMemoria, EstadoVerificacion, describirRedesSociales, leerRedesSociales, limpiarRedesSociales } from '../packages/shared/src';

const propio = { nombre: 'Refugio', descripcion: 'Descripción', direccion: 'Cali', telefono: '3001234567', redesSociales: { instagram: '@refugio' }, estadoVerificacion: 1, requisitos: [] };
// La ficha pública todavía devuelve la columna cruda: el JSON como texto.
const publico = { ...propio, redesSociales: '{"instagram":"@refugio"}', refugioId: 7, correo: 'refugio@test.co', verificado: true,
  requisitos: [{ requisitoId: 12, descripcion: 'Visita previa', esObligatorio: true, orden: 2 }], mascotasDisponibles: [] };
async function preparar(...respuestas: Response[]) {
  const fetch = vi.fn(); respuestas.forEach(r => fetch.mockResolvedValueOnce(r));
  vi.stubGlobal('fetch', fetch);
  const almacen = new AlmacenMemoria(); await almacen.guardar('token-prueba');
  return { api: crearApi({ urlBase: 'http://api.test', almacen }), fetch };
}
afterEach(() => vi.unstubAllGlobals());

it('consulta el perfil público y convierte IDs y requisitos sin inventar estadísticas', async () => {
  const { api, fetch } = await preparar(Response.json(publico));
  const r = await api.refugios.obtener(7);
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Refugios/7');
  expect(r).toMatchObject({ id: 7, correo: 'refugio@test.co', estadoVerificacion: EstadoVerificacion.Verificado, totalAdopciones: null, promedioCalificacion: null });
  expect(r.requisitos[0]).toMatchObject({ id: 12, refugioId: 7, orden: 2, activo: true });
});

it('usa mi-perfil y recupera los requisitos que esa respuesta omite', async () => {
  const { api, fetch } = await preparar(Response.json(propio), Response.json(publico));
  const r = await api.refugios.miPerfil(7);
  expect(fetch.mock.calls.map(c => c[0])).toEqual(['http://api.test/api/v1/Refugios/mi-perfil', 'http://api.test/api/v1/Refugios/7']);
  expect(r.id).toBe(7); expect(r.requisitos).toHaveLength(1);
});

it('respeta el estado interno del perfil propio sobre el booleano del perfil público', async () => {
  const { api } = await preparar(Response.json({ ...propio, estadoVerificacion: 2 }), Response.json({ ...publico, verificado: false }));
  expect((await api.refugios.miPerfil(7)).estadoVerificacion).toBe(EstadoVerificacion.Rechazado);
});

it('adapta tamano y totalRegistros al paginado del frontend', async () => {
  const { api, fetch } = await preparar(Response.json({ items: [{ refugioId: 7, nombre: 'Refugio', direccion: 'Cali' }], pagina: 2, tamanoPagina: 5, totalRegistros: 12, totalPaginas: 3 }));
  const r = await api.refugios.listar({ pagina: 2, tamanoPagina: 5 });
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Refugios?pagina=2&tamano=5');
  expect(r.total).toBe(12); expect(r.totalPaginas).toBe(3); expect(r.items[0].id).toBe(7);
});

it('envía solo los cuatro campos editables y vuelve a consultar después del mensaje de éxito', async () => {
  const { api, fetch } = await preparar(Response.json({ mensaje: 'Guardado' }), Response.json(propio), Response.json(publico));
  const r = await api.refugios.editar(7, { nombre: 'No editable', encargado: 'No editable', correo: 'ignorado@test.co', descripcion: 'Descripción', direccion: 'Cali', telefono: '3001234567', redesSociales: { instagram: ' @refugio ', facebook: '  ' } });
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Refugios/mi-perfil');
  expect(fetch.mock.calls[0][1].method).toBe('PUT');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ descripcion: 'Descripción', direccion: 'Cali', telefono: '3001234567', redesSociales: { instagram: '@refugio' } });
  expect(r.id).toBe(7);
  expect(r.redesSociales).toEqual({ instagram: '@refugio' });
});

it('lee las redes como objeto, como JSON en texto o como texto suelto de antes', () => {
  expect(leerRedesSociales({ instagram: '@a', vacia: ' ' })).toEqual({ instagram: '@a' });
  expect(leerRedesSociales('{"facebook":"fb.com/a"}')).toEqual({ facebook: 'fb.com/a' });
  expect(leerRedesSociales('@antiguo')).toEqual({ otra: '@antiguo' });
  expect(leerRedesSociales('') ).toBeNull();
  expect(describirRedesSociales({ instagram: '@a', otra: 'x' })).toBe('Instagram: @a · Otra: x');
  expect(limpiarRedesSociales({ tiktok: '  ' })).toBeNull();
});

it('agrega un requisito con orden sin fabricar una entidad desde el mensaje de respuesta', async () => {
  const { api, fetch } = await preparar(Response.json({ mensaje: 'Agregado' }));
  expect(await api.refugios.guardarRequisito(7, 'Visita', true, 3)).toBeUndefined();
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Refugios/requisitos');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ descripcion: 'Visita', esObligatorio: true, orden: 3 });
});

it('aprueba y rechaza por PATCH al mismo endpoint con el motivo correcto', async () => {
  const { api, fetch } = await preparar(Response.json({ mensaje: 'Aprobado' }), Response.json({ mensaje: 'Rechazado' }));
  await api.refugios.verificar(7); await api.refugios.rechazar(7, { motivo: 'Datos incompletos' });
  for (const c of fetch.mock.calls) { expect(c[0]).toBe('http://api.test/api/v1/Refugios/7/verificar'); expect(c[1].method).toBe('PATCH'); }
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ aprobado: true });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ aprobado: false, motivoRechazo: 'Datos incompletos' });
});

it('no envía peticiones a funciones que el controlador no publica', async () => {
  const { api, fetch } = await preparar();
  expect(() => api.refugios.eliminarRequisito(7, 12)).toThrow();
  expect(() => api.refugios.editarRequisito(7, 12, { descripcion: 'Otro', esObligatorio: false })).toThrow();
  expect(() => api.refugios.solicitarRegistro({ nombre: 'Prueba', nit: '123', encargado: 'Prueba', correo: 'a@b.co', telefono: '3001234567', direccion: 'Cali' })).toThrow();
  expect(fetch).not.toHaveBeenCalled();
});

it('propaga el error de asociación del backend sin intentar consultar otro refugio', async () => {
  const { api, fetch } = await preparar(Response.json({ detail: 'No tienes un refugio asociado.' }, { status: 404 }));
  await expect(api.refugios.miPerfil(7)).rejects.toMatchObject({ estadoHttp: 404 });
  expect(fetch).toHaveBeenCalledTimes(1);
});
