import { afterEach, describe, expect, it, vi } from 'vitest';
import { AlmacenMemoria, ClienteApi, ErrorHttp } from '../packages/shared/src/api/client';
afterEach(() => vi.useRealTimers());
const preparar = () => {
  const almacen = new AlmacenMemoria();
  const alExpirarSesion = vi.fn();
  const cliente = new ClienteApi({ urlBase: 'https://api.example', almacen, alExpirarSesion, cabecerasExtra: { 'X-Tunnel-Authorization': 'tunnel prueba' }, tiempoLimiteMs: 100 });
  return { cliente, almacen, alExpirarSesion };
};
describe('Cliente HTTP compartido', () => {
  it('envía token y serializa filtros sin perder cero ni false', async () => {
    const { cliente, almacen } = preparar(); await almacen.guardar('token');
    const fetch = vi.fn().mockResolvedValue(Response.json([])); vi.stubGlobal('fetch', fetch);
    await cliente.get('/mascotas', { estado: 0, activo: false, vacio: '', omitido: undefined, colores: [1, 2] });
    const [url, opciones] = fetch.mock.calls[0];
    expect(url).toBe('https://api.example/mascotas?estado=0&activo=false&colores=1&colores=2');
    expect(opciones.headers.Authorization).toBe('Bearer token');
    expect(opciones.headers['X-Tunnel-Authorization']).toBe('tunnel prueba');
  });
  it('envía JSON y admite respuestas sin contenido', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 })); vi.stubGlobal('fetch', fetch);
    await expect(preparar().cliente.post('/crear', { nombre: 'Canela' })).resolves.toBeUndefined();
    expect(fetch.mock.calls[0][1].body).toBe('{"nombre":"Canela"}');
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBe('application/json');
  });
  it('envía FormData sin forzar Content-Type ni convertirlo a JSON', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ id: 1 })); vi.stubGlobal('fetch', fetch);
    const datos = new FormData(); datos.append('nombre', 'foto');
    await preparar().cliente.post('/foto', datos);
    expect(fetch.mock.calls[0][1].body).toBe(datos);
    expect(fetch.mock.calls[0][1].headers['Content-Type']).toBeUndefined();
  });
  it('borra token y avisa cuando vence la sesión', async () => {
    const { cliente, almacen, alExpirarSesion } = preparar(); await almacen.guardar('vencido');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ title: 'Sin sesión' }, { status: 401 })));
    await expect(cliente.get('/privado')).rejects.toMatchObject({ estadoHttp: 401, esNoAutenticado: true });
    expect(await almacen.obtener()).toBeNull(); expect(alExpirarSesion).toHaveBeenCalledOnce();
  });
  it('traduce ProblemDetails y conserva errores por campo sin cerrar sesión por 403', async () => {
    const { cliente, almacen, alExpirarSesion } = preparar(); await almacen.guardar('vigente');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({ title: 'Prohibido', detail: 'Rol insuficiente', errors: { rol: ['Sin acceso'] } }, { status: 403 })));
    await expect(cliente.get('/privado')).rejects.toMatchObject({ message: 'Prohibido', detalle: 'Rol insuficiente', errores: { rol: ['Sin acceso'] }, esSinPermiso: true });
    expect(await almacen.obtener()).toBe('vigente'); expect(alExpirarSesion).not.toHaveBeenCalled();
  });
  it('convierte fallos de red en error manejable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')));
    await expect(preparar().cliente.get('/datos')).rejects.toBeInstanceOf(ErrorHttp);
  });
  it('aborta una petición que excede el límite', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn((_url, opciones) => new Promise((_resolver, rechazar) => {
      opciones.signal.addEventListener('abort', () => rechazar(new DOMException('Cancelado', 'AbortError')));
    })));
    const resultado = preparar().cliente.get('/lento');
    const comprobacion = expect(resultado).rejects.toMatchObject({ estadoHttp: 0, message: 'La solicitud tardó demasiado' });
    await vi.advanceTimersByTimeAsync(101); await comprobacion;
  });
});
