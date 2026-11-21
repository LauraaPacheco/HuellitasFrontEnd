import { afterEach, expect, it, vi } from 'vitest';
import {
  crearApi, AlmacenMemoria, EstadoApadrinamiento, EstadoNecesidad, EstadoSeguimiento, ResultadoSeguimiento, TipoEvento, TipoNecesidad,
  etiquetaEstadoSolicitud,
} from '../packages/shared/src';

/** Contratos de HU-REF-03/04 y HU-TRA-01 a 05 contra el backend real (95d5da4, 49b28ea, a00d0cc). */
async function preparar(...respuestas: Response[]) {
  const fetch = vi.fn(); respuestas.forEach(r => fetch.mockResolvedValueOnce(r));
  vi.stubGlobal('fetch', fetch);
  const almacen = new AlmacenMemoria(); await almacen.guardar('token-prueba');
  return { api: crearApi({ urlBase: 'http://api.test', almacen }), fetch };
}
const paginado = <T,>(items: T[]) => ({ items, pagina: 1, tamanoPagina: 20, totalRegistros: items.length, totalPaginas: 1 });
const ok = () => Response.json({ mensaje: 'ok' });
afterEach(() => vi.unstubAllGlobals());

it('necesidades: traduce tipo y estado por nombre y envía la descripción recortada', async () => {
  const { api, fetch } = await preparar(
    Response.json(paginado([{ necesidadId: 4, tipo: 'Medicinas', descripcion: 'Antipulgas', medioDonacion: ' ', estado: 'Cubierta', fechaPublicacion: '2026-11-18T10:00:00' }])),
    ok(), ok(), ok(), ok(),
  );
  const lista = await api.refugios.necesidades(7);
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Necesidades/refugio/7?pagina=1&tamano=20');
  expect(lista.items[0]).toMatchObject({ id: 4, tipo: TipoNecesidad.Medicinas, estado: EstadoNecesidad.Cubierta, medioDonacion: null });
  await api.refugios.publicarNecesidad({ tipo: TipoNecesidad.Alimento, descripcion: '  Concentrado ', medioDonacion: 'Nequi' });
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ tipo: 0, descripcion: 'Concentrado', medioDonacion: 'Nequi' });
  await api.refugios.editarNecesidad(4, { tipo: TipoNecesidad.Otro, descripcion: 'x' });
  expect([fetch.mock.calls[2][0], fetch.mock.calls[2][1].method]).toEqual(['http://api.test/api/v1/Necesidades/4', 'PUT']);
  await api.refugios.marcarNecesidadCubierta(4);
  expect([fetch.mock.calls[3][0], fetch.mock.calls[3][1].method]).toEqual(['http://api.test/api/v1/Necesidades/4/cubrir', 'PATCH']);
  await api.refugios.eliminarNecesidad(4);
  expect(fetch.mock.calls[4][1].method).toBe('DELETE');
});

it('necesidades: no envía una necesidad sin descripción', async () => {
  const { api, fetch } = await preparar();
  await expect(api.refugios.publicarNecesidad({ tipo: TipoNecesidad.Alimento, descripcion: '   ' })).rejects.toMatchObject({ estadoHttp: 400 });
  expect(fetch).not.toHaveBeenCalled();
});

it('apadrinamientos: solicitar, gestionar y cancelar con las rutas y cuerpos del backend', async () => {
  const { api, fetch } = await preparar(
    ok(),
    Response.json(paginado([{ apadrinamientoId: 2, mascotaId: 3, mascotaNombre: 'Luna', refugioNombre: null, adoptanteNombre: 'Ana', fechaInicio: '2026-11-18', estado: 'Solicitado', observacion: null }])),
    ok(), ok(),
  );
  await api.refugios.apadrinar(3, '  Ayudo con comida ');
  expect(JSON.parse(fetch.mock.calls[0][1].body)).toEqual({ mascotaId: 3, observacion: 'Ayudo con comida' });
  const lista = await api.refugios.apadrinamientosRefugio();
  expect(fetch.mock.calls[1][0]).toBe('http://api.test/api/v1/Apadrinamientos/refugio?pagina=1&tamano=20');
  expect(lista.items[0]).toMatchObject({ id: 2, padrinoNombre: 'Ana', estado: EstadoApadrinamiento.Solicitado });
  await api.refugios.gestionarApadrinamiento(2, false, '');
  expect([fetch.mock.calls[2][0], JSON.parse(fetch.mock.calls[2][1].body)]).toEqual(['http://api.test/api/v1/Apadrinamientos/2/gestionar', { aceptar: false, observacion: null }]);
  await api.refugios.cancelarApadrinamiento(2);
  expect([fetch.mock.calls[3][0], fetch.mock.calls[3][1].method]).toEqual(['http://api.test/api/v1/Apadrinamientos/2/cancelar', 'PATCH']);
});

it('calificaciones: lista pública y puntaje validado antes de enviar', async () => {
  const { api, fetch } = await preparar(Response.json(paginado([{ calificacionId: 1, adoptanteNombre: 'Ana', puntaje: 5, comentario: '', fecha: '2026-11-10' }])));
  const lista = await api.refugios.opiniones(7);
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Refugios/7/calificaciones?pagina=1&tamano=10');
  expect(lista.items[0]).toEqual({ id: 1, autor: 'Ana', puntaje: 5, comentario: null, fecha: '2026-11-10' });
  await expect(api.refugios.calificar(7, { adopcionId: 1, puntaje: 6 })).rejects.toMatchObject({ estadoHttp: 400 });
});

