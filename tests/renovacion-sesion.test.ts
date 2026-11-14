import { afterEach, expect, it, vi } from 'vitest';
import { ClienteApi, AlmacenMemoria, sesionDesdeRespuesta } from '../packages/shared/src';
const respuesta = { accessToken: 'nuevo', refreshToken: 'refresh-nuevo', expiraEnSegundos: 900, nombre: 'Refugio', rol: 'Refugio' };
const sinSesion = () => Response.json({ title: 'Vencido' }, { status: 401 });
function pendiente<T>() { let resolver!: (v: T) => void; const promesa = new Promise<T>(r => { resolver = r; }); return { promesa, resolver }; }
async function preparar() {
  const almacen = new AlmacenMemoria(), almacenSesion = new AlmacenMemoria();
  const alExpirarSesion = vi.fn(), alRenovarSesion = vi.fn();
  const cliente = new ClienteApi({ urlBase: 'http://api.test', almacen, almacenSesion, alExpirarSesion, alRenovarSesion, cabecerasExtra: { 'X-Tunnel-Authorization': 'tunnel prueba' } });
  const inicial = sesionDesdeRespuesta({ ...respuesta, accessToken: 'viejo', refreshToken: 'refresh-viejo' });
  await cliente.guardarSesion({ ...inicial, usuario: { ...inicial.usuario, id: 42, refugioId: 7, telefono: '3001234567' } });
  return { cliente, almacen, almacenSesion, alExpirarSesion, alRenovarSesion };
}
afterEach(() => vi.unstubAllGlobals());
it('renueva, persiste la rotación y reintenta la petición manteniendo el perfil y la cabecera del túnel', async () => {
  const { cliente, almacen, almacenSesion, alExpirarSesion } = await preparar();
  const fetch = vi.fn().mockResolvedValueOnce(sinSesion()).mockResolvedValueOnce(Response.json(respuesta)).mockResolvedValueOnce(Response.json({ ok: true }));vi.stubGlobal('fetch', fetch);
  expect(await cliente.get('/privado')).toEqual({ ok: true });
  expect(fetch.mock.calls[1][0]).toBe('http://api.test/api/v1/Auth/refresh');
  expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({ refreshToken: 'refresh-viejo' });
  expect(fetch.mock.calls[1][1].headers['X-Tunnel-Authorization']).toBe('tunnel prueba');
  expect(fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer nuevo');
  expect(await almacen.obtener()).toBe('nuevo');
  expect(JSON.parse((await almacenSesion.obtener())!)).toMatchObject({ token: 'nuevo', refreshToken: 'refresh-nuevo', usuario: { id: 42, refugioId: 7, telefono: '3001234567' } });
  expect(alExpirarSesion).not.toHaveBeenCalled();
});
it('tres peticiones simultáneas comparten una sola renovación', async () => {
  const { cliente } = await preparar();const renovar = pendiente<Response>();let veces = 0;
  vi.stubGlobal('fetch', vi.fn((url, opts) => { if (url.endsWith('/refresh')) { veces++;return renovar.promesa; } return Promise.resolve(opts.headers.Authorization === 'Bearer viejo' ? sinSesion() : Response.json({ ok: true })); }));
  const tareas = [cliente.get('/a'), cliente.get('/b'), cliente.get('/c')];
  await vi.waitFor(() => expect(veces).toBe(1));renovar.resolver(Response.json(respuesta));
  expect(await Promise.all(tareas)).toEqual([{ ok: true }, { ok: true }, { ok: true }]);expect(veces).toBe(1);
});
it('un 401 tardío reutiliza el token nuevo sin rotarlo otra vez', async () => {
  const { cliente } = await preparar();const tardia = pendiente<Response>();let renovaciones = 0;
  vi.stubGlobal('fetch', vi.fn((url, opts) => { if (url.endsWith('/refresh')) { renovaciones++;return Promise.resolve(Response.json(respuesta)); } if (opts.headers.Authorization === 'Bearer nuevo') return Promise.resolve(Response.json({ ok: true }));return url.endsWith('/b') ? tardia.promesa : Promise.resolve(sinSesion()); }));
  const b = cliente.get('/b');await cliente.get('/a');tardia.resolver(sinSesion());await b;expect(renovaciones).toBe(1);
});
it.each([401,403])('cierra la sesión si el servidor rechaza la renovación con %s', async status => {
  const { cliente, almacen, almacenSesion, alExpirarSesion } = await preparar();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(sinSesion()).mockResolvedValueOnce(Response.json({ title: 'Inválido' }, { status })));
  await expect(cliente.get('/privado')).rejects.toMatchObject({ estadoHttp: status });
  expect(await almacen.obtener()).toBeNull();expect(await almacenSesion.obtener()).toBeNull();expect(alExpirarSesion).toHaveBeenCalledOnce();
});
it('no cierra una sesión recuperable por un fallo de red al renovar', async () => {
  const { cliente, almacen, alExpirarSesion } = await preparar();
  vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(sinSesion()).mockRejectedValueOnce(new TypeError('Sin red')));
  await expect(cliente.get('/privado')).rejects.toMatchObject({ estadoHttp: 0 });expect(await almacen.obtener()).toBe('viejo');expect(alExpirarSesion).not.toHaveBeenCalled();
});
it('un segundo 401 después de renovar no genera un bucle y limpia ambos almacenes', async () => {
  const { cliente, almacenSesion, alExpirarSesion } = await preparar();const fetch = vi.fn().mockResolvedValueOnce(sinSesion()).mockResolvedValueOnce(Response.json(respuesta)).mockResolvedValueOnce(sinSesion());vi.stubGlobal('fetch', fetch);
  await expect(cliente.get('/privado')).rejects.toMatchObject({ estadoHttp: 401 });expect(fetch).toHaveBeenCalledTimes(3);expect(await almacenSesion.obtener()).toBeNull();expect(alExpirarSesion).toHaveBeenCalledOnce();
});
it('un login incorrecto no renueva ni borra una sesión anterior', async () => {
  const { cliente, almacen, alExpirarSesion } = await preparar();const fetch = vi.fn().mockResolvedValue(sinSesion());vi.stubGlobal('fetch', fetch);
  await expect(cliente.post('/api/v1/Auth/login', {})).rejects.toMatchObject({ estadoHttp: 401 });expect(fetch).toHaveBeenCalledTimes(1);expect(await almacen.obtener()).toBe('viejo');expect(alExpirarSesion).not.toHaveBeenCalled();
});
it('no restaura la sesión si el usuario sale mientras la renovación está pendiente', async () => {
  const { cliente, almacen, almacenSesion } = await preparar();const renovar = pendiente<Response>();let empezo = false;
  vi.stubGlobal('fetch', vi.fn(url => { if (url.endsWith('/refresh')) { empezo = true;return renovar.promesa; }return Promise.resolve(sinSesion()); }));
  const trabajo = cliente.get('/privado');const error = expect(trabajo).rejects.toMatchObject({ estadoHttp: 401 });await vi.waitFor(() => expect(empezo).toBe(true));
  await cliente.limpiarSesion();renovar.resolver(Response.json(respuesta));await error;expect(await almacen.obtener()).toBeNull();expect(await almacenSesion.obtener()).toBeNull();
});
it('conserva los tokens rotados al actualizar los datos del perfil', async () => {
  const { cliente, almacenSesion } = await preparar();vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(sinSesion()).mockResolvedValueOnce(Response.json(respuesta)).mockResolvedValueOnce(Response.json({ ok: true })));
  const antes = JSON.parse((await almacenSesion.obtener())!);await cliente.get('/privado');await cliente.actualizarUsuarioSesion({ ...antes.usuario, nombre: 'Nuevo nombre' });
  expect(JSON.parse((await almacenSesion.obtener())!)).toMatchObject({ token: 'nuevo', refreshToken: 'refresh-nuevo', usuario: { nombre: 'Nuevo nombre' } });
});
it('reintenta FormData sin perder el archivo y sin fijar Content-Type', async () => {
  const { cliente } = await preparar();const fetch = vi.fn().mockResolvedValueOnce(sinSesion()).mockResolvedValueOnce(Response.json(respuesta)).mockResolvedValueOnce(Response.json({ url: 'https://foto.test/a.jpg' }));vi.stubGlobal('fetch', fetch);
  const form = new FormData();form.append('archivo',new Blob(['foto']),'foto.jpg');await cliente.post('/api/v1/Archivos',form);
  expect(fetch.mock.calls[2][1].body).toBe(form);expect(fetch.mock.calls[2][1].headers['Content-Type']).toBeUndefined();
});
it('reintenta la descarga de PDF como binario', async () => {
  const { cliente } = await preparar();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(sinSesion()).mockResolvedValueOnce(Response.json(respuesta)).mockResolvedValueOnce(new Response('%PDF',{ headers:{'Content-Type':'application/pdf'} })));
  const pdf = await cliente.peticion<Blob>('/constancia',{formato:'blob'});expect(await pdf.text()).toBe('%PDF');
});
it('coordina dos pestañas con el bloqueo compartido y renueva solo una vez', async () => {
  const { cliente, almacen, almacenSesion } = await preparar();let cola: Promise<unknown> = Promise.resolve();
  const bloqueo = (accion: () => Promise<string | null>) => { const trabajo = cola.then(accion);cola = trabajo.catch(() => undefined);return trabajo; };
  const uno = new ClienteApi({ urlBase: 'http://api.test', almacen, almacenSesion, ejecutarRenovacionExclusiva: bloqueo });
  const dos = new ClienteApi({ urlBase: 'http://api.test', almacen, almacenSesion, ejecutarRenovacionExclusiva: bloqueo });
  let renovaciones = 0;
  vi.stubGlobal('fetch',vi.fn((url,opts) => { if(url.endsWith('/refresh')) {renovaciones++;return Promise.resolve(Response.json(respuesta));}return Promise.resolve(opts.headers.Authorization === 'Bearer viejo' ? sinSesion() : Response.json({ok:true})); }));
  await Promise.all([uno.get('/a'),dos.get('/b')]);expect(renovaciones).toBe(1);
});
it('no sobrescribe una sesión nueva al terminar una renovación anterior', async () => {
  const { cliente, almacen, almacenSesion } = await preparar();const renovar=pendiente<Response>();let empezo=false;
  vi.stubGlobal('fetch',vi.fn(url=>{if(url.endsWith('/refresh')){empezo=true;return renovar.promesa;}return Promise.resolve(sinSesion());}));
  const trabajo=cliente.get('/privado');const rechazo=expect(trabajo).rejects.toMatchObject({estadoHttp:401});await vi.waitFor(()=>expect(empezo).toBe(true));
  await cliente.guardarSesion(sesionDesdeRespuesta({...respuesta,accessToken:'otra-sesion',refreshToken:'otro-refresh'}));
  renovar.resolver(Response.json(respuesta));await rechazo;expect(await almacen.obtener()).toBe('otra-sesion');expect(JSON.parse((await almacenSesion.obtener())!).refreshToken).toBe('otro-refresh');
});
it('conserva la sesión ante un error 500 al renovar', async () => {
  const { cliente, almacen, alExpirarSesion }=await preparar();vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce(sinSesion()).mockResolvedValueOnce(Response.json({title:'Error temporal'},{status:500})));
  await expect(cliente.get('/privado')).rejects.toMatchObject({estadoHttp:500});expect(await almacen.obtener()).toBe('viejo');expect(alExpirarSesion).not.toHaveBeenCalled();
});
