/**
 * Cliente que responde con datos simulados en vez de llamar al backend.
 *
 * Extiende ClienteApi y sobrescribe unicamente peticion(): como get, post,
 * put y delete pasan todos por ahi, con eso basta. Los servicios no se
 * enteran del cambio.
 */

import { ClienteApi, ErrorHttp, type ConfiguracionCliente } from '../api/client';
import type { Usuario, PerfilAdoptanteDto, EditarPerfilDto } from '../types/usuarios';
import { validarRefugio, normalizarRefugio } from '../utils/refugios';
import type { Refugio, SolicitudRefugioDto, EditarRefugioDto } from '../types/refugios';
import { validarDatosPersonales, validarPerfilAdoptante } from '../utils/perfil';
import { EstadoMascota, EstadoVerificacion, NivelRol, TipoMultimedia } from '../types/enums';
import { validarArchivoMascota, coincideFirmaArchivo, esFoto, MAX_ARCHIVOS_MASCOTA } from '../utils/multimedia';
import { validarMascota, estadosManualesMascota } from '../utils/mascotas';
import type { Mascota, MascotaResumen, CrearMascotaDto, EditarMascotaDto, CambioEstadoMascotaDto } from '../types/mascotas';
import type { Paginado } from '../types/comun';
import {
  COLORES,
  CONTRASENA_DEMO,
  ESPECIES,
  RAZAS,
  REFUGIOS,
  REPORTES,
  TAMANOS,
  TEMPERAMENTOS,
  USUARIOS_DEMO,
  lineaTiempo,
  mascotaCompleta,
  mascotasResumen,
  solicitudCompleta,
  solicitudesResumen,
  usuarioDemo,
} from './datos';

/** Simula la latencia de una red real, para que la UI muestre sus estados de carga. */
const RETARDO_MS = 320;

function esperar<T>(valor: T): Promise<T> {
  return new Promise((resolver) => setTimeout(() => resolver(valor), RETARDO_MS));
}

function paginar<T>(items: readonly T[], pagina = 1, tamano = 20): Paginado<T> {
  const inicio = (pagina - 1) * tamano;
  return {
    items: items.slice(inicio, inicio + tamano),
    pagina,
    tamanoPagina: tamano,
    total: items.length,
    totalPaginas: Math.max(1, Math.ceil(items.length / tamano)),
  };
}

interface OpcionesPeticion {
  readonly metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly cuerpo?: unknown;
  readonly parametros?: Record<string, unknown>;
  readonly senal?: AbortSignal;
}

export class ClienteDemo extends ClienteApi {
  /** Nivel del usuario con sesion iniciada; null si nadie entro. */
  private nivelActual: NivelRol | null = null;
  private readonly refugios: Refugio[] = REFUGIOS.map(r => ({ ...r, requisitos: [...r.requisitos] }));
  private readonly mascotas: Mascota[] = mascotasResumen().map(m => mascotaCompleta(m.id)!);
  private recuperacionSolicitada = false;
  private recuperacionUsada = false;
  private readonly usuariosEditados = new Map<NivelRol, Usuario>();
  private readonly almacenDemo: ConfiguracionCliente['almacen'];

  private usuarioActual(): Usuario {
    if (this.nivelActual === null) throw new ErrorHttp({ titulo: 'Sesión no iniciada', estadoHttp: 401 });
    return this.usuariosEditados.get(this.nivelActual) ?? usuarioDemo(this.nivelActual);
  }

  private exigirPropietario(mascota?: Mascota) {
    const usuario = this.usuarioActual();
    const refugio = this.refugios.find(r => r.id === usuario.refugioId);
    if (usuario.rol.nivel !== NivelRol.Refugio || !refugio || !refugio.activo || refugio.estadoVerificacion !== EstadoVerificacion.Verificado || (mascota && mascota.refugioId !== refugio.id)) {
      throw new ErrorHttp({ titulo: 'Solo el refugio verificado propietario puede gestionar esta mascota.', estadoHttp: 403 });
    }
    return refugio;
  }

