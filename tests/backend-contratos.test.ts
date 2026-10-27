import { afterEach, describe, expect, it, vi } from 'vitest';
import { crearApi, AlmacenMemoria, EstadoMascota, NivelRol, TipoVivienda, Sexo, Procedencia } from '../packages/shared/src';
const claims = { sub:'7', email:'prueba@example.com', 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role':'Adoptante' };
const token=`cabecera.${btoa(JSON.stringify(claims))}.firma`;
const perfil={id:7,nombre:'Persona',correo:'prueba@example.com',telefono:'3001234567',fotoUrl:'https://example.com/perfil.jpg',estado:'Activo',fechaRegistro:'2026-01-01T10:00:00',politicaAceptada:'1.0',fechaAceptacionPolitica:'2026-01-01T10:00:00'};
const adoptante={tipoVivienda:'Casa',espacioDisponible:'Patio',presenciaDeNinos:false,otrasMascotas:false,tiempoDisponible:'Tardes',experienciaPrevia:false,porcentajeCompletitud:100};
const resumen={id:4,nombre:'Luna',especie:'Gato',raza:'Criollo',sexo:'Hembra',edadAproximada:0,fotoPrincipal:'https://example.com/foto.jpg',estado:'En Proceso',fechaCreacion:'2026-10-25T10:00:00'};
const pagina={items:[resumen],pagina:1,tamanoPagina:20,totalRegistros:21,totalPaginas:2};
const datos={nombre:'Luna',especieId:2,razaId:5,tamanoId:1,colorId:2,sexo:Sexo.Hembra,edadAproximada:0,descripcion:'Una gata',esterilizada:true,procedencia:Procedencia.Rescate,fechaIngreso:'2026-01-01',temperamentoIds:[1]};
async function preparar(respuestas: unknown[]) {
  const almacen=new AlmacenMemoria();await almacen.guardar(token);
  const fetch=vi.fn();for(const respuesta of respuestas)fetch.mockResolvedValueOnce(Response.json(respuesta));vi.stubGlobal('fetch',fetch);
  return {api:crearApi({urlBase:'http://api.test',almacen}),fetch};
}
afterEach(()=>vi.unstubAllGlobals());
describe('Contratos backend 29bbef0',()=>{
  it('consulta los perfiles versionados, conserva rol del JWT y no inventa refugioId',async()=>{
    const {api,fetch}=await preparar([perfil,adoptante]);const usuario=await api.usuarios.yo();
    expect(usuario).toMatchObject({id:7,rol:{nivel:NivelRol.Adoptante},refugioId:null,politicaAceptada:'1.0',perfil:{tipoVivienda:TipoVivienda.Casa,presenciaDeNinos:false,otrasMascotas:false,experienciaPrevia:false}});
    expect(fetch.mock.calls.map(c=>c[0])).toEqual(['http://api.test/api/v1/Usuarios/perfil','http://api.test/api/v1/Usuarios/perfil-adoptante']);
  });
  it('interpreta perfil incompleto sin convertir null en Casa o false',async()=>{
    const {api}=await preparar([{...adoptante,tipoVivienda:null,presenciaDeNinos:null,porcentajeCompletitud:0}]);
    expect(await api.usuarios.perfilAdoptante()).toMatchObject({tipoVivienda:null,presenciaDeNinos:null,porcentajeCompletitud:0});
  });
  it('guardar datos no toma el mensaje como usuario ni borra la foto existente',async()=>{
    const {api,fetch}=await preparar([perfil,adoptante,{mensaje:'Guardado'},{...perfil,nombre:'Nuevo nombre'},adoptante]);
    expect((await api.usuarios.editarPerfil({nombre:'Nuevo nombre',telefono:'3007654321'})).nombre).toBe('Nuevo nombre');
    const peticion=fetch.mock.calls[2];expect(peticion[1].method).toBe('PUT');expect(JSON.parse(peticion[1].body)).toEqual({nombre:'Nuevo nombre',telefono:'3007654321',fotoUrl:perfil.fotoUrl});
  });
  it('guardar perfil adoptante consulta la completitud calculada por el servidor',async()=>{
    const {api,fetch}=await preparar([{mensaje:'Guardado'},{...adoptante,tipoVivienda:'Apartamento',porcentajeCompletitud:83}]);
    const resultado=await api.usuarios.guardarPerfilAdoptante({tipoVivienda:TipoVivienda.Apartamento,espacioDisponible:'Sala',presenciaDeNinos:false,otrasMascotas:false,tiempoDisponible:'Tardes',experienciaPrevia:false});
    expect(resultado).toMatchObject({tipoVivienda:TipoVivienda.Apartamento,porcentajeCompletitud:83});expect(fetch.mock.calls[0][1].method).toBe('PUT');expect(fetch.mock.calls[1][1].method).toBe('GET');
  });
  it('traduce totalRegistros, estados y sexo del catálogo sin fabricar campos ausentes',async()=>{
    const {api,fetch}=await preparar([pagina]);const resultado=await api.mascotas.buscar({pagina:1,tamanoPagina:20,sexo:Sexo.Macho,tamanoId:1,especieId:2});
    expect(resultado).toMatchObject({total:21,totalPaginas:2,items:[{estado:EstadoMascota.EnProceso,sexo:Sexo.Hembra,edadAproximada:0,tamano:null,refugioId:null,refugioNombre:null,fechaUltimaActualizacion:null}]});
    expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Mascotas?pagina=1&tamanoPagina=20&especieId=2&tamanoId=1&sexo=0');
  });
  it('separa inventario privado y usa su parámetro tamano',async()=>{
    const {api,fetch}=await preparar([pagina]);await api.mascotas.inventario({pagina:2,tamanoPagina:10});expect(fetch.mock.calls[0][0]).toBe('http://api.test/api/v1/Mascotas/refugio/inventario?pagina=2&tamano=10');
  });
  it('no envía filtros públicos que el backend ignora',async()=>{
    const {api,fetch}=await preparar([]);await expect(api.mascotas.buscar({texto:'Luna'})).rejects.toMatchObject({estadoHttp:400});expect(fetch).not.toHaveBeenCalled();
  });
  it('ficha pública transforma fotos y contacto sin inventar catálogos ni refugioId',async()=>{
    const {api}=await preparar([{...resumen,estado:'No Disponible',refugio:'Refugio',refugioTelefono:'3001234567',descripcion:'Gata',esterilizada:true,fotos:['https://example.com/foto.jpg']}]);
    expect(await api.mascotas.obtenerFicha(4)).toMatchObject({id:4,estado:EstadoMascota.NoDisponible,refugioNombre:'Refugio',fotos:['https://example.com/foto.jpg']});
  });
  it('registra solo los campos admitidos y recibe el identificador del POST',async()=>{
    const {api,fetch}=await preparar([{mensaje:'Mascota registrada.',id:9}]);expect(await api.mascotas.registrar(datos)).toEqual({mensaje:'Mascota registrada.',id:9});const cuerpo=JSON.parse(fetch.mock.calls[0][1].body);
    expect(cuerpo).toMatchObject({nombre:'Luna',edadAproximada:0,fotosUrls:[]});expect(cuerpo).not.toHaveProperty('fechaIngreso');expect(cuerpo).not.toHaveProperty('temperamentoIds');
  });
  it('rechaza edades fraccionarias antes de enviar una petición',async()=>{
    const {api,fetch}=await preparar([]);expect(()=>api.mascotas.registrar({...datos,edadAproximada:0.5})).toThrow();expect(fetch).not.toHaveBeenCalled();
  });
  it('cambia estado con PATCH y envía el motivo de eliminación en query',async()=>{
    const {api,fetch}=await preparar([{mensaje:'Estado actualizado'},{mensaje:'Eliminada'}]);await api.mascotas.cambiarEstado(4,{nuevoEstado:EstadoMascota.NoDisponible,motivo:'Tratamiento'});await api.mascotas.eliminar(4,'Retiro temporal');expect(fetch.mock.calls[0][1].method).toBe('PATCH');expect(fetch.mock.calls[1][0]).toBe('http://api.test/api/v1/Mascotas/4?motivo=Retiro+temporal');expect(fetch.mock.calls[1][1].body).toBeUndefined();
  });
  it('bloquea borradores y cargas inexistentes antes de llamar a red',async()=>{
    const {api,fetch}=await preparar([]);expect(()=>api.mascotas.crearBorrador(datos)).toThrow();expect(()=>api.mascotas.subirMultimedia(4,new FormData())).toThrow();expect(()=>api.mascotas.editar(4,{nombre:'Otro'})).toThrow();expect(fetch).not.toHaveBeenCalled();
  });
  it('usa las operaciones de seguridad reales y sus nombres de campos',async()=>{
    const {api,fetch}=await preparar([{mensaje:'Guardado'},{mensaje:'Correo actualizado'},{mensaje:'Desactivado'}]);await api.usuarios.cambiarPassword('actual-prueba','nueva-prueba');await api.usuarios.cambiarCorreo('nuevo@example.com','actual-prueba');await api.usuarios.desactivarCuenta('actual-prueba');expect(fetch.mock.calls.map(c=>[c[0],c[1].method])).toEqual([['http://api.test/api/v1/Usuarios/cambiar-password','PUT'],['http://api.test/api/v1/Usuarios/cambiar-correo','PUT'],['http://api.test/api/v1/Usuarios/desactivar','PATCH']]);expect(JSON.parse(fetch.mock.calls[1][1].body)).toEqual({nuevoCorreo:'nuevo@example.com',passwordActual:'actual-prueba'});
  });
});
