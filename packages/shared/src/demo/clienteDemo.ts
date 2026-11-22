/**
 * Cliente que responde con datos simulados en vez de llamar al backend.
 *
 * Extiende ClienteApi y sobrescribe unicamente peticion(): como get, post,
 * put y delete pasan todos por ahi, con eso basta. Los servicios no se
 * enteran del cambio.
 */

import { ClienteApi, ErrorHttp, type ConfiguracionCliente } from '../api/client';
import { claimsDelToken } from '../api/sesion';
import type { Usuario, PerfilAdoptanteDto, EditarPerfilDto } from '../types/usuarios';
import { validarRefugio, normalizarRefugio, limpiarRedesSociales } from '../utils/refugios';
import type { Refugio, SolicitudRefugioDto, EditarRefugioDto } from '../types/refugios';
import { validarDatosPersonales, validarPerfilAdoptante } from '../utils/perfil';
import { EstadoApadrinamiento, EstadoMascota, EstadoNecesidad, EstadoReporte, TipoReporte, EstadoSeguimiento, ResultadoSeguimiento, EstadoVerificacion, NivelRol, TipoEvento, TipoMultimedia, TipoNecesidad, type TipoRegistroClinico } from '../types/enums';
import type { ApadrinamientoResumen, NecesidadRefugio } from '../types/refugios';
import type { NotificacionUsuario, SeguimientoAdopcion } from '../types/trazabilidad';
import type { ReporteResumen } from '../types/reportes';
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
  hace,
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

const ALFABETO = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
/** base64url a mano: btoa no está en todos los motores de React Native. */
function base64url(texto: string): string {
  const bytes = Array.from(new TextEncoder().encode(texto));
  let salida = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const [a = 0, b = 0, c = 0] = bytes.slice(i, i + 3);
    const n = (a << 16) | (b << 8) | c;
    const quedan = bytes.length - i;
    salida += ALFABETO[(n >> 18) & 63]! + ALFABETO[(n >> 12) & 63]! + (quedan > 1 ? ALFABETO[(n >> 6) & 63]! : '') + (quedan > 2 ? ALFABETO[n & 63]! : '');
  }
  return salida;
}

/**
 * Token con forma de JWT (sin firma real) para que la sesión lea el id del
 * usuario en `sub`, como con el backend. Con el texto plano de antes el id
 * quedaba en 0 y al iniciar sesión el cliente lo tomaba como otra sesión.
 */