it('trazabilidad: línea de tiempo en orden, bitácora reciente primero y estados legibles', async () => {
  const { api, fetch } = await preparar(
    Response.json([
      { estadoAnterior: 'Enviada', estadoNuevo: 'EnRevision', observacion: null, usuarioResponsable: 'Refugio', fecha: '2026-11-02T10:00:00' },
      { estadoAnterior: 'Sin estado previo', estadoNuevo: 'Enviada', observacion: 'Creada', usuarioResponsable: 'Ana', fecha: '2026-11-01T10:00:00' },
    ]),
    Response.json([
      { tipoEvento: 'Ingreso', descripcion: 'Registrada', fecha: '2026-10-01T10:00:00' },
      { tipoEvento: 'AtencionClinica', descripcion: 'Vacuna', fecha: '2026-11-01T10:00:00' },
    ]),
  );
  const linea = await api.trazabilidad.lineaTiempo(9);
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Trazabilidad/solicitudes/9');
  expect(linea.map(e => e.estadoNuevo)).toEqual(['Enviada', 'EnRevision']);
  expect(linea[0]!.estadoAnterior).toBeNull();
  expect(etiquetaEstadoSolicitud('EnRevision')).toBe('En revisión');
  const historia = await api.trazabilidad.historialMascota(3);
  expect(historia.map(e => e.tipo)).toEqual([TipoEvento.AtencionClinica, TipoEvento.Ingreso]);
});

it('notificaciones, auditoría y seguimiento usan las rutas y verbos del backend', async () => {
  const { api, fetch } = await preparar(
    Response.json(paginado([{ notificacionId: 5, mensaje: 'Hola', leida: false, fechaEnvio: '2026-11-20' }])),
    ok(),
    Response.json(paginado([])),
    Response.json({ planId: 1, adopcionId: 8, seguimientos: [{ seguimientoId: 3, numero: 1, fechaProgramada: '2026-12-20', fechaEnvio: null, estado: 'Enviado', resultado: '1', fotosUrls: [] }] }),
    ok(),
  );
  expect((await api.trazabilidad.notificaciones()).items[0]).toEqual({ id: 5, mensaje: 'Hola', leida: false, fecha: '2026-11-20' });
  await api.trazabilidad.marcarLeida(5);
  expect([fetch.mock.calls[1][0], fetch.mock.calls[1][1].method]).toEqual(['http://api.test/api/v1/Notificaciones/5/leer', 'PATCH']);
  await api.trazabilidad.auditoria();
  expect(fetch.mock.calls[2][0]).toBe('http://api.test/api/v1/Trazabilidad/auditoria?pagina=1&tamano=20');
  const plan = await api.trazabilidad.planSeguimiento(8);
  expect(plan.seguimientos[0]).toMatchObject({ estado: EstadoSeguimiento.Enviado, resultado: ResultadoSeguimiento.RequiereAtencion });
  await api.trazabilidad.evaluarSeguimiento(3, ResultadoSeguimiento.Conforme);
  expect([fetch.mock.calls[4][0], fetch.mock.calls[4][1].method]).toEqual(['http://api.test/api/v1/Seguimientos/3/evaluar?resultado=0', 'PATCH']);
});

it('demo: el refugio publica y cubre necesidades y responde al padrino; el adoptante ve sus notificaciones', async () => {
  const api = crearApi({ urlBase: '', almacen: new AlmacenMemoria(), modoDemo: true });
  await api.autenticacion.login({ correo: 'refugio@huellitas.co', contrasena: 'Demo1234' });
  const refugioId = 1; // El refugio del usuario demo (demo/datos.ts).
  const antes = (await api.refugios.necesidades(refugioId)).total;
  await api.refugios.publicarNecesidad({ tipo: TipoNecesidad.Insumos, descripcion: 'Mantas' });
  const lista = await api.refugios.necesidades(refugioId);
  expect(lista.total).toBe(antes + 1);
  const nueva = lista.items.find(n => n.descripcion === 'Mantas')!;
  await api.refugios.marcarNecesidadCubierta(nueva.id);
  expect((await api.refugios.necesidades(refugioId)).items.find(n => n.id === nueva.id)!.estado).toBe(EstadoNecesidad.Cubierta);
  const pendiente = (await api.refugios.apadrinamientosRefugio()).items.find(a => a.estado === EstadoApadrinamiento.Solicitado)!;
  await api.refugios.gestionarApadrinamiento(pendiente.id, true);
  await expect(api.refugios.gestionarApadrinamiento(pendiente.id, true)).rejects.toMatchObject({ estadoHttp: 409 });

  await api.autenticacion.login({ correo: 'adoptante@huellitas.co', contrasena: 'Demo1234' });
  const notificaciones = await api.trazabilidad.notificaciones();
  const sinLeer = notificaciones.items.find(n => !n.leida)!;
  await api.trazabilidad.marcarLeida(sinLeer.id);
  expect((await api.trazabilidad.notificaciones()).items.find(n => n.id === sinLeer.id)!.leida).toBe(true);
  await expect(api.trazabilidad.auditoria()).rejects.toMatchObject({ estadoHttp: 403 });
});
