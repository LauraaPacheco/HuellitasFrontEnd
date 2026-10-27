import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearApi, AlmacenMemoria } from '../packages/shared/src';
const datos = { mascotaId: 9, respuestasFormulario: { motivacion: 'Quiero ofrecerle un hogar' }, aceptaCompromisos: true };
afterEach(() => vi.unstubAllGlobals());
describe('HU-ADO-01 contrato real 06a195e', () => {
  it('envía el formulario al endpoint versionado y conserva el código del servidor', async () => {
    const respuesta = { mensaje: 'Solicitud enviada', solicitud: { solicitudId: 3, codigo: 'SOL-ABC123', mascotaNombre: 'Luna', fechaEnvio: '2026-10-27T14:00:00', estado: 'Pendiente' } };
    const fetch = vi.fn().mockResolvedValue(Response.json(respuesta, { status: 201 })); vi.stubGlobal('fetch', fetch);
    const api = crearApi({ urlBase: 'http://api.test', almacen: new AlmacenMemoria() });
    expect(await api.adopcion.postular(datos)).toEqual(respuesta);
    const [url, opciones] = fetch.mock.calls[0]; expect(url).toBe('http://api.test/api/v1/Adopciones'); expect(opciones.method).toBe('POST');
    expect(JSON.parse(opciones.body)).toEqual({ mascotaId: 9, respuestasFormulario: { motivacion: datos.respuestasFormulario.motivacion, aceptaCompromisos: true } });
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it.each([400,403,404,409,500])('propaga HTTP %i sin generar una confirmación ni reintentar el POST', async estado => {
    const fetch = vi.fn().mockResolvedValue(Response.json({title:'Error', detail:'No se puede enviar.'}, {status:estado})); vi.stubGlobal('fetch',fetch);
    const api=crearApi({urlBase:'http://api.test',almacen:new AlmacenMemoria()});
    await expect(api.adopcion.postular(datos)).rejects.toMatchObject({estadoHttp:estado,detalle:'No se puede enviar.'});expect(fetch).toHaveBeenCalledTimes(1);
  });
  it('un fallo de conexión no produce una confirmación ficticia', async () => {
    const fetch=vi.fn().mockRejectedValue(new TypeError('Network error'));vi.stubGlobal('fetch',fetch);
    await expect(crearApi({urlBase:'http://api.test',almacen:new AlmacenMemoria()}).adopcion.postular(datos)).rejects.toThrow();expect(fetch).toHaveBeenCalledTimes(1);
  });
});