  private async subirArchivoDemo(id: number, cuerpo: unknown) {
    const indice = this.mascotas.findIndex(m => m.id === id && m.activo);
    const inicial = this.mascotas[indice];
    if (!inicial) throw new ErrorHttp({ titulo: 'No encontramos esa mascota.', estadoHttp: 404 });
    this.exigirPropietario(inicial);
    const archivo = cuerpo instanceof FormData ? cuerpo.get('archivo') : null;
    if (!(archivo instanceof Blob)) throw new ErrorHttp({ titulo: 'Selecciona un archivo.', estadoHttp: 400 });
    const error = validarArchivoMascota(archivo);
    if (error) throw new ErrorHttp({ titulo: error, estadoHttp: 400 });
    const bytes = new Uint8Array(await archivo.arrayBuffer());
    if (!coincideFirmaArchivo(archivo.type, bytes)) throw new ErrorHttp({ titulo: 'El contenido no coincide con el formato del archivo.', estadoHttp: 400 });
    // Volver a validar después de leer: evita superar el límite con cargas concurrentes.
    const mascota = this.mascotas[indice]!;
    this.exigirPropietario(mascota);
    const activos = mascota.multimedia.filter(a => a.activo);
    if (activos.length >= MAX_ARCHIVOS_MASCOTA) throw new ErrorHttp({ titulo: 'La mascota ya tiene 10 archivos. Elimina uno antes de cargar otro.', estadoHttp: 409 });
    let binario = '';
    for (let i = 0; i < bytes.length; i += 8192) binario += String.fromCharCode(...bytes.subarray(i, i + 8192));
    const ahora = new Date().toISOString();
    const nuevo = { id: Math.max(...this.mascotas.flatMap(m => m.multimedia.map(a => a.id)), 0) + 1,
      activo: true, fechaCreacion: ahora, fechaModificacion: null, mascotaId: id, reporteId: null, seguimientoId: null,
      tipo: esFoto(archivo.type) ? TipoMultimedia.Foto : TipoMultimedia.Video,
      archivo: `data:${archivo.type};base64,${btoa(binario)}`, fechaCarga: ahora,
      esPrincipal: esFoto(archivo.type) && !activos.some(a => a.tipo === TipoMultimedia.Foto && a.esPrincipal) };
    this.mascotas[indice] = { ...mascota, multimedia: [...mascota.multimedia, nuevo], fechaModificacion: ahora, fechaUltimaActualizacion: ahora };
    return nuevo;
  }

  constructor(config: ConfiguracionCliente) {
    super(config);
    this.almacenDemo = config.almacen;
  }

