import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlmacenMemoria, crearApi, EstadoSolicitud, estadoSolicitudApi, validarArchivoServidor } from '../packages/shared/src';
async function preparar(respuestas: Response[]) {
  const almacen=new AlmacenMemoria();await almacen.guardar('token-de-prueba');const fetch=vi.fn();respuestas.forEach(r=>fetch.mockResolvedValueOnce(r));vi.stubGlobal('fetch',fetch);
  return {api:crearApi({urlBase:'http://api.test',almacen}),fetch,almacen};
}
afterEach(()=>vi.unstubAllGlobals());
describe('ADO-04 a ADO-07, contrato 85757de',()=>{
  it('finaliza mediante PATCH por solicitud, sin fabricar una adopción del mensaje',async()=>{
    const {api,fetch}=await preparar([Response.json({mensaje:'Finalizada'})]);expect(await api.adopcion.finalizar(8)).toBeUndefined();expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Adopciones/8/finalizar');expect(fetch.mock.calls[0][1]).toMatchObject({method:'PATCH',headers:{Authorization:'Bearer token-de-prueba'}});expect(fetch.mock.calls[0][1].body).toBeUndefined();
  });
  it.each([403,409,500])('no reintenta ni oculta un error %i al finalizar',async status=>{
    const {api,fetch}=await preparar([Response.json({title:'Conflicto',detail:'No permitido'}, {status})]);await expect(api.adopcion.finalizar(8)).rejects.toMatchObject({estadoHttp:status});expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('agenda con fecha local y modalidad cero, y confirma/rechaza con booleanos reales',async()=>{
    const {api,fetch}=await preparar([Response.json({}),Response.json({}),Response.json({})]);const fecha='2099-11-09T14:30';await api.adopcion.agendarVisita({solicitudId:8,fecha,modalidad:0});await api.adopcion.confirmarVisita(8,true);await api.adopcion.confirmarVisita(8,false);
    expect(fetch.mock.calls.map(c=>[c[0],c[1].method,JSON.parse(c[1].body)])).toEqual([['http://api.test/api/v1/Adopciones/8/agendar-visita','POST',{fecha,modalidad:0}],['http://api.test/api/v1/Adopciones/8/confirmar-visita','PATCH',{aceptar:true}],['http://api.test/api/v1/Adopciones/8/confirmar-visita','PATCH',{aceptar:false}]]);
  });
  it('bloquea una fecha pasada antes de llamar al servidor',async()=>{const {api,fetch}=await preparar([]);await expect(api.adopcion.agendarVisita({solicitudId:8,fecha:'2000-01-01',modalidad:0})).rejects.toThrow();expect(fetch).not.toHaveBeenCalled();});
  it('sube binario multipart autenticado, asocia URL en JSON y consulta los documentos',async()=>{
    const documentos=[{documentoId:4,tipo:'Certificado',archivoUrl:'https://example.com/doc.pdf',fechaCarga:'2026-11-09'}];const {api,fetch}=await preparar([Response.json({url:documentos[0]!.archivoUrl}),Response.json({mensaje:'Guardado'}),Response.json(documentos)]);
    const form=new FormData();form.append('archivo',new Blob(['%PDF-1.4'],{type:'application/pdf'}),'doc.pdf');form.append('tipo','soportes');const url=await api.archivos.subir(form);await api.adopcion.asociarSoporte(8,' Certificado ',url);expect(await api.adopcion.documentos(8)).toEqual(documentos);
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Archivos');expect(fetch.mock.calls[0][1].body).toBe(form);expect(fetch.mock.calls[0][1].headers).not.toHaveProperty('Content-Type');expect(fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer token-de-prueba');expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({tipo:'Certificado',archivoUrl:url});expect(fetch.mock.calls[2][0]).toBe('http://api.test/api/v1/Adopciones/8/soportes');
  });
  it('conserva errores de asociación para permitir reintento sin volver a subir archivo',async()=>{const {api,fetch}=await preparar([Response.json({detail:'Cerrada'},{status:409})]);await expect(api.adopcion.asociarSoporte(8,'Documento','https://example.com/doc.pdf')).rejects.toMatchObject({estadoHttp:409});expect(fetch).toHaveBeenCalledTimes(1);});
  it('descarga PDF binario con autenticación en lugar de analizarlo como JSON',async()=>{const {api,fetch}=await preparar([new Response('%PDF-1.4\ncontenido',{headers:{'Content-Type':'application/pdf'}})]);const pdf=await api.adopcion.descargarConstancia(8);expect(await pdf.text()).toContain('%PDF');expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Adopciones/8/constancia');expect(fetch.mock.calls[0][1].headers).toMatchObject({Accept:'application/pdf',Authorization:'Bearer token-de-prueba'});});
  it('propaga 404 y 401 en PDF, y limpia la sesión expirada',async()=>{const {api,almacen}=await preparar([Response.json({detail:'No finalizada'},{status:404}),Response.json({title:'Sesión vencida'},{status:401})]);await expect(api.adopcion.descargarConstancia(8)).rejects.toMatchObject({estadoHttp:404});await expect(api.adopcion.descargarConstancia(8)).rejects.toMatchObject({estadoHttp:401});expect(await almacen.obtener()).toBeNull();});
  it('rechaza JSON con 200 como PDF y formatos de archivo no admitidos',async()=>{const {api}=await preparar([Response.json({mensaje:'No es PDF'})]);await expect(api.adopcion.descargarConstancia(8)).rejects.toMatchObject({estadoHttp:502});expect(validarArchivoServidor('doc.pdf',1)).toBeNull();expect(validarArchivoServidor('doc.pdf',1,true)).toBeTruthy();expect(validarArchivoServidor('foto.jpg',0)).toBeTruthy();expect(validarArchivoServidor('doc.exe',10)).toBeTruthy();expect(validarArchivoServidor('doc.pdf',5*1024*1024+1)).toBeTruthy();});
  it('interpreta Cerrada para las otras solicitudes afectadas por el cierre masivo',()=>{expect(estadoSolicitudApi('Cerrada')).toBe(EstadoSolicitud.Cerrada);});
});

it('marca en revisión por PATCH autenticado y propaga conflictos sin simular éxito', async () => {
  const { api, fetch } = await preparar([
    Response.json({ mensaje: 'Solicitud en revisión.' }),
    Response.json({ detail: 'Solo solicitudes enviadas.' }, { status: 409 }),
  ]);
  await api.adopcion.marcarEnRevision(8);
  expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Adopciones/8/revisar');
  expect(fetch.mock.calls[0][1]).toMatchObject({ method: 'PATCH', headers: { Authorization: 'Bearer token-de-prueba' } });
  await expect(api.adopcion.marcarEnRevision(8)).rejects.toMatchObject({ estadoHttp: 409 });
});
