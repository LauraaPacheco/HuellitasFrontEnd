import { describe, expect, it } from 'vitest';
import { crearApi, AlmacenMemoria, EstadoMascota, Procedencia, Sexo, validarMascota, type CrearMascotaDto } from '../packages/shared/src';
const datos: CrearMascotaDto = { nombre: '  Coco  ', especieId: 1, razaId: 2, tamanoId: 2, colorId: 3, sexo: Sexo.Macho, edadAproximada: 0.5, esterilizada: false, procedencia: Procedencia.Rescate, fechaIngreso: '2026-01-20', temperamentoIds: [1, 4], descripcion: 'Cariñoso' };
const nueva = () => crearApi({ modoDemo: true, urlBase: '', almacen: new AlmacenMemoria() });
async function login(api: ReturnType<typeof nueva>, correo = 'refugio@huellitas.co') { await api.autenticacion.login({ correo, contrasena: 'Demo1234' }); }
describe('HU-MAS-01 gestión de mascotas', () => {
  it('valida nombre, catálogos, enums, edad cero y fechas reales', () => {
    expect(validarMascota(datos)).toEqual({});
    expect(validarMascota({ ...datos, edadAproximada: 0 })).toEqual({});
    expect(validarMascota({ ...datos, nombre: ' ', especieId: 0, edadAproximada: -1, fechaIngreso: '2026-02-30' })).toMatchObject({ nombre: expect.any(String), especieId: expect.any(String), edadAproximada: expect.any(String), fechaIngreso: expect.any(String) });
    expect(validarMascota({ ...datos, fechaIngreso: '2999-01-01', sexo: 99 })).toMatchObject({ fechaIngreso: expect.any(String), sexo: expect.any(String) });
  });
  it('crea una mascota, la consulta y la incluye en la búsqueda sin alterar los datos globales', async () => {
    const api = nueva(); await login(api);
    const creada = await api.mascotas.crear({ ...datos, refugioId: 3, estado: EstadoMascota.Adoptada } as CrearMascotaDto);
    expect(creada).toMatchObject({ nombre: 'Coco', refugioId: 1, estado: EstadoMascota.Disponible, edadAproximada: 0.5, multimedia: [] });
    expect((await api.mascotas.obtener(creada.id)).nombre).toBe('Coco');
    const lista = await api.mascotas.buscar({ texto: 'Coco' }); expect(lista.total).toBe(1); expect(lista.items[0]?.id).toBe(creada.id);
    expect((await nueva().mascotas.buscar({ texto: 'Coco' })).total).toBe(0);
  });
  it('no permite publicar a visitantes, adoptantes ni administradores', async () => {
    const api = nueva(); await expect(api.mascotas.crear(datos)).rejects.toMatchObject({ estadoHttp: 401 });
    for (const correo of ['adoptante@huellitas.co', 'admin@huellitas.co']) {
      await login(api, correo); await expect(api.mascotas.crear(datos)).rejects.toMatchObject({ estadoHttp: 403 });
    }
  });
  it('un refugio suspendido no puede publicar ni editar', async () => {
    const api = nueva(); await login(api, 'admin@huellitas.co'); await api.refugios.suspender(1, { motivo: 'Revisión' }); await login(api);
    await expect(api.mascotas.crear(datos)).rejects.toMatchObject({ estadoHttp: 403 });
    await expect(api.mascotas.editar(1, { nombre: 'Otro' })).rejects.toMatchObject({ estadoHttp: 403 });
  });
  it('rechaza raza de otra especie y opciones inexistentes sin crear datos', async () => {
    const api = nueva(); await login(api); const antes = (await api.mascotas.buscar()).total;
    for (const cambio of [{ razaId: 5 }, { colorId: 999 }, { temperamentoIds: [999] }, { nombre: ' ' }]) {
      await expect(api.mascotas.crear({ ...datos, ...cambio })).rejects.toMatchObject({ estadoHttp: 400 });
    }
    expect((await api.mascotas.buscar()).total).toBe(antes);
  });
  it('edita datos, permite limpiar opcionales y protege propietario y estado', async () => {
    const api = nueva(); await login(api); const creada = await api.mascotas.crear(datos);
    const editada = await api.mascotas.editar(creada.id, { nombre: 'Nuevo nombre', razaId: undefined, edadAproximada: undefined, descripcion: '', refugioId: 3, estado: EstadoMascota.Adoptada } as CrearMascotaDto);
    expect(editada).toMatchObject({ nombre: 'Nuevo nombre', razaId: null, edadAproximada: null, descripcion: null, refugioId: 1, estado: EstadoMascota.Disponible });
    expect(editada.fechaModificacion).toBeTruthy();
    await expect(api.mascotas.editar(2, { nombre: 'Ajeno' })).rejects.toMatchObject({ estadoHttp: 403 });
    expect((await api.mascotas.buscar({ refugioId: 3 })).total).toBe(0);
    expect((await api.mascotas.buscar()).items.every(m => m.refugioId === 1)).toBe(true);
  });
  it('baja requiere motivo, conserva ficha y permite volver a disponible', async () => {
    const api = nueva(); await login(api); const creada = await api.mascotas.crear(datos);
    await expect(api.mascotas.cambiarEstado(creada.id, { nuevoEstado: EstadoMascota.NoDisponible, motivo: ' ' })).rejects.toMatchObject({ estadoHttp: 400 });
    await api.mascotas.eliminar(creada.id, '  Tratamiento médico  ');
    expect(await api.mascotas.obtener(creada.id)).toMatchObject({ activo: true, estado: EstadoMascota.NoDisponible, motivoBaja: 'Tratamiento médico' });
    expect((await api.mascotas.buscar({ estado: EstadoMascota.NoDisponible })).items.some(m => m.id === creada.id)).toBe(true);
    await api.mascotas.cambiarEstado(creada.id, { nuevoEstado: EstadoMascota.Disponible });
    expect(await api.mascotas.obtener(creada.id)).toMatchObject({ estado: EstadoMascota.Disponible, motivoBaja: null });
  });
  it('impide saltar el proceso de adopción y cambios sobre mascotas ajenas', async () => {
    const api = nueva(); await login(api);
    await expect(api.mascotas.cambiarEstado(1, { nuevoEstado: EstadoMascota.Adoptada })).rejects.toMatchObject({ estadoHttp: 409 });
    await expect(api.mascotas.cambiarEstado(1, { nuevoEstado: EstadoMascota.EnProceso })).rejects.toMatchObject({ estadoHttp: 409 });
    await expect(api.mascotas.cambiarEstado(2, { nuevoEstado: EstadoMascota.NoDisponible, motivo: 'Ajeno' })).rejects.toMatchObject({ estadoHttp: 403 });
    await expect(api.mascotas.cambiarEstado(7, { nuevoEstado: EstadoMascota.Disponible })).rejects.toMatchObject({ estadoHttp: 409 });
    await expect(api.mascotas.obtener(9999)).rejects.toMatchObject({ estadoHttp: 404 });
  });
});