  override async peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    // Al reabrir la app, recupera también el contexto del cliente demo.
    if (this.nivelActual === null && !ruta.includes('/Auth/')) {
      const token = await this.almacenDemo.obtener();
      const id = /^demo\.access\.(\d+)\./.exec(token ?? '')?.[1];
      const cuenta = USUARIOS_DEMO.find(u => usuarioDemo(u.rol).id === Number(id));
      if (cuenta) this.nivelActual = cuenta.rol;
    }
    const { metodo = 'GET', cuerpo, parametros } = opciones;
    const carga = /^\/api\/mascotas\/(\d+)\/multimedia$/.exec(ruta);
    const respuesta = carga && metodo === 'POST' ? await this.subirArchivoDemo(Number(carga[1]), cuerpo) : this.resolver(ruta, metodo, cuerpo, parametros);
    return esperar(respuesta) as Promise<T>;
  }

  private resolver(
    ruta: string,
    metodo: string,
    cuerpo: unknown,
    parametros: Record<string, unknown> | undefined,
  ): unknown {
    const pagina = Number(parametros?.pagina ?? 1);
    const tamano = Number(parametros?.tamanoPagina ?? 20);

    /* ---------- Autenticacion ---------- */

    // El demo responde con las MISMAS formas que el backend real, para que
    // la traduccion de ../api/sesion.ts se ejercite igual en los dos modos.

    if (ruta.endsWith('/Auth/login') && metodo === 'POST') {
      const datos = cuerpo as { correo?: string; contrasena?: string };
      const encontrado = USUARIOS_DEMO.find(
        (u) => u.correo.toLowerCase() === datos.correo?.trim().toLowerCase(),
      );

      if (!encontrado || datos.contrasena !== CONTRASENA_DEMO) {
        throw new ErrorHttp({
          titulo: 'El correo o la contraseña no coinciden',
          estadoHttp: 401,
        });
      }

      this.nivelActual = encontrado.rol;
      const usuario = this.usuarioActual();
      return {
        accessToken: `demo.access.${usuario.id}.${Date.now()}`,
        refreshToken: `demo.refresh.${Date.now()}`,
        expiraEnSegundos: 900,
        nombre: usuario.nombre,
        rol: usuario.rol.nombre,
      };
    }

    if (ruta.endsWith('/Auth/refresh') && metodo === 'POST') {
      if (this.nivelActual === null) {
        throw new ErrorHttp({ titulo: 'Sesión no iniciada', estadoHttp: 401 });
      }
      const usuario = this.usuarioActual();
      return {
        accessToken: `demo.access.${usuario.id}.${Date.now()}`,
        refreshToken: `demo.refresh.${Date.now()}`,
        expiraEnSegundos: 900,
        nombre: usuario.nombre,
        rol: usuario.rol.nombre,
      };
    }

    if (ruta.endsWith('/Auth/logout')) {
      this.nivelActual = null;
      return undefined;
    }

    if (ruta.endsWith('/v1/Usuarios') && metodo === 'POST') {
      return { mensaje: 'Usuario registrado. Revisa tu correo.', usuarioId: 99 };
    }

    // Para poder ver las dos caras de la pantalla de confirmacion sin
    // backend: cualquier token sirve menos el literal 'vencido'.
    if (ruta.endsWith('/Usuarios/confirmar')) {
      const token = String(parametros?.token ?? '');
      if (!token || token === 'vencido') {
        throw new ErrorHttp({
          titulo: 'El enlace ya no sirve',
          estadoHttp: 400,
          detalle: 'El enlace de confirmación venció o ya fue usado.',
        });
      }
      return undefined;
    }

    if (ruta.endsWith('/Usuarios/reenviar-verificacion')) return undefined;

    if (ruta.endsWith('/Usuarios/recuperar') && metodo === 'POST') {
      this.recuperacionSolicitada = true;
      this.recuperacionUsada = false;
      return undefined;
    }
    if (ruta.endsWith('/Usuarios/restablecer') && metodo === 'POST') {
      const datos = cuerpo as { token?: string; nuevaContrasena?: string };
      if (!this.recuperacionSolicitada || this.recuperacionUsada || datos.token !== 'demo-recuperacion') {
        throw new ErrorHttp({ titulo: 'El token no es válido, venció o ya fue utilizado.', estadoHttp: 400 });
      }
      if (!datos.nuevaContrasena || datos.nuevaContrasena.length < 8 || datos.nuevaContrasena.length > 100) {
        throw new ErrorHttp({ titulo: 'La contraseña debe tener entre 8 y 100 caracteres.', estadoHttp: 400 });
      }
      this.recuperacionUsada = true;
      return undefined;
    }

    /* ---------- Registro de refugio ---------- */

    if (ruta.endsWith('/refugios/solicitar-registro') && metodo === 'POST') {
      const datos = cuerpo as SolicitudRefugioDto;
      const error = validarRefugio(datos);
      if (error) throw new ErrorHttp({ titulo: error, estadoHttp: 400 });
      if (this.refugios.some(r => r.nit.replace(/[^0-9]/g, '') === datos.nit.replace(/[^0-9]/g, ''))) {
        throw new ErrorHttp({ titulo: 'Ya existe una solicitud con ese NIT.', estadoHttp: 409 });
      }
      const nuevo: Refugio = {
        ...normalizarRefugio(datos), id: Math.max(...this.refugios.map(r => r.id), 0) + 1,
        activo: true, fechaCreacion: new Date().toISOString(), fechaModificacion: null,
        redesSociales: datos.redesSociales?.trim() ?? null, descripcion: datos.descripcion?.trim() ?? null,
        estadoVerificacion: EstadoVerificacion.Pendiente, fechaVerificacion: null,
        motivoRechazo: null, promedioCalificacion: null, totalAdopciones: 0, requisitos: [],
      };
      this.refugios.push(nuevo);
      return nuevo;
    }

    /* ---------- Usuario de la sesion ---------- */

    if (ruta.endsWith('/usuarios/yo/datos-personales') && metodo === 'GET') {
      return this.usuarioActual();
    }

    if (ruta.endsWith('/usuarios/yo/perfil-adoptante') && metodo === 'PUT') {
      const usuario = this.usuarioActual();
      if (usuario.rol.nivel !== NivelRol.Adoptante) {
        throw new ErrorHttp({ titulo: 'Solo los adoptantes pueden editar este perfil', estadoHttp: 403 });
      }
      const datos = cuerpo as PerfilAdoptanteDto;
      const errores = validarPerfilAdoptante(datos);
      if (Object.keys(errores).length) throw new ErrorHttp({ titulo: 'Revisa tu perfil de adoptante', estadoHttp: 400 });
      const ahora = new Date().toISOString();
      const perfil = {
        id: usuario.perfil?.id ?? usuario.id,
        usuarioId: usuario.id,
        activo: true,
        fechaCreacion: usuario.perfil?.fechaCreacion ?? ahora,
        fechaModificacion: ahora,
        ...datos,
        espacioDisponible: datos.espacioDisponible.trim(),
        tiempoDisponible: datos.tiempoDisponible.trim(),
        porcentajeCompletitud: 100,
      };
      this.usuariosEditados.set(this.nivelActual!, { ...usuario, perfil, fechaModificacion: ahora });
      return perfil;
    }

    if (ruta.endsWith('/usuarios/yo')) {
      const usuario = this.usuarioActual();
      if (metodo === 'GET') return usuario;
      if (metodo === 'PUT') {
        const datos = cuerpo as EditarPerfilDto;
        const nuevos = { nombre: datos.nombre ?? usuario.nombre, telefono: datos.telefono ?? usuario.telefono ?? '' };
        if (Object.keys(validarDatosPersonales(nuevos)).length) throw new ErrorHttp({ titulo: 'Revisa tus datos personales', estadoHttp: 400 });
        const actualizado = {
          ...usuario,
          nombre: nuevos.nombre.trim(),
          telefono: nuevos.telefono.replace(/\s|-/g, ''),
          fechaModificacion: new Date().toISOString(),
        };
        this.usuariosEditados.set(this.nivelActual!, actualizado);
        return actualizado;
      }
    }

    /* ---------- Catalogos ---------- */

    if (ruta.endsWith('/v1/Catalogos/especies')) return ESPECIES;
    if (ruta.endsWith('/v1/Catalogos/razas')) {
      const especieId = parametros?.especieId;
      return Number(especieId) > 0 ? RAZAS.filter((r) => r.especieId === Number(especieId)) : [];
    }
    if (ruta.endsWith('/v1/Catalogos/tamanos')) return TAMANOS;
    if (ruta.endsWith('/v1/Catalogos/colores')) return COLORES;
    if (ruta.endsWith('/v1/Catalogos/temperamentos')) return TEMPERAMENTOS;

    /* ---------- Mascotas ---------- */

    if (ruta.endsWith('/match/recomendadas')) {
      return mascotasResumen().slice(0, 3);
    }

    const exigirRefugio = (mascota?: Mascota) => this.exigirPropietario(mascota);
    const preparar = (datos: CrearMascotaDto, anterior?: Mascota) => {
      const errores = validarMascota(datos);
      if (Object.keys(errores).length) throw new ErrorHttp({ titulo: 'Revisa los datos de la mascota.', estadoHttp: 400, errores: Object.fromEntries(Object.entries(errores).map(([k,v]) => [k, [v]])) });
      const valido = (opciones: readonly { id: number; activo: boolean }[], id: number, previo?: number) => opciones.some(o => o.id === id && (o.activo || id === previo));
      if (!valido(ESPECIES, datos.especieId, anterior?.especieId) || !valido(TAMANOS, datos.tamanoId, anterior?.tamanoId) || !valido(COLORES, datos.colorId, anterior?.colorId) ||
          (datos.razaId !== undefined && !RAZAS.some(r => r.id === datos.razaId && r.especieId === datos.especieId && (r.activo || r.id === anterior?.razaId))) ||
          datos.temperamentoIds.some(id => !valido(TEMPERAMENTOS, id, anterior?.temperamentos.find(t => t.id === id)?.id))) {
        throw new ErrorHttp({ titulo: 'Revisa los catálogos: la raza debe corresponder a la especie y las opciones deben estar activas.', estadoHttp: 400 });
      }
      // Campos explícitos: el cuerpo no puede asignar propietario, estado ni multimedia.
      return { nombre: datos.nombre.trim(), especieId: datos.especieId, razaId: datos.razaId ?? null,
        tamanoId: datos.tamanoId, colorId: datos.colorId, sexo: datos.sexo,
        edadAproximada: datos.edadAproximada ?? null, descripcion: datos.descripcion?.trim() || null,
        esterilizada: datos.esterilizada, procedencia: datos.procedencia, fechaIngreso: datos.fechaIngreso,
        temperamentos: TEMPERAMENTOS.filter(t => datos.temperamentoIds.includes(t.id)) };
    };
    const accionArchivo = /^\/api\/mascotas\/(\d+)\/multimedia\/(\d+)(\/principal)?$/.exec(ruta);
    if (accionArchivo) {
      const indice = this.mascotas.findIndex(m => m.id === Number(accionArchivo[1]) && m.activo);
      const mascota = this.mascotas[indice];
      if (!mascota) throw new ErrorHttp({ titulo: 'No encontramos esa mascota.', estadoHttp: 404 });
      exigirRefugio(mascota);
      const archivo = mascota.multimedia.find(a => a.id === Number(accionArchivo[2]) && a.activo);
      if (!archivo) throw new ErrorHttp({ titulo: 'No encontramos ese archivo.', estadoHttp: 404 });
      const principal = !!accionArchivo[3];
      if ((principal && metodo !== 'PUT') || (!principal && metodo !== 'DELETE')) throw new ErrorHttp({ titulo: 'Operación no disponible.', estadoHttp: 405 });
      if (principal && archivo.tipo !== TipoMultimedia.Foto) throw new ErrorHttp({ titulo: 'La portada debe ser una foto.', estadoHttp: 400 });
      const ahora = new Date().toISOString();
      let multimedia = mascota.multimedia.map(a => principal ? { ...a, esPrincipal: a.activo && a.id === archivo.id }
        : a.id === archivo.id ? { ...a, activo: false, esPrincipal: false, fechaModificacion: ahora } : a);
      if (!principal && archivo.esPrincipal) {
        const siguiente = multimedia.find(a => a.activo && a.tipo === TipoMultimedia.Foto);
        if (siguiente) multimedia = multimedia.map(a => ({ ...a, esPrincipal: a.id === siguiente.id }));
      }
      this.mascotas[indice] = { ...mascota, multimedia, fechaModificacion: ahora, fechaUltimaActualizacion: ahora };
      return undefined;
    }

    const publicacion = /^\/api\/mascotas\/(\d+)\/publicar$/.exec(ruta);
    if (publicacion && metodo === 'POST') {
      const indice = this.mascotas.findIndex(m => m.id === Number(publicacion[1]) && m.activo);
      const mascota = this.mascotas[indice];
      if (!mascota) throw new ErrorHttp({ titulo: 'No encontramos esa mascota.', estadoHttp: 404 });
      exigirRefugio(mascota);
      if (mascota.estado !== EstadoMascota.Borrador) throw new ErrorHttp({ titulo: 'La mascota ya fue publicada. Actualiza el listado.', estadoHttp: 409 });
      preparar({ ...mascota, razaId: mascota.razaId ?? undefined, descripcion: mascota.descripcion ?? undefined,
        edadAproximada: mascota.edadAproximada ?? undefined, temperamentoIds: mascota.temperamentos.map(t => t.id) });
      const ahora = new Date().toISOString();
      const publicada = { ...mascota, estado: EstadoMascota.Disponible, fechaModificacion: ahora, fechaUltimaActualizacion: ahora };
      this.mascotas[indice] = publicada;
      return { ...publicada, multimedia: publicada.multimedia.filter(a => a.activo) };
    }

    const coincideMascota = /\/api\/mascotas\/(\d+)(?:\/(estado))?$/.exec(ruta);
    if (coincideMascota) {
      const indice = this.mascotas.findIndex(m => m.id === Number(coincideMascota[1]));
      const mascota = this.mascotas[indice];
      if (!mascota || !mascota.activo) throw new ErrorHttp({ titulo: 'No encontramos esa mascota.', estadoHttp: 404 });
      if (metodo === 'GET' && !coincideMascota[2]) {
        if (mascota.estado === EstadoMascota.Borrador && this.nivelActual !== NivelRol.Administrador && !(this.nivelActual === NivelRol.Refugio && this.usuarioActual().refugioId === mascota.refugioId)) throw new ErrorHttp({ titulo: 'Esta ficha todavía no está publicada.', estadoHttp: 404 });
        return { ...mascota, multimedia: mascota.multimedia.filter(a => a.activo) };
      }
      exigirRefugio(mascota);
      const ahora = new Date().toISOString();
      if (metodo === 'DELETE' || (metodo === 'PUT' && coincideMascota[2])) {
        const datos = cuerpo as CambioEstadoMascotaDto;
        const estado = metodo === 'DELETE' ? EstadoMascota.NoDisponible : datos.nuevoEstado;
        if (!estadosManualesMascota(mascota.estado).includes(estado)) throw new ErrorHttp({ titulo: 'Este cambio debe gestionarse desde el proceso de adopción o el estado ya cambió.', estadoHttp: 409 });
        if (estado === EstadoMascota.NoDisponible && !datos.motivo?.trim()) throw new ErrorHttp({ titulo: 'Escribe el motivo de la baja.', estadoHttp: 400 });
        this.mascotas[indice] = { ...mascota, estado, motivoBaja: estado === EstadoMascota.NoDisponible ? datos.motivo!.trim() : null, fechaModificacion: ahora, fechaUltimaActualizacion: ahora };
        return undefined;
      }
      if (metodo === 'PUT') {
        const cambios = cuerpo as EditarMascotaDto;
        const completos: CrearMascotaDto = { ...mascota, razaId: mascota.razaId ?? undefined, edadAproximada: mascota.edadAproximada ?? undefined, descripcion: mascota.descripcion ?? undefined, temperamentoIds: mascota.temperamentos.map(t => t.id), ...cambios };
        const actualizada = { ...mascota, ...preparar(completos, mascota), fechaModificacion: ahora, fechaUltimaActualizacion: ahora };
        this.mascotas[indice] = actualizada;
        return actualizada;
      }
    }

    if ((ruta.endsWith('/api/mascotas') || ruta.endsWith('/api/mascotas/borradores')) && metodo === 'POST') {
      const refugio = exigirRefugio();
      const campos = preparar(cuerpo as CrearMascotaDto);
      const ahora = new Date().toISOString();
      const nueva: Mascota = { ...campos, id: Math.max(...this.mascotas.map(m => m.id), 0) + 1,
        activo: true, fechaCreacion: ahora, fechaModificacion: null, refugioId: refugio.id,
        estado: ruta.endsWith('/borradores') ? EstadoMascota.Borrador : EstadoMascota.Disponible, fechaUltimaActualizacion: ahora, motivoBaja: null, multimedia: [], historialClinico: [] };
      this.mascotas.push(nueva);
      return nueva;
    }
    if (ruta.endsWith('/api/mascotas') && metodo === 'GET') {
      let mascotas = this.mascotas.filter(m => m.activo);
      if (this.nivelActual !== NivelRol.Refugio && this.nivelActual !== NivelRol.Administrador) mascotas = mascotas.filter(m => m.estado !== EstadoMascota.Borrador);
      if (this.nivelActual === NivelRol.Refugio) mascotas = mascotas.filter(m => m.refugioId === this.usuarioActual().refugioId);
      if (parametros?.refugioId !== undefined) mascotas = mascotas.filter(m => m.refugioId === Number(parametros.refugioId));
      for (const campo of ['especieId', 'razaId', 'tamanoId', 'sexo', 'estado'] as const) {
        if (parametros?.[campo] !== undefined) mascotas = mascotas.filter(m => m[campo] === Number(parametros[campo]));
      }
      const texto = String(parametros?.texto ?? '').toLowerCase();
      let lista: MascotaResumen[] = mascotas.map(m => {
        const refugio = this.refugios.find(r => r.id === m.refugioId)!;
        return { id: m.id, nombre: m.nombre, especie: ESPECIES.find(e => e.id === m.especieId)!.nombre,
          raza: RAZAS.find(r => r.id === m.razaId)?.nombre ?? null, tamano: TAMANOS.find(t => t.id === m.tamanoId)!.nombre,
          sexo: m.sexo, edadAproximada: m.edadAproximada, estado: m.estado,
          fotoPrincipal: m.multimedia.find(a => a.activo && a.esPrincipal)?.archivo ?? mascotasResumen().find(a => a.id === m.id)?.fotoPrincipal ?? null,
          refugioId: refugio.id, refugioNombre: refugio.nombre, refugioVerificado: refugio.estadoVerificacion === EstadoVerificacion.Verificado,
          fechaUltimaActualizacion: m.fechaUltimaActualizacion, puntajeCompatibilidad: null };
      });
      if (texto) lista = lista.filter(m => [m.nombre, m.raza, m.especie].some(v => v?.toLowerCase().includes(texto)));
      return paginar(lista, pagina, tamano);
    }

    if (ruta.endsWith('/api/favoritos')) return [];

    /* ---------- Solicitudes ---------- */

    const coincideLinea = /\/solicitudes\/(\d+)\/linea-tiempo$/.exec(ruta);
    if (coincideLinea) return lineaTiempo(Number(coincideLinea[1]));

    if (ruta.endsWith('/solicitudes/mias')) {
      // El adoptante demo tiene una sola solicitud en curso.
      return solicitudesResumen().filter((s) => s.id === 1);
    }

    if (ruta.endsWith('/solicitudes/validar')) {
      return { puedeContinuar: true, faltantes: [] };
    }

    const coincideSolicitud = /\/api\/solicitudes\/(\d+)$/.exec(ruta);
    if (coincideSolicitud) {
      const solicitud = solicitudCompleta(Number(coincideSolicitud[1]));
      if (!solicitud) {
        throw new ErrorHttp({ titulo: 'No encontramos esa solicitud', estadoHttp: 404 });
      }
      return solicitud;
    }

    if (ruta.endsWith('/api/solicitudes')) {
      if (metodo === 'POST') return solicitudCompleta(1);
      let lista = solicitudesResumen();
      if (parametros?.estado !== undefined && parametros.estado !== '') {
        lista = lista.filter((s) => s.estado === Number(parametros.estado));
      }
      return paginar(lista, pagina, tamano);
    }

    /* ---------- Reportes ---------- */

    if (ruta.endsWith('/reportes/canales-denuncia')) {
      return [
        'Policía Nacional — línea 123',
        'Secretaría de Salud Pública de Cali',
        'Fiscalía General de la Nación',
      ];
    }

    if (ruta.endsWith('/reportes/mios')) return REPORTES.slice(0, 2);
    if (ruta.endsWith('/reportes/mapa')) return REPORTES;

    if (ruta.endsWith('/api/reportes')) {
      if (metodo === 'POST') {
        const numero = `REP-0${190 + Math.floor(Math.random() * 9)}`;
        return { ...REPORTES[0], id: 99, numeroReporte: numero };
      }
      return paginar(REPORTES, pagina, tamano);
    }

    /* ---------- Refugios ---------- */

    const coincideRefugio = /\/api\/refugios\/(\d+)(?:\/(verificar|rechazar|suspender|requisitos)(?:\/(\d+))?)?$/.exec(ruta);
    if (coincideRefugio) {
      const indice = this.refugios.findIndex(r => r.id === Number(coincideRefugio[1]));
      const refugio = this.refugios[indice];
      if (!refugio) throw new ErrorHttp({ titulo: 'No encontramos ese refugio', estadoHttp: 404 });
      const accion = coincideRefugio[2];
      const esAdmin = this.nivelActual === NivelRol.Administrador;
      const esPropio = this.nivelActual === NivelRol.Refugio && this.usuarioActual().refugioId === refugio.id;
      if (metodo === 'GET') {
        if (refugio.estadoVerificacion !== EstadoVerificacion.Verificado && !esAdmin && !esPropio) {
          throw new ErrorHttp({ titulo: 'Este refugio no tiene un perfil público verificado.', estadoHttp: 403 });
        }
        return accion === 'requisitos' ? refugio.requisitos : refugio;
      }
      if (accion && ['verificar', 'rechazar', 'suspender'].includes(accion) && metodo === 'POST') {
        if (!esAdmin) throw new ErrorHttp({ titulo: 'Solo un administrador puede verificar refugios.', estadoHttp: 403 });
        const motivo = (cuerpo as { motivo?: string } | undefined)?.motivo?.trim();
        if (accion !== 'verificar' && !motivo) throw new ErrorHttp({ titulo: 'Escribe el motivo de la decisión.', estadoHttp: 400 });
        if ((accion === 'suspender' && refugio.estadoVerificacion !== EstadoVerificacion.Verificado) ||
            (accion !== 'suspender' && refugio.estadoVerificacion !== EstadoVerificacion.Pendiente)) {
          throw new ErrorHttp({ titulo: 'El estado del refugio cambió. Actualiza la lista.', estadoHttp: 409 });
        }
        this.refugios[indice] = {
          ...refugio, fechaModificacion: new Date().toISOString(),
          estadoVerificacion: accion === 'verificar' ? EstadoVerificacion.Verificado : accion === 'rechazar' ? EstadoVerificacion.Rechazado : EstadoVerificacion.Suspendido,
          fechaVerificacion: accion === 'verificar' ? new Date().toISOString() : refugio.fechaVerificacion,
          motivoRechazo: motivo ?? null,
        };
        return undefined;
      }
      if (!esAdmin && !esPropio) throw new ErrorHttp({ titulo: 'No puedes editar este refugio.', estadoHttp: 403 });
      if (!accion && metodo === 'PUT') {
        const datos = cuerpo as EditarRefugioDto;
        // Lista explícita: un cuerpo manipulado no puede cambiar NIT o verificación.
        const { nombre, direccion, telefono, correo, encargado, descripcion, redesSociales } = normalizarRefugio(datos);
        const error = validarRefugio({ nombre, direccion, telefono, correo, encargado, descripcion, redesSociales });
        if (error) throw new ErrorHttp({ titulo: error, estadoHttp: 400 });
        const actualizado = { ...refugio, nombre, direccion, telefono, correo, encargado,
          descripcion: descripcion ?? null, redesSociales: redesSociales ?? null, fechaModificacion: new Date().toISOString() };
        this.refugios[indice] = actualizado;
        return actualizado;
      }
      if (accion === 'requisitos') {
        const id = Number(coincideRefugio[3]);
        const requisitos = [...refugio.requisitos];
        const posicion = requisitos.findIndex(r => r.id === id);
        if (metodo === 'DELETE' || metodo === 'PUT') {
          if (posicion < 0) throw new ErrorHttp({ titulo: 'No encontramos ese requisito.', estadoHttp: 404 });
        }
        if (metodo === 'DELETE') {
          requisitos.splice(posicion, 1);
          this.refugios[indice] = { ...refugio, requisitos };
          return undefined;
        }
        const datos = cuerpo as { descripcion: string; esObligatorio: boolean };
        if (!datos.descripcion?.trim() || typeof datos.esObligatorio !== 'boolean') {
          throw new ErrorHttp({ titulo: 'Describe el requisito e indica si es obligatorio.', estadoHttp: 400 });
        }
        const requisito = metodo === 'PUT' ? { ...requisitos[posicion]!, descripcion: datos.descripcion.trim(), esObligatorio: datos.esObligatorio }
          : { id: Math.max(...this.refugios.flatMap(r => r.requisitos.map(x => x.id)), 0) + 1,
              refugioId: refugio.id, descripcion: datos.descripcion.trim(), esObligatorio: datos.esObligatorio,
              orden: Math.max(...requisitos.map(r => r.orden), 0) + 1, activo: true,
              fechaCreacion: new Date().toISOString(), fechaModificacion: null };
        if (metodo === 'PUT') requisitos[posicion] = requisito; else requisitos.push(requisito);
        this.refugios[indice] = { ...refugio, requisitos };
        return requisito;
      }
    }
    if (ruta.endsWith('/api/refugios') && metodo === 'GET') {
      const visibles = this.nivelActual === NivelRol.Administrador ? this.refugios : this.refugios.filter(r => r.estadoVerificacion === EstadoVerificacion.Verificado);
      return paginar(visibles, pagina, tamano);
    }

    /* ---------- Notificaciones y seguimientos ---------- */

    if (ruta.includes('/notificaciones')) return [];
    if (ruta.includes('/seguimientos')) return [];

    /* ---------- Escrituras sin efecto ---------- */

    if (metodo !== 'GET') return undefined;

    throw new ErrorHttp({
      titulo: 'Esta pantalla todavía no tiene datos de demostración',
      detalle: `La ruta ${ruta} se resolverá cuando el backend esté conectado.`,
      estadoHttp: 501,
    });
  }
}