function tokenDemo(usuario: Usuario): string {
  const cabecera = base64url(JSON.stringify({ alg: 'none', typ: 'JWT' }));
  const datos = base64url(JSON.stringify({ sub: String(usuario.id), email: usuario.correo, exp: Math.floor(Date.now() / 1000) + 900, jti: `${Date.now()}` }));
  return `${cabecera}.${datos}.demo`;
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

  private readonly necesidades: (NecesidadRefugio & { refugioId: number })[] = [
    { id: 1, refugioId: 1, tipo: TipoNecesidad.Alimento, descripcion: 'Concentrado para cachorros, 4 bultos de 8 kg.', medioDonacion: 'Nequi 3001234567', estado: EstadoNecesidad.Publicada, fechaPublicacion: hace(2) },
    { id: 2, refugioId: 1, tipo: TipoNecesidad.Medicinas, descripcion: 'Desparasitante para gatos adultos.', medioDonacion: null, estado: EstadoNecesidad.Publicada, fechaPublicacion: hace(6) },
    { id: 3, refugioId: 1, tipo: TipoNecesidad.Insumos, descripcion: 'Arena para gatos.', medioDonacion: 'Entrega en la sede', estado: EstadoNecesidad.Cubierta, fechaPublicacion: hace(20) },
  ];

  private readonly apadrinamientos: (ApadrinamientoResumen & { refugioId: number })[] = [
    { id: 1, refugioId: 1, mascotaId: 1, mascotaNombre: 'Canela', refugioNombre: 'Refugio Patitas Felices', padrinoNombre: 'Adoptante de Prueba', fechaInicio: hace(3), estado: EstadoApadrinamiento.Solicitado, observacion: 'Puedo aportar el alimento de cada mes.' },
  ];

  // Con los mismos textos que manda el backend, para que se clasifiquen igual.
  private readonly notificaciones: (NotificacionUsuario & { nivel: NivelRol })[] = [
    { id: 1, nivel: NivelRol.Adoptante, mensaje: `El refugio agendó una visita para tu solicitud el ${hace(-3).slice(0, 10)}.`, leida: false, fecha: new Date(Date.now() - 25 * 60_000).toISOString() },
    { id: 5, nivel: NivelRol.Adoptante, mensaje: 'El refugio evaluó el seguimiento #1 de tu adopción.', leida: false, fecha: hace(1) },
    { id: 2, nivel: NivelRol.Adoptante, mensaje: 'El refugio está revisando tu solicitud de adopción.', leida: true, fecha: hace(2) },
    { id: 6, nivel: NivelRol.Adoptante, mensaje: '¡Felicidades! Tu adopción de Bruno fue finalizada.', leida: true, fecha: hace(9) },
    { id: 7, nivel: NivelRol.Adoptante, mensaje: 'Tu solicitud ha sido enviada. El refugio revisará tu perfil.', leida: true, fecha: hace(12) },
    { id: 3, nivel: NivelRol.Refugio, mensaje: 'Recibiste una nueva solicitud de adopción para Canela.', leida: false, fecha: hace(1) },
    { id: 4, nivel: NivelRol.Administrador, mensaje: 'Hay un refugio nuevo esperando verificación.', leida: false, fecha: hace(1) },
  ];

  private readonly reportes: ReporteResumen[] = [...REPORTES];

  private readonly calificadas: { id: number; refugioId: number; adopcionId: number; puntaje: number; comentario: string | null; autor: string; fecha: string }[] = [];

  /** Plan de seguimiento de cada adopción demo: 1, 3 y 6 meses, el primero ya enviado. */
  private readonly planes = new Map<number, SeguimientoAdopcion[]>();
  private seguimientosDe(adopcionId: number): SeguimientoAdopcion[] {
    if (!this.planes.has(adopcionId)) {
      const programada = (dias: number) => hace(-dias).slice(0, 10);
      this.planes.set(adopcionId, [
        { id: adopcionId + 1, numero: 1, fechaProgramada: hace(10).slice(0, 10), fechaEnvio: hace(9), estado: EstadoSeguimiento.Enviado, resultado: null, fotos: [] },
        { id: adopcionId + 2, numero: 2, fechaProgramada: programada(5), fechaEnvio: null, estado: EstadoSeguimiento.Pendiente, resultado: null, fotos: [] },
        { id: adopcionId + 3, numero: 3, fechaProgramada: programada(95), fechaEnvio: null, estado: EstadoSeguimiento.Pendiente, resultado: null, fotos: [] },
      ]);
    }
    return this.planes.get(adopcionId)!;
  }

  /** Favoritos del adoptante demo; arranca con uno para que la lista no esté vacía. */
  private readonly favoritos = new Set<number>([2]);

  private resumenDemo(m: Mascota): MascotaResumen {
    const refugio = this.refugios.find(r => r.id === m.refugioId)!;
    return { id: m.id, nombre: m.nombre, especie: ESPECIES.find(e => e.id === m.especieId)!.nombre,
      raza: RAZAS.find(r => r.id === m.razaId)?.nombre ?? null, tamano: TAMANOS.find(t => t.id === m.tamanoId)!.nombre,
      sexo: m.sexo, edadAproximada: m.edadAproximada, estado: m.estado,
      fotoPrincipal: m.multimedia.find(a => a.activo && a.esPrincipal)?.archivo ?? mascotasResumen().find(a => a.id === m.id)?.fotoPrincipal ?? null,
      refugioId: refugio.id, refugioNombre: refugio.nombre, refugioVerificado: refugio.estadoVerificacion === EstadoVerificacion.Verificado,
      fechaUltimaActualizacion: m.fechaUltimaActualizacion, puntajeCompatibilidad: null };
  }

  private exigirAdoptante() {
    if (this.usuarioActual().rol.nivel !== NivelRol.Adoptante) throw new ErrorHttp({ titulo: 'Solo los adoptantes pueden usar esta función.', estadoHttp: 403 });
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
      const id = token ? claimsDelToken(token).sub : undefined;
      const cuenta = USUARIOS_DEMO.find(u => usuarioDemo(u.rol).id === Number(id));
      if (cuenta) this.nivelActual = cuenta.rol;
    }
    const { metodo = 'GET', cuerpo, parametros } = opciones;
    const carga = /^\/api\/v1\/Mascotas\/(\d+)\/multimedia$/.exec(ruta);
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
        accessToken: tokenDemo(usuario),
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
        accessToken: tokenDemo(usuario),
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
        redesSociales: limpiarRedesSociales(datos.redesSociales), descripcion: datos.descripcion?.trim() ?? null,
        estadoVerificacion: EstadoVerificacion.Pendiente, fechaVerificacion: null,
        motivoRechazo: null, promedioCalificacion: null, totalAdopciones: 0, requisitos: [],
      };
      this.refugios.push(nuevo);
      return nuevo;
    }

    /* ---------- Usuario de la sesion ---------- */

    if (ruta.endsWith('/v1/Usuarios/perfil') && metodo === 'GET') {
      return this.usuarioActual();
    }

    if (ruta.endsWith('/v1/Usuarios/perfil-adoptante') && metodo === 'PUT') {
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

    if (ruta.endsWith('/v1/Usuarios/perfil')) {
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

    // Mismas formas que el backend real (HU-MAS-04, 06, 07 y 08), ya traducidas al dominio.
    const tamanoDemo = Number(parametros?.tamano ?? parametros?.tamanoPagina ?? 10);
    const visibles = () => this.mascotas.filter(m => m.activo && (m.estado === EstadoMascota.Disponible || m.estado === EstadoMascota.EnProceso));

    if (ruta.endsWith('/v1/Mascotas/recomendaciones') && metodo === 'GET') {
      this.exigirAdoptante();
      return visibles().slice(0, 10).map((m, i) => {
        const tamano = TAMANOS.find(t => t.id === m.tamanoId)?.nombre.toLowerCase() ?? '';
        const factores = [tamano.includes('peque') ? 'Ideal para apartamento por su tamaño.' : 'Tiene espacio suficiente para su tamaño.',
          ...(m.temperamentos.length ? [`Su temperamento: ${m.temperamentos.map(t => t.nombre.toLowerCase()).join(', ')}.`] : [])];
        return { ...this.resumenDemo(m), puntajeCompatibilidad: Math.max(40, 95 - i * 7), factores };
      });
    }

    const favorito = /^\/api\/v1\/Favoritos(?:\/(\d+))?$/.exec(ruta);
    if (favorito) {
      this.exigirAdoptante();
      const id = Number(favorito[1]);
      if (metodo === 'GET' && !favorito[1]) {
        const lista = this.mascotas.filter(m => m.activo && this.favoritos.has(m.id)).map(m => this.resumenDemo(m));
        return paginar(lista, pagina, tamanoDemo);
      }
      if (metodo === 'POST') {
        if (!this.mascotas.some(m => m.id === id && m.activo)) throw new ErrorHttp({ titulo: 'Mascota no encontrada.', estadoHttp: 404 });
        if (this.favoritos.has(id)) throw new ErrorHttp({ titulo: 'Esta mascota ya está en tus favoritos.', estadoHttp: 409 });
        this.favoritos.add(id);
        return { mensaje: 'Mascota agregada a favoritos.' };
      }
      if (metodo === 'DELETE') {
        if (!this.favoritos.delete(id)) throw new ErrorHttp({ titulo: 'Esta mascota no está en tus favoritos.', estadoHttp: 404 });
        return { mensaje: 'Mascota eliminada de favoritos.' };
      }
    }

    const historial = /^\/api\/v1\/Mascotas\/(\d+)\/historial$/.exec(ruta);
    if (historial) {
      this.usuarioActual();
      const indice = this.mascotas.findIndex(m => m.id === Number(historial[1]) && m.activo);
      const mascota = this.mascotas[indice];
      if (!mascota) throw new ErrorHttp({ titulo: 'Mascota no encontrada.', estadoHttp: 404 });
      if (metodo === 'GET') {
        const registros = [...mascota.historialClinico].filter(r => r.activo).sort((a, b) => b.fecha.localeCompare(a.fecha));
        return paginar(registros, pagina, tamanoDemo);
      }
      if (metodo === 'POST') {
        this.exigirPropietario(mascota);
        const datos = cuerpo as { tipo: TipoRegistroClinico; fecha: string; descripcion: string; soporteVeterinario: string | null };
        const ahora = new Date().toISOString();
        const nuevo = { id: Math.max(0, ...this.mascotas.flatMap(m => m.historialClinico.map(r => r.id))) + 1, mascotaId: mascota.id,
          tipo: datos.tipo, fecha: datos.fecha, descripcion: datos.descripcion, soporteVeterinario: datos.soporteVeterinario,
          activo: true, fechaCreacion: ahora, fechaModificacion: null };
        this.mascotas[indice] = { ...mascota, historialClinico: [...mascota.historialClinico, nuevo], fechaUltimaActualizacion: ahora };
        return { mensaje: 'Registro clínico agregado correctamente.' };
      }
    }

    const compartir = /^\/api\/v1\/Mascotas\/(\d+)\/compartir$/.exec(ruta);
    if (compartir) {
      const mascota = visibles().find(m => m.id === Number(compartir[1]));
      if (!mascota) throw new ErrorHttp({ titulo: 'La mascota no existe o no está disponible.', estadoHttp: 404 });
      const r = this.resumenDemo(mascota);
      return { titulo: `¡Conoce a ${r.nombre} en Huellitas!`,
        descripcion: `Es un(a) ${r.especie}${r.raza ? ` de raza ${r.raza}` : ''} que busca un hogar. ¡Ayúdanos a encontrar a su familia!`,
        imagenUrl: r.fotoPrincipal ?? '', urlFicha: `https://huellitas.demo/mascotas/${r.id}` };
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
    const accionArchivo = /^\/api\/v1\/Mascotas\/(\d+)\/multimedia\/(\d+)(\/principal)?$/.exec(ruta);
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

    const publicacion = /^\/api\/v1\/Mascotas\/(\d+)\/publicar$/.exec(ruta);
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

    const coincideMascota = /\/api\/v1\/Mascotas\/(\d+)(?:\/(estado))?$/.exec(ruta);
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
      if (metodo === 'DELETE' || (metodo === 'PATCH' && coincideMascota[2])) {
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

    if ((ruta.endsWith('/api/v1/Mascotas') || ruta.endsWith('/api/v1/Mascotas/borradores')) && metodo === 'POST') {
      const refugio = exigirRefugio();
      const campos = preparar(cuerpo as CrearMascotaDto);
      const ahora = new Date().toISOString();
      const nueva: Mascota = { ...campos, id: Math.max(...this.mascotas.map(m => m.id), 0) + 1,
        activo: true, fechaCreacion: ahora, fechaModificacion: null, refugioId: refugio.id,
        estado: ruta.endsWith('/borradores') ? EstadoMascota.Borrador : EstadoMascota.Disponible, fechaUltimaActualizacion: ahora, motivoBaja: null, multimedia: [], historialClinico: [] };
      this.mascotas.push(nueva);
      return nueva;
    }
    if (ruta.endsWith('/api/v1/Mascotas') && metodo === 'GET') {
      let mascotas = this.mascotas.filter(m => m.activo);
      if (this.nivelActual !== NivelRol.Refugio && this.nivelActual !== NivelRol.Administrador) mascotas = mascotas.filter(m => m.estado !== EstadoMascota.Borrador);
      if (this.nivelActual === NivelRol.Refugio) mascotas = mascotas.filter(m => m.refugioId === this.usuarioActual().refugioId);
      if (parametros?.refugioId !== undefined) mascotas = mascotas.filter(m => m.refugioId === Number(parametros.refugioId));
      for (const campo of ['especieId', 'razaId', 'tamanoId', 'sexo', 'estado'] as const) {
        if (parametros?.[campo] !== undefined) mascotas = mascotas.filter(m => m[campo] === Number(parametros[campo]));
      }
      const texto = String(parametros?.texto ?? '').toLowerCase();
      let lista: MascotaResumen[] = mascotas.map(m => this.resumenDemo(m));
      if (texto) lista = lista.filter(m => [m.nombre, m.raza, m.especie].some(v => v?.toLowerCase().includes(texto)));
      return paginar(lista, pagina, tamano);
    }

    /* ---------- Solicitudes ---------- */

    const coincideLinea = /\/solicitudes\/(\d+)\/linea-tiempo$/.exec(ruta);
    if (coincideLinea) return lineaTiempo(Number(coincideLinea[1]));

    if (ruta.endsWith('/solicitudes/mias')) {
      // El adoptante demo tiene una solicitud en curso y una adopción finalizada.
      return solicitudesResumen().filter((s) => s.id === 1 || s.id === 4);
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

    if (ruta.endsWith('/reportes/mios')) return this.reportes.slice(0, 2);
    if (ruta.endsWith('/reportes/mapa')) return [...this.reportes];
    const accionReporte = /\/api\/reportes\/(\d+)\/(tomar|estado)$/.exec(ruta);
    if (accionReporte) {
      const refugio = this.exigirPropietario();
      const indice = this.reportes.findIndex(r => r.id === Number(accionReporte[1]));
      const actual = this.reportes[indice];
      if (!actual) throw new ErrorHttp({ titulo: 'Reporte no encontrado.', estadoHttp: 404 });
      if (accionReporte[2] === 'tomar') {
        if (actual.refugioAsignado) throw new ErrorHttp({ titulo: 'Otro refugio ya tomó este reporte.', estadoHttp: 409 });
        this.reportes[indice] = { ...actual, refugioAsignado: refugio.nombre, estado: EstadoReporte.EnAtencion };
      } else {
        const { nuevoEstado } = cuerpo as { nuevoEstado: EstadoReporte };
        this.reportes[indice] = { ...actual, estado: nuevoEstado };
      }
      return undefined;
    }

    if (ruta.endsWith('/api/reportes')) {
      if (metodo === 'POST') {
        const datos = cuerpo as { tipo: TipoReporte; descripcion: string; latitud: number; longitud: number; direccion?: string };
        const id = Math.max(0, ...this.reportes.map(r => r.id)) + 1;
        const numero = `REP-0${190 + id}`;
        this.reportes.unshift({ id, numeroReporte: numero, tipo: datos.tipo, estado: EstadoReporte.Recibido, fechaReporte: new Date().toISOString(),
          zona: null, fotoPrincipal: null, refugioAsignado: null, esPrioritario: datos.tipo === TipoReporte.Herido || datos.tipo === TipoReporte.Maltrato,
          latitud: datos.latitud, longitud: datos.longitud, direccion: datos.direccion ?? null, descripcion: datos.descripcion });
        return { ...REPORTES[0], id, numeroReporte: numero };
      }
      return paginar(this.reportes, pagina, tamano);
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

    /* ---------- Necesidades, apadrinamientos y calificaciones (HU-REF-03/04) ---------- */

    const necesidadesRefugio = /^\/api\/v1\/Necesidades\/refugio\/(\d+)$/.exec(ruta);
    if (necesidadesRefugio && metodo === 'GET') {
      const lista = this.necesidades.filter(n => n.refugioId === Number(necesidadesRefugio[1])).sort((a, b) => a.estado - b.estado || b.fechaPublicacion.localeCompare(a.fechaPublicacion));
      return paginar(lista.map(({ refugioId: _r, ...n }) => n), pagina, tamanoDemo);
    }
    if (ruta === '/api/v1/Necesidades' && metodo === 'POST') {
      const refugio = this.exigirPropietario();
      const datos = cuerpo as { tipo: TipoNecesidad; descripcion: string; medioDonacion: string | null };
      this.necesidades.push({ id: Math.max(0, ...this.necesidades.map(n => n.id)) + 1, refugioId: refugio.id, tipo: datos.tipo, descripcion: datos.descripcion,
        medioDonacion: datos.medioDonacion, estado: EstadoNecesidad.Publicada, fechaPublicacion: new Date().toISOString() });
      return { mensaje: 'Necesidad publicada.' };
    }
    const necesidad = /^\/api\/v1\/Necesidades\/(\d+)(\/cubrir)?$/.exec(ruta);
    if (necesidad) {
      const refugio = this.exigirPropietario();
      const indice = this.necesidades.findIndex(n => n.id === Number(necesidad[1]));
      const actual = this.necesidades[indice];
      if (!actual) throw new ErrorHttp({ titulo: 'Necesidad no encontrada.', estadoHttp: 404 });
      if (actual.refugioId !== refugio.id) throw new ErrorHttp({ titulo: 'No tienes permiso para modificar esta necesidad.', estadoHttp: 403 });
      if (necesidad[2] && metodo === 'PATCH') { this.necesidades[indice] = { ...actual, estado: EstadoNecesidad.Cubierta }; return { mensaje: 'Necesidad cubierta.' }; }
      if (metodo === 'PUT') { const d = cuerpo as { tipo: TipoNecesidad; descripcion: string; medioDonacion: string | null }; this.necesidades[indice] = { ...actual, ...d }; return { mensaje: 'Necesidad actualizada.' }; }
      if (metodo === 'DELETE') { this.necesidades.splice(indice, 1); return { mensaje: 'Necesidad eliminada.' }; }
    }

    if (ruta === '/api/v1/Apadrinamientos' && metodo === 'POST') {
      this.exigirAdoptante();
      const datos = cuerpo as { mascotaId: number; observacion: string | null };
      const mascota = this.mascotas.find(m => m.id === datos.mascotaId && m.activo);
      if (!mascota) throw new ErrorHttp({ titulo: 'Mascota no encontrada.', estadoHttp: 404 });
      const refugio = this.refugios.find(r => r.id === mascota.refugioId)!;
      this.apadrinamientos.push({ id: Math.max(0, ...this.apadrinamientos.map(a => a.id)) + 1, mascotaId: mascota.id, mascotaNombre: mascota.nombre,
        refugioNombre: refugio.nombre, padrinoNombre: this.usuarioActual().nombre, fechaInicio: new Date().toISOString(),
        estado: EstadoApadrinamiento.Solicitado, observacion: datos.observacion, refugioId: refugio.id });
      return { mensaje: 'Solicitud de apadrinamiento enviada.' };
    }
    if (ruta === '/api/v1/Apadrinamientos/mis-apadrinamientos') {
      this.exigirAdoptante();
      const nombre = this.usuarioActual().nombre;
      return paginar(this.apadrinamientos.filter(a => a.padrinoNombre === nombre).map(({ refugioId: _r, ...a }) => a), pagina, tamanoDemo);
    }
    if (ruta === '/api/v1/Apadrinamientos/refugio') {
      const refugio = this.exigirPropietario();
      return paginar(this.apadrinamientos.filter(a => a.refugioId === refugio.id).map(({ refugioId: _r, ...a }) => a), pagina, tamanoDemo);
    }
    const apadrinamiento = /^\/api\/v1\/Apadrinamientos\/(\d+)\/(gestionar|cancelar)$/.exec(ruta);
    if (apadrinamiento && metodo === 'PATCH') {
      const indice = this.apadrinamientos.findIndex(a => a.id === Number(apadrinamiento[1]));
      const actual = this.apadrinamientos[indice];
      if (!actual) throw new ErrorHttp({ titulo: 'Apadrinamiento no encontrado.', estadoHttp: 404 });
      if (apadrinamiento[2] === 'gestionar') {
        const refugio = this.exigirPropietario();
        if (actual.refugioId !== refugio.id) throw new ErrorHttp({ titulo: 'No tienes permiso para gestionar este apadrinamiento.', estadoHttp: 403 });
        if (actual.estado !== EstadoApadrinamiento.Solicitado) throw new ErrorHttp({ titulo: "Solo se pueden gestionar solicitudes en estado 'Solicitado'.", estadoHttp: 409 });
        const { aceptar, observacion } = cuerpo as { aceptar: boolean; observacion: string | null };
        this.apadrinamientos[indice] = { ...actual, estado: aceptar ? EstadoApadrinamiento.Activo : EstadoApadrinamiento.Finalizado, observacion: observacion ?? actual.observacion };
      } else {
        this.exigirAdoptante();
        if (actual.estado === EstadoApadrinamiento.Finalizado) throw new ErrorHttp({ titulo: 'Apadrinamiento no encontrado o ya se encuentra inactivo.', estadoHttp: 404 });
        this.apadrinamientos[indice] = { ...actual, estado: EstadoApadrinamiento.Finalizado };
      }
      return { mensaje: 'Apadrinamiento actualizado.' };
    }

    const calificaciones = /^\/api\/v1\/Refugios\/(\d+)\/calificaciones$/.exec(ruta);
    if (calificaciones && metodo === 'POST') {
      this.exigirAdoptante();
      const datos = cuerpo as { adopcionId: number; puntaje: number; comentario: string | null };
      if (!solicitudesResumen().some(s => s.adopcionId === datos.adopcionId)) throw new ErrorHttp({ titulo: 'Adopción no encontrada.', estadoHttp: 404 });
      if (this.calificadas.some(c => c.adopcionId === datos.adopcionId)) throw new ErrorHttp({ titulo: 'Ya has calificado esta adopción.', estadoHttp: 409 });
      this.calificadas.push({ ...datos, refugioId: Number(calificaciones[1]), id: 900 + this.calificadas.length, autor: this.usuarioActual().nombre, fecha: new Date().toISOString() });
      return { mensaje: 'Calificación registrada.' };
    }
    const calificacion = /^\/api\/v1\/Refugios\/(\d+)\/calificaciones\/(\d+)$/.exec(ruta);
    if (calificacion) {
      this.exigirAdoptante();
      const indice = this.calificadas.findIndex(c => c.id === Number(calificacion[2]) && c.refugioId === Number(calificacion[1]));
      const actual = this.calificadas[indice];
      if (!actual) throw new ErrorHttp({ titulo: 'Calificación no encontrada.', estadoHttp: 404 });
      if (actual.autor !== this.usuarioActual().nombre) throw new ErrorHttp({ titulo: 'No tienes permiso para editar esta calificación.', estadoHttp: 403 });
      if (metodo === 'PUT') { const d = cuerpo as { puntaje: number; comentario: string | null }; this.calificadas[indice] = { ...actual, ...d }; return { mensaje: 'Calificación actualizada.' }; }
      if (metodo === 'DELETE') { this.calificadas.splice(indice, 1); return { mensaje: 'Calificación eliminada.' }; }
    }
    if (calificaciones && metodo === 'GET') {
      const id = Number(calificaciones[1]);
      const yo = this.nivelActual === NivelRol.Adoptante ? this.usuarioActual().nombre : null;
      const propias = this.calificadas.filter(c => c.refugioId === id).map(c => ({ id: c.id, autor: c.autor, puntaje: c.puntaje, comentario: c.comentario, fecha: c.fecha, esPropia: c.autor === yo }));
      const opiniones = [
        ...propias,
        { id: id * 10 + 1, autor: 'Valentina R.', puntaje: 5, comentario: 'Nos acompañaron en todo el proceso y resolvieron todas nuestras dudas.', fecha: hace(12), esPropia: false },
        { id: id * 10 + 2, autor: 'Andrés M.', puntaje: 4, comentario: 'Muy organizados. La visita fue puntual.', fecha: hace(40), esPropia: false },
        { id: id * 10 + 3, autor: 'Laura P.', puntaje: 5, comentario: null, fecha: hace(75), esPropia: false },
      ];
      return paginar(opiniones, pagina, tamanoDemo);
    }

    /* ---------- Trazabilidad (HU-TRA-01 a 04) ---------- */

    const lineaSolicitud = /^\/api\/v1\/Trazabilidad\/solicitudes\/(\d+)$/.exec(ruta);
    if (lineaSolicitud) {
      this.usuarioActual();
      const etapas = lineaTiempo(Number(lineaSolicitud[1])).filter(e => e.fecha);
      return etapas.map((e, i) => ({ estadoAnterior: i === 0 ? null : etapas[i - 1]!.etiqueta, estadoNuevo: e.etiqueta,
        observacion: e.detalle, responsable: i === 0 ? 'Adoptante de Prueba' : 'Refugio Patitas', fecha: e.fecha! }));
    }
    const historialMascota = /^\/api\/v1\/Trazabilidad\/mascotas\/(\d+)$/.exec(ruta);
    if (historialMascota) {
      const mascota = this.mascotas.find(m => m.id === Number(historialMascota[1]));
      if (!mascota) throw new ErrorHttp({ titulo: 'Mascota no encontrada.', estadoHttp: 404 });
      return [
        { tipo: TipoEvento.Ingreso, descripcion: 'Mascota registrada en el sistema.', fecha: mascota.fechaIngreso },
        ...mascota.historialClinico.map(r => ({ tipo: TipoEvento.AtencionClinica, descripcion: `Registro clínico agregado: ${r.descripcion ?? ''}`.trim(), fecha: r.fecha })),
      ].sort((a, b) => b.fecha.localeCompare(a.fecha));
    }
    if (ruta === '/api/v1/Notificaciones' && metodo === 'GET') {
      const usuario = this.usuarioActual();
      const propias = this.notificaciones.filter(n => n.nivel === usuario.rol.nivel).map(({ nivel: _n, ...n }) => n).sort((a, b) => b.fecha.localeCompare(a.fecha));
      return paginar(propias, pagina, tamanoDemo);
    }
    const leer = /^\/api\/v1\/Notificaciones\/(\d+)\/leer$/.exec(ruta);
    if (leer && metodo === 'PATCH') {
      const nivel = this.usuarioActual().rol.nivel;
      const indice = this.notificaciones.findIndex(n => n.id === Number(leer[1]) && n.nivel === nivel);
      if (indice < 0) throw new ErrorHttp({ titulo: 'Notificación no encontrada.', estadoHttp: 404 });
      this.notificaciones[indice] = { ...this.notificaciones[indice]!, leida: true };
      return { mensaje: 'Notificación marcada como leída.' };
    }
    if (ruta === '/api/v1/Trazabilidad/auditoria') {
      if (this.usuarioActual().rol.nivel !== NivelRol.Administrador) throw new ErrorHttp({ titulo: 'Solo el administrador puede ver la auditoría.', estadoHttp: 403 });
      const entradas = [
        { id: 3, accion: 'CambioEstado', entidad: 'SolicitudAdopcion', idEntidad: 2, valorAnterior: 'EnRevision', valorNuevo: 'Entrevista', responsable: 'Refugio Patitas', fecha: hace(1) },
        { id: 2, accion: 'CambioEstado', entidad: 'SolicitudAdopcion', idEntidad: 2, valorAnterior: 'Enviada', valorNuevo: 'EnRevision', responsable: 'Refugio Patitas', fecha: hace(3) },
        { id: 1, accion: 'Creacion', entidad: 'SolicitudAdopcion', idEntidad: 2, valorAnterior: null, valorNuevo: 'Enviada', responsable: 'Adoptante de Prueba', fecha: hace(5) },
      ];
      return paginar(entradas, pagina, tamanoDemo);
    }
    const plan = /^\/api\/v1\/Seguimientos\/adopcion\/(\d+)\/plan$/.exec(ruta);
    if (plan) {
      this.usuarioActual();
      const adopcionId = Number(plan[1]);
      if (!solicitudesResumen().some(s => s.adopcionId === adopcionId)) throw new ErrorHttp({ titulo: 'Adopción no encontrada.', estadoHttp: 404 });
      return { id: adopcionId, adopcionId, seguimientos: this.seguimientosDe(adopcionId) };
    }
    const reporte = /^\/api\/v1\/Seguimientos\/(\d+)\/(reporte|evaluar)$/.exec(ruta);
    if (reporte) {
      const id = Number(reporte[1]);
      const adopcionId = Math.floor(id / 10) * 10;
      const lista = this.seguimientosDe(adopcionId);
      const indice = lista.findIndex(x => x.id === id);
      const actual = lista[indice];
      if (!actual) throw new ErrorHttp({ titulo: 'Seguimiento no encontrado.', estadoHttp: 404 });
      if (reporte[2] === 'reporte' && metodo === 'POST') {
        this.exigirAdoptante();
        if (actual.estado === EstadoSeguimiento.Enviado) throw new ErrorHttp({ titulo: 'Este seguimiento ya fue enviado.', estadoHttp: 409 });
        const { fotosUrls = [] } = cuerpo as { fotosUrls?: string[] };
        lista[indice] = { ...actual, estado: EstadoSeguimiento.Enviado, fechaEnvio: new Date().toISOString(), fotos: fotosUrls };
        return { mensaje: 'Reporte enviado correctamente.' };
      }
      if (reporte[2] === 'evaluar' && metodo === 'PATCH') {
        this.exigirPropietario();
        if (actual.estado !== EstadoSeguimiento.Enviado) throw new ErrorHttp({ titulo: 'Solo se pueden evaluar seguimientos enviados por el adoptante.', estadoHttp: 409 });
        lista[indice] = { ...actual, resultado: Number(parametros?.resultado) === 1 ? ResultadoSeguimiento.RequiereAtencion : ResultadoSeguimiento.Conforme };
        return { mensaje: 'Seguimiento evaluado.' };
      }
    }

    /* ---------- Escrituras sin efecto ---------- */

    if (metodo !== 'GET') return undefined;

    throw new ErrorHttp({
      titulo: 'Esta pantalla todavía no tiene datos de demostración',
      detalle: `La ruta ${ruta} se resolverá cuando el backend esté conectado.`,
      estadoHttp: 501,
    });
  }
}