describe('Publicación por pasos', () => {
  it('guarda un borrador privado y solo lo hace disponible al publicar', async () => {
    const api = nueva(); await login(api);
    const borrador = await api.mascotas.crearBorrador(datos);
    expect(borrador.estado).toBe(EstadoMascota.Borrador);
    expect((await api.mascotas.buscar({ estado: EstadoMascota.Borrador })).items.some(m => m.id === borrador.id)).toBe(true);
    await api.autenticacion.logout('demo');
    await expect(api.mascotas.obtener(borrador.id)).rejects.toMatchObject({ estadoHttp: 404 });
    expect((await api.mascotas.buscar({ texto: 'Coco' })).total).toBe(0);
    await login(api, 'adoptante@huellitas.co');
    expect((await api.mascotas.buscar({ estado: EstadoMascota.Borrador })).total).toBe(0);
    await expect(api.mascotas.obtener(borrador.id)).rejects.toMatchObject({ estadoHttp: 404 });
    await expect(api.mascotas.publicar(borrador.id)).rejects.toMatchObject({ estadoHttp: 403 });
    await login(api);
    await api.mascotas.editar(borrador.id, { nombre: 'Coco actualizado' });
    expect((await api.mascotas.obtener(borrador.id)).estado).toBe(EstadoMascota.Borrador);
    await api.mascotas.publicar(borrador.id);
    await expect(api.mascotas.publicar(borrador.id)).rejects.toMatchObject({ estadoHttp: 409 });
    await api.autenticacion.logout('demo');
    expect(await api.mascotas.obtener(borrador.id)).toMatchObject({ nombre: 'Coco actualizado', estado: EstadoMascota.Disponible });
  });
  it('rechaza la publicación de un refugio suspendido y los saltos de estado de un borrador', async () => {
    const api = nueva(); await login(api); const borrador = await api.mascotas.crearBorrador(datos);
    await expect(api.mascotas.cambiarEstado(borrador.id, { nuevoEstado: EstadoMascota.Disponible })).rejects.toMatchObject({ estadoHttp: 409 });
    await login(api, 'admin@huellitas.co');
    await expect(api.mascotas.publicar(borrador.id)).rejects.toMatchObject({ estadoHttp: 403 });
    await api.refugios.suspender(1, { motivo: 'Revisión' }); await login(api);
    await expect(api.mascotas.publicar(borrador.id)).rejects.toMatchObject({ estadoHttp: 403 });
    expect((await api.mascotas.obtener(borrador.id)).estado).toBe(EstadoMascota.Borrador);
  });
});
