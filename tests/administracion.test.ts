import { afterEach, expect, it, vi } from 'vitest';
import {
  crearApi, AlmacenMemoria, EstadoDenuncia, EstadoModeracion, EstadoVerificacion, MotivoDenuncia, TipoContenido, sesionDesdeRespuesta,
} from '../packages/shared/src';

/** Contratos de HU-ADM-01 a 04, REF-01 y REF-04 contra el backend (8c9f391, adafb78). */
async function preparar(...respuestas: Response[]) {
  const fetch = vi.fn(); respuestas.forEach(r => fetch.mockResolvedValueOnce(r));
  vi.stubGlobal('fetch', fetch);
  const almacen = new AlmacenMemoria(); await almacen.guardar('token-prueba');
  return { api: crearApi({ urlBase: 'http://api.test', almacen }), fetch };
}
const paginado = <T,>(items: T[]) => ({ items, pagina: 1, tamanoPagina: 20, totalRegistros: items.length, totalPaginas: 1 });
const ok = () => Response.json({ mensaje: 'ok' });
afterEach(() => vi.unstubAllGlobals());

it('usuarios del admin: filtros, cambio de estado con motivo y de rol', async () => {
  const { api, fetch } = await preparar(
    Response.json(paginado([{ usuarioId: 5, nombre: 'Ana', correo: 'a@b.co', rol: 'Adoptante', estado: 'Activo', activo: true, fechaRegistro: '2026-10-01' }])),
    ok(), ok(),
  );
  const lista = await api.administracion.usuarios({ busqueda: ' ana ', rolId: 4, estado: 1 });
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Admin/usuarios?pagina=1&tamano=20&busqueda=ana&rolId=4&estado=1');
  expect(lista.items[0]).toEqual({ id: 5, nombre: 'Ana', correo: 'a@b.co', rol: 'Adoptante', estado: 'Activo', activo: true, fechaRegistro: '2026-10-01' });
  await expect(api.administracion.cambiarEstadoUsuario(5, false, ' ')).rejects.toMatchObject({ estadoHttp: 400 });
  await api.administracion.cambiarEstadoUsuario(5, false, 'Spam');
  expect([fetch.mock.calls[1][0], fetch.mock.calls[1][1].method, JSON.parse(fetch.mock.calls[1][1].body)]).toEqual(['http://api.test/api/v1/Admin/usuarios/5/estado', 'PATCH', { activo: false, motivo: 'Spam' }]);
  await api.administracion.cambiarRolUsuario(5, 3);
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ nuevoRolId: 3 });
});

it('denuncias: crear, bandeja con nombres del backend y resolver', async () => {
  const { api, fetch } = await preparar(
    Response.json({ mensaje: 'ok' }, { status: 201 }),
    Response.json(paginado([{ denunciaId: 2, denunciante: 'Ana', tipoContenido: 'Calificacion', idContenido: 9, motivo: 'ContenidoInapropiado', descripcion: '', estado: 'EnRevision', resultado: null, fecha: '2026-11-20' }])),
    ok(),
  );
  await api.administracion.denunciar({ tipoContenido: TipoContenido.Mascota, idContenido: 3, motivo: MotivoDenuncia.PosibleEstafa, descripcion: '  Piden plata ' });
  expect([fetch.mock.calls[0][0], JSON.parse(fetch.mock.calls[0][1].body)]).toEqual(['http://api.test/api/v1/Denuncias', { tipoContenido: 0, idContenido: 3, motivo: 0, descripcion: 'Piden plata' }]);
  expect((await api.administracion.denuncias({ estado: EstadoDenuncia.EnRevision })).items[0]).toMatchObject({
    id: 2, tipoContenido: TipoContenido.Calificacion, motivo: MotivoDenuncia.ContenidoInapropiado, estado: EstadoDenuncia.EnRevision, descripcion: null,
  });
  await expect(api.administracion.resolverDenuncia(2, { resultado: ' ', ocultarContenido: true })).rejects.toMatchObject({ estadoHttp: 400 });
  await api.administracion.resolverDenuncia(2, { resultado: 'Se ocultó', ocultarContenido: true });
  expect([fetch.mock.calls[2][0], fetch.mock.calls[2][1].method]).toEqual(['http://api.test/api/v1/Admin/denuncias/2/resolver', 'PATCH']);
});

it('política: activa (404 = ninguna), publicar, aceptar y el login marca la pendiente', async () => {
  const { api, fetch } = await preparar(
    Response.json({ politicaId: 3, version: '1.1', contenido: 'Texto', fechaPublicacion: '2026-11-25', activo: true }),
    Response.json({ detail: 'No hay' }, { status: 404 }),
    Response.json({ mensaje: 'ok', politicaId: 4 }, { status: 201 }),
    ok(),
  );
  expect(await api.administracion.politicaActiva()).toEqual({ id: 3, version: '1.1', contenido: 'Texto', fechaPublicacion: '2026-11-25', activo: true });
  expect(await api.administracion.politicaActiva()).toBeNull();
  await api.administracion.publicarPolitica({ version: ' 1.2 ', contenido: ' Nueva ' });
  expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({ version: '1.2', contenido: 'Nueva' });
  await api.administracion.aceptarPolitica({ id: 4, version: '1.2' });
  expect([fetch.mock.calls[3][0], JSON.parse(fetch.mock.calls[3][1].body)]).toEqual(['http://api.test/api/v1/Politicas/aceptar', { politicaId: 4, version: '1.2' }]);

  const token = `x.${btoa(JSON.stringify({ sub: '7', email: 'a@b.co' }))}.y`;
  const base = { accessToken: token, refreshToken: 'r', expiraEnSegundos: 900, nombre: 'Ana', rol: 'Adoptante' };
  expect(sesionDesdeRespuesta({ ...base, requiereAceptarPolitica: true, versionPoliticaActual: '1.2', politicaIdActual: 4 }).usuario.politicaPendiente).toEqual({ id: 4, version: '1.2' });
  expect(sesionDesdeRespuesta(base).usuario.politicaPendiente).toBeNull();
});

