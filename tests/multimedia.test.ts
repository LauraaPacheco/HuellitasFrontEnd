import { describe, expect, it } from 'vitest';
import { crearApi, AlmacenMemoria, TipoMultimedia, MAX_FOTO_BYTES, MAX_VIDEO_BYTES, validarArchivoMascota, coincideFirmaArchivo } from '../packages/shared/src';
const nueva = () => crearApi({ urlBase: '', modoDemo: true, almacen: new AlmacenMemoria() });
async function login(api: ReturnType<typeof nueva>, correo = 'refugio@huellitas.co') { await api.autenticacion.login({ correo, contrasena: 'Demo1234' }); }
const png = Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a90sAAAAASUVORK5CYII='), c => c.charCodeAt(0));
function cuerpo(tipo = 'image/png', contenido: Uint8Array = png) { const datos = new FormData(); datos.append('archivo', new Blob([contenido], { type: tipo }), 'prueba'); return datos; }
describe('HU-MAS-03 multimedia', () => {
  it('valida formatos y límites sin aceptar archivos vacíos o MIME arbitrario', () => {
    expect(validarArchivoMascota({ type: 'image/png', size: MAX_FOTO_BYTES })).toBeNull();
    expect(validarArchivoMascota({ type: 'video/mp4', size: MAX_VIDEO_BYTES })).toBeNull();
    for (const archivo of [{ type: 'image/svg+xml', size: 100 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: MAX_FOTO_BYTES + 1 }, { type: 'video/mp4', size: MAX_VIDEO_BYTES + 1 }]) expect(validarArchivoMascota(archivo)).not.toBeNull();
    expect(coincideFirmaArchivo('image/png', png)).toBe(true);
    expect(coincideFirmaArchivo('image/jpeg', png)).toBe(false);
  });
  it('carga, consulta y refleja la primera foto en la portada del listado', async () => {
    const api = nueva(); await login(api);
    const archivo = await api.mascotas.subirMultimedia(1, cuerpo());
    expect(archivo).toMatchObject({ mascotaId: 1, activo: true, tipo: TipoMultimedia.Foto, esPrincipal: true });
    expect(archivo.archivo).toMatch(/^data:image\/png;base64,/);
    expect((await api.mascotas.obtener(1)).multimedia[0]?.id).toBe(archivo.id);
    expect((await api.mascotas.buscar()).items.find(m => m.id === 1)?.fotoPrincipal).toBe(archivo.archivo);
    expect((await nueva().mascotas.obtener(1)).multimedia).toHaveLength(0);
  });
  it('permite cambiar principal y al eliminarla selecciona otra foto', async () => {
    const api = nueva(); await login(api);
    const primera = await api.mascotas.subirMultimedia(1, cuerpo());
    const segunda = await api.mascotas.subirMultimedia(1, cuerpo());
    expect(segunda.esPrincipal).toBe(false);
    await api.mascotas.marcarFotoPrincipal(1, segunda.id);
    expect((await api.mascotas.obtener(1)).multimedia.filter(a => a.esPrincipal).map(a => a.id)).toEqual([segunda.id]);
    await api.mascotas.eliminarMultimedia(1, segunda.id);
    expect((await api.mascotas.obtener(1)).multimedia).toMatchObject([{ id: primera.id, esPrincipal: true }]);
    await api.mascotas.eliminarMultimedia(1, primera.id);
    expect((await api.mascotas.obtener(1)).multimedia).toHaveLength(0);
    expect((await api.mascotas.buscar()).items.find(m => m.id === 1)?.fotoPrincipal).toBeNull();
    await expect(api.mascotas.eliminarMultimedia(1, primera.id)).rejects.toMatchObject({ estadoHttp: 404 });
  });
  it('los videos nunca son portada aunque se carguen primero', async () => {
    const api = nueva(); await login(api);
    // Cabecera mínima para comprobar el contrato; no se pretende un video reproducible.
    const video = await api.mascotas.subirMultimedia(1, cuerpo('video/mp4', new Uint8Array([0,0,0,24,102,116,121,112,109,112,52,50])));
    expect(video).toMatchObject({ tipo: TipoMultimedia.Video, esPrincipal: false });
    await expect(api.mascotas.marcarFotoPrincipal(1, video.id)).rejects.toMatchObject({ estadoHttp: 400 });
    const foto = await api.mascotas.subirMultimedia(1, cuerpo()); expect(foto.esPrincipal).toBe(true);
    await api.mascotas.eliminarMultimedia(1, foto.id);
    expect((await api.mascotas.obtener(1)).multimedia[0]?.esPrincipal).toBe(false);
  });
  it('exige sesión, rol, propietario y refugio verificado para cargar o modificar', async () => {
    const api = nueva();
    await expect(api.mascotas.subirMultimedia(1, cuerpo())).rejects.toMatchObject({ estadoHttp: 401 });
    for (const correo of ['adoptante@huellitas.co', 'admin@huellitas.co']) { await login(api, correo); await expect(api.mascotas.subirMultimedia(1, cuerpo())).rejects.toMatchObject({ estadoHttp: 403 }); }
    await login(api); const foto = await api.mascotas.subirMultimedia(1, cuerpo());
    await expect(api.mascotas.subirMultimedia(2, cuerpo())).rejects.toMatchObject({ estadoHttp: 403 });
    await expect(api.mascotas.marcarFotoPrincipal(2, foto.id)).rejects.toMatchObject({ estadoHttp: 403 });
    await login(api, 'adoptante@huellitas.co');
    await expect(api.mascotas.eliminarMultimedia(1, foto.id)).rejects.toMatchObject({ estadoHttp: 403 });
    await login(api, 'admin@huellitas.co'); await api.refugios.suspender(1, { motivo: 'Revisión' }); await login(api);
    await expect(api.mascotas.subirMultimedia(1, cuerpo())).rejects.toMatchObject({ estadoHttp: 403 });
    await expect(api.mascotas.marcarFotoPrincipal(1, foto.id)).rejects.toMatchObject({ estadoHttp: 403 });
  });
  it('rechaza archivos vacíos, contenido disfrazado y mascotas inexistentes sin alterar galería', async () => {
    const api = nueva(); await login(api);
    await expect(api.mascotas.subirMultimedia(1, cuerpo('image/png', new Uint8Array()))).rejects.toMatchObject({ estadoHttp: 400 });
    await expect(api.mascotas.subirMultimedia(1, cuerpo('image/png', new TextEncoder().encode('contenido falso')))).rejects.toMatchObject({ estadoHttp: 400 });
    await expect(api.mascotas.subirMultimedia(1, new FormData())).rejects.toMatchObject({ estadoHttp: 400 });
    await expect(api.mascotas.subirMultimedia(999, cuerpo())).rejects.toMatchObject({ estadoHttp: 404 });
    expect((await api.mascotas.obtener(1)).multimedia).toHaveLength(0);
  });
  it('respeta diez archivos incluso con cargas concurrentes y recupera cupo al eliminar', async () => {
    const api = nueva(); await login(api);
    const resultados = await Promise.allSettled(Array.from({ length: 11 }, () => api.mascotas.subirMultimedia(1, cuerpo())));
    expect(resultados.filter(r => r.status === 'fulfilled')).toHaveLength(10);
    expect(resultados.filter(r => r.status === 'rejected')).toHaveLength(1);
    const galeria = (await api.mascotas.obtener(1)).multimedia;
    expect(new Set(galeria.map(a => a.id)).size).toBe(10);
    expect(galeria.filter(a => a.esPrincipal)).toHaveLength(1);
    await api.mascotas.eliminarMultimedia(1, galeria[0]!.id);
    await api.mascotas.subirMultimedia(1, cuerpo());
    expect((await api.mascotas.obtener(1)).multimedia).toHaveLength(10);
  });
});
