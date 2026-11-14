import { afterEach, expect, it, vi } from 'vitest';
import { crearApi, AlmacenMemoria, EstadoSolicitud, puedeDecidirSolicitud, visitaVigente, type VisitaResumen, type SolicitudResumen } from '../packages/shared/src';
const visita: VisitaResumen = { visitaId: 2, solicitudId: 8, mascotaNombre: 'Luna', adoptanteNombre: 'Laura', refugioNombre: 'Refugio', fecha: '2026-11-20T10:30:00-05:00', modalidad: 'Virtual', estado: 'Propuesta' };
const solicitud = { id: 8, estado: EstadoSolicitud.EntrevistaVisita } as SolicitudResumen;
afterEach(() => vi.unstubAllGlobals());
it.each(['Propuesta','Reprogramada','Desconocido'])('no habilita decisiones cuando la visita está %s', estado => {
 expect(puedeDecidirSolicitud(solicitud,{...visita,estado})).toBe(false);
});
it('habilita aprobar y rechazar tras la confirmación del adoptante', () => {
 expect(puedeDecidirSolicitud(solicitud,{...visita,estado:'Confirmada'})).toBe(true);
});
it.each([EstadoSolicitud.Rechazada,EstadoSolicitud.Cancelada,EstadoSolicitud.Finalizada,EstadoSolicitud.Cerrada])('no reabre una solicitud terminada %s aunque tenga una visita confirmada', estado => {
 expect(puedeDecidirSolicitud({...solicitud,estado},{...visita,estado:'Confirmada'})).toBe(false);
});
it('no habilita decisiones sin conocer la visita durante una entrevista',()=>{
 expect(puedeDecidirSolicitud(solicitud)).toBe(false);
});
it('elige la última propuesta por ID, sin confundir otra solicitud o una fecha antigua más lejana',()=>{
 const nueva={...visita,visitaId:9,fecha:'2026-11-19T10:00:00-05:00'};
 expect(visitaVigente([{...visita,visitaId:10,solicitudId:999},visita,nueva],8)).toBe(nueva);
});
it('consume las listas reales y confirma por ID de solicitud, no por ID de visita',async()=>{
 const almacen=new AlmacenMemoria();await almacen.guardar('token');const api=crearApi({urlBase:'http://api.test',almacen});
 const fetch=vi.fn().mockResolvedValueOnce(Response.json([visita])).mockResolvedValueOnce(Response.json([visita])).mockResolvedValueOnce(Response.json({mensaje:'Confirmada'})).mockResolvedValueOnce(Response.json({mensaje:'Fecha rechazada'}));vi.stubGlobal('fetch',fetch);
 expect((await api.adopcion.misVisitas())[0]).toMatchObject({fecha:visita.fecha,modalidad:'Virtual'});
 await api.adopcion.visitasRefugio();await api.adopcion.confirmarVisita(8,true);await api.adopcion.confirmarVisita(8,false);
 expect(fetch.mock.calls.map(c=>c[0])).toEqual(['http://api.test/api/v1/Adopciones/mis-visitas','http://api.test/api/v1/Adopciones/refugio/visitas','http://api.test/api/v1/Adopciones/8/confirmar-visita','http://api.test/api/v1/Adopciones/8/confirmar-visita']);
 expect(fetch.mock.calls[2][1].method).toBe('PATCH');expect(JSON.parse(fetch.mock.calls[2][1].body)).toEqual({aceptar:true});expect(JSON.parse(fetch.mock.calls[3][1].body)).toEqual({aceptar:false});
});
it('propaga conflictos sin simular una aceptación',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(Response.json({detail:'Ya gestionada'},{status:409})));
 const api=crearApi({urlBase:'http://api.test',almacen:new AlmacenMemoria()});
 await expect(api.adopcion.confirmarVisita(8,true)).rejects.toMatchObject({estadoHttp:409});
});