it('dashboard, moderación de opiniones y refugios pendientes con soportes', async () => {
  const { api, fetch } = await preparar(
    Response.json({ totalAdopcionesExitosas: 12, totalMascotasDisponibles: 30, totalUsuariosRegistrados: 80, totalRefugiosVerificados: 4, totalReportesCiudadanos: 9, tiempoPromedioAdopcionDias: 21.5, reportesPorEstado: [{ estado: 'EnAtencion', total: 3 }] }),
    Response.json(paginado([{ calificacionId: 8, refugioId: 1, refugioNombre: 'Patitas', adoptanteNombre: 'Ana', puntaje: 1, comentario: 'Mal', estadoModeracion: 'Publicada', fecha: '2026-11-01', activo: true }])),
    ok(),
    Response.json(paginado([{ refugioId: 9, nombre: 'Nuevo', nit: '900', direccion: 'Cra 1', telefono: null, correo: 'n@r.co', encargado: 'Luis', descripcion: null,
      redesSociales: { instagram: '@nuevo' }, estadoVerificacion: 'Pendiente', fechaCreacion: '2026-11-24', fechaVerificacion: null, motivoRechazo: null,
      soportes: [{ soporteId: 1, tipo: 'PDF', archivo: 'https://x/rut.pdf', fechaCarga: '2026-11-24' }] }])),
    ok(),
  );
  expect(await api.administracion.dashboard()).toMatchObject({ adopcionesExitosas: 12, tiempoPromedioAdopcionDias: 21.5, reportesPorEstado: [{ estado: 'EnAtencion', total: 3 }] });
  expect((await api.administracion.calificaciones({ estado: EstadoModeracion.Publicada })).items[0]).toMatchObject({ id: 8, estado: EstadoModeracion.Publicada });
  await api.administracion.moderarCalificacion(8, EstadoModeracion.Oculta);
  expect([fetch.mock.calls[2][0], JSON.parse(fetch.mock.calls[2][1].body)]).toEqual(['http://api.test/api/v1/Admin/calificaciones/8/moderar', { estadoModeracion: 1 }]);
  const pendiente = (await api.refugios.pendientes()).items[0]!;
  expect(pendiente).toMatchObject({ id: 9, nit: '900', estadoVerificacion: EstadoVerificacion.Pendiente, soportes: [{ id: 1, tipo: 'PDF', url: 'https://x/rut.pdf' }] });
  await api.refugios.suspender(9, { motivo: ' Fraude ' });
  expect([fetch.mock.calls[4][0], fetch.mock.calls[4][1].method, JSON.parse(fetch.mock.calls[4][1].body)]).toEqual(['http://api.test/api/v1/Refugios/9/suspender', 'PATCH', { motivo: 'Fraude' }]);
});

it('demo: el admin publica una política y la siguiente sesión la pide; las opiniones ocultas no salen en público', async () => {
  const api = crearApi({ urlBase: '', almacen: new AlmacenMemoria(), modoDemo: true });
  await api.autenticacion.login({ correo: 'admin@huellitas.co', contrasena: 'Demo1234' });
  await api.administracion.publicarPolitica({ version: '2.0', contenido: 'Nueva política' });
  const ocultable = (await api.administracion.calificaciones({ estado: EstadoModeracion.Publicada })).items.find(c => c.puntaje === 1)!;
  await api.administracion.moderarCalificacion(ocultable.id, EstadoModeracion.Oculta);
  await expect(api.administracion.cambiarEstadoUsuario((await api.administracion.usuarios({ busqueda: 'admin@' })).items[0]!.id, false, 'x')).rejects.toMatchObject({ estadoHttp: 400 });

  const sesion = await api.autenticacion.login({ correo: 'adoptante@huellitas.co', contrasena: 'Demo1234' });
  expect(sesion.usuario.politicaPendiente).toMatchObject({ version: '2.0' });
  await api.administracion.aceptarPolitica(sesion.usuario.politicaPendiente!);
  expect((await api.autenticacion.login({ correo: 'adoptante@huellitas.co', contrasena: 'Demo1234' })).usuario.politicaPendiente).toBeNull();
  expect((await api.refugios.opiniones(ocultable.refugioId, { tamanoPagina: 50 })).items.some(o => o.id === ocultable.id)).toBe(false);
  await api.administracion.denunciar({ tipoContenido: TipoContenido.Refugio, idContenido: 1, motivo: MotivoDenuncia.Otro });
});
