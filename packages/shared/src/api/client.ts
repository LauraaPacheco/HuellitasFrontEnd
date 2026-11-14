/**
 * Cliente HTTP agnostico de plataforma: usa solo fetch, que existe tanto
 * en el navegador como en React Native. No importa nada de react-dom ni
 * de react-native, por eso lo pueden usar las dos apps.
 */

import type { ErrorApi } from '../types/comun';
import type { Usuario } from '../types/usuarios';
import { sesionDesdeRespuesta, type RespuestaTokenApi, type SesionGuardada } from './sesion';

export class ErrorHttp extends Error {
  readonly estadoHttp: number;
  readonly detalle: string | undefined;
  readonly errores: Readonly<Record<string, readonly string[]>> | undefined;

  constructor(error: ErrorApi) {
    super(error.titulo);
    this.name = 'ErrorHttp';
    this.estadoHttp = error.estadoHttp;
    this.detalle = error.detalle;
    this.errores = error.errores;
  }

  /** La sesion vencio o el token no sirve: hay que mandar al login. */
  get esNoAutenticado(): boolean {
    return this.estadoHttp === 401;
  }

  /** El rol no alcanza para esta operacion. */
  get esSinPermiso(): boolean {
    return this.estadoHttp === 403;
  }

  get esValidacion(): boolean {
    return this.estadoHttp === 400 || this.estadoHttp === 422;
  }
}

export interface AlmacenToken {
  obtener(): Promise<string | null>;
  guardar(token: string): Promise<void>;
  limpiar(): Promise<void>;
}

export interface ConfiguracionCliente {
  readonly urlBase: string;
  readonly almacen: AlmacenToken;
  /** Sesión completa: permite rotar el refresh token y persistir ambos tokens. */
  readonly almacenSesion?: AlmacenToken;
  readonly alRenovarSesion?: (sesion: SesionGuardada) => void;
  /** En web, coordina la rotación entre pestañas que comparten localStorage. */
  readonly ejecutarRenovacionExclusiva?: (accion: () => Promise<string | null>) => Promise<string | null>;
  /** Se dispara cuando la sesión ya no puede renovarse. */
  readonly alExpirarSesion?: () => void;
  readonly tiempoLimiteMs?: number;
  /**
   * Cabeceras fijas que se mandan en toda peticion. Hoy se usa para el
   * tunel de desarrollo (X-Tunnel-Authorization), que no tiene nada que
   * ver con la sesion del usuario y por eso no vive en el almacen.
   */
  readonly cabecerasExtra?: Readonly<Record<string, string>>;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface OpcionesPeticion {
  readonly metodo?: Metodo;
  readonly cuerpo?: unknown;
  readonly parametros?: Record<string, unknown>;
  readonly senal?: AbortSignal;
  readonly formato?: 'json' | 'blob';
}

const TIEMPO_LIMITE_POR_DEFECTO = 15_000;
const identidadSesion = (sesion: SesionGuardada) => sesion.idSesion ?? `${sesion.usuario.id}:${sesion.expiraEn}`;

function construirConsulta(parametros?: Record<string, unknown>): string {
  if (!parametros) return '';
  const partes = new URLSearchParams();
  for (const [clave, valor] of Object.entries(parametros)) {
    if (valor === undefined || valor === null || valor === '') continue;
    if (Array.isArray(valor)) {
      for (const elemento of valor) partes.append(clave, String(elemento));
    } else {
      partes.append(clave, String(valor));
    }
  }
  const consulta = partes.toString();
  return consulta ? `?${consulta}` : '';
}

export class ClienteApi {
  private readonly config: ConfiguracionCliente;
  private generacion = 0;
  private escritura: Promise<unknown> = Promise.resolve();

  private conEscritura<T>(accion: () => Promise<T>): Promise<T> {
    const tarea = this.escritura.then(accion, accion);
    this.escritura = tarea.catch(() => undefined);
    return tarea;
  }

  async guardarSesion(sesion: SesionGuardada): Promise<void> {
    this.invalidarRenovacion();
    const generacion = this.generacion;
    await this.conEscritura(async () => {
      if (generacion !== this.generacion) return;
      await this.config.almacenSesion?.guardar(JSON.stringify({ ...sesion, idSesion: sesion.idSesion ?? `${Date.now()}:${Math.random()}` }));
      await this.config.almacen.guardar(sesion.token);
      this.tokenExpirado = null;
    });
  }

  async limpiarSesion(): Promise<void> {
    this.invalidarRenovacion();
    await this.conEscritura(async () => {
      await this.config.almacen.limpiar();
      await this.config.almacenSesion?.limpiar();
    });
  }

  async actualizarUsuarioSesion(usuario: Usuario): Promise<SesionGuardada> {
    return this.conEscritura(async () => {
      const crudo = await this.config.almacenSesion?.obtener();
      if (!crudo) throw new Error('La sesión terminó.');
      const actual = JSON.parse(crudo) as SesionGuardada;
      if (actual.usuario.id !== usuario.id || actual.token !== await this.config.almacen.obtener()) throw new Error('La sesión cambió.');
      const sesion = { ...actual, usuario: { ...usuario, rol: actual.usuario.rol } };
      await this.config.almacenSesion?.guardar(JSON.stringify(sesion));
      return sesion;
    });
  }
  private renovacion: Promise<string | null> | null = null;
  private reemplazos = new Map<string, string>();
  private tokenExpirado: string | null = null;

  /** Se llama antes de iniciar o cerrar sesión para cancelar renovaciones anteriores. */
  invalidarRenovacion(): void {
    this.generacion++;
    this.renovacion = null;
    this.reemplazos.clear();
  }

  private async expirar(token: string | null): Promise<void> {
    await this.conEscritura(async () => {
      if (token !== await this.config.almacen.obtener() || (token !== null && this.tokenExpirado === token)) return;
      this.tokenExpirado = token;
      this.invalidarRenovacion();
      await this.config.almacen.limpiar();
      await this.config.almacenSesion?.limpiar();
      this.config.alExpirarSesion?.();
    });
  }

  private async renovarToken(token: string, identidad: string | null): Promise<string | null> {
    if (this.renovacion) return this.renovacion;
    const generacion = this.generacion;
    const ejecutar = () => this.ejecutarRenovacion(token, generacion, identidad);
    const trabajo = this.config.ejecutarRenovacionExclusiva?.(ejecutar) ?? ejecutar();
    this.renovacion = trabajo;
    try { return await trabajo; }
    finally { if (this.renovacion === trabajo) this.renovacion = null; }
  }

  private async ejecutarRenovacion(token: string, generacion: number, identidad: string | null): Promise<string | null> {
    if (generacion !== this.generacion) return null;
    const actual = await this.config.almacen.obtener();
    if (actual !== token) {
      // Un 401 puede llegar tarde, después de que otra petición ya renovó.
      let siguiente = token;
      while (this.reemplazos.has(siguiente)) siguiente = this.reemplazos.get(siguiente)!;
      const guardada = await this.config.almacenSesion?.obtener();
      let mismaSesion = false;
      try {
        const sesion = guardada ? JSON.parse(guardada) as SesionGuardada : null;
        mismaSesion = !!sesion && !!identidad && identidadSesion(sesion) === identidad && sesion.token === actual;
      } catch { /* una sesión incompleta no puede renovarse */ }
      return actual && (siguiente === actual || mismaSesion) ? actual : null;
    }
    const almacenSesion = this.config.almacenSesion;
    const crudo = await almacenSesion?.obtener();
    if (!crudo || !almacenSesion) return null;
    let anterior: SesionGuardada;
    try { anterior = JSON.parse(crudo) as SesionGuardada; } catch { return null; }
    if (anterior.token !== token || !anterior.refreshToken) return null;

    let respuesta: RespuestaTokenApi;
    try {
      respuesta = await this.peticion<RespuestaTokenApi>('/api/v1/Auth/refresh', {
        metodo: 'POST', cuerpo: { refreshToken: anterior.refreshToken },
      });
    } catch (error) {
      if (generacion !== this.generacion) return null;
      if (error instanceof ErrorHttp && (error.estadoHttp === 401 || error.estadoHttp === 403)) {
        await this.expirar(token);
      }
      // Un fallo de red o del servidor no elimina una sesión recuperable.
      throw error;
    }
    if (typeof respuesta?.accessToken !== 'string' || !respuesta.accessToken || typeof respuesta.refreshToken !== 'string' || !respuesta.refreshToken || !Number.isFinite(respuesta.expiraEnSegundos) || respuesta.expiraEnSegundos <= 0) {
      throw new ErrorHttp({ titulo: 'El servidor no devolvió una sesión válida.', estadoHttp: 502 });
    }
    return this.conEscritura(async () => {
      if (generacion !== this.generacion || await this.config.almacen.obtener() !== token) return null;
      const guardada = await almacenSesion.obtener();
      if (!guardada) return null;
      const actual = JSON.parse(guardada) as SesionGuardada;
      if (actual.token !== token || actual.refreshToken !== anterior.refreshToken) return null;
      const nueva = sesionDesdeRespuesta(respuesta, actual.usuario.correo);
      const sesion: SesionGuardada = { ...nueva, idSesion: identidadSesion(actual), usuario: { ...actual.usuario,
        nombre: respuesta.nombre || actual.usuario.nombre, rol: nueva.usuario.rol } };
      await almacenSesion.guardar(JSON.stringify(sesion));
      await this.config.almacen.guardar(sesion.token);
      if (generacion !== this.generacion) return null;
      this.reemplazos.set(token, sesion.token);
      if (this.reemplazos.size > 10) this.reemplazos.delete(this.reemplazos.keys().next().value!);
      this.tokenExpirado = null;
      this.config.alRenovarSesion?.(sesion);
      return sesion.token;
    });
  }

  constructor(config: ConfiguracionCliente) {
    this.config = config;
  }

  async peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    return this.ejecutarPeticion<T>(ruta, opciones);
  }

  private async ejecutarPeticion<T>(ruta: string, opciones: OpcionesPeticion, reintentada = false, tokenEsperado?: string): Promise<T> {
    const { metodo = 'GET', cuerpo, parametros, senal } = opciones;
    await this.escritura;
    const token = await this.config.almacen.obtener();
    const sesionCruda = await this.config.almacenSesion?.obtener();
    let identidad: string | null = null;
    try {
      const sesion = sesionCruda ? JSON.parse(sesionCruda) as SesionGuardada : null;
      if (sesion?.token === token) identidad = identidadSesion(sesion);
    } catch { /* la renovación tratará la sesión inválida */ }
    if (tokenEsperado !== undefined && token !== tokenEsperado) {
      throw new ErrorHttp({ titulo: 'La sesión cambió durante la petición.', estadoHttp: 401 });
    }

    const cabeceras: Record<string, string> = {
      Accept: opciones.formato === 'blob' ? 'application/pdf' : 'application/json',
      ...this.config.cabecerasExtra,
    };
    if (token) cabeceras.Authorization = `Bearer ${token}`;

    const esFormData =
      typeof FormData !== 'undefined' && cuerpo instanceof FormData;
    if (cuerpo !== undefined && !esFormData) {
      cabeceras['Content-Type'] = 'application/json';
    }

    const controlador = new AbortController();
    const temporizador = setTimeout(
      () => controlador.abort(),
      this.config.tiempoLimiteMs ?? TIEMPO_LIMITE_POR_DEFECTO,
    );
    const abortar = () => controlador.abort();
    if (senal?.aborted) controlador.abort();
    senal?.addEventListener('abort', abortar, { once: true });

    let respuesta: Response;
    try {
      respuesta = await fetch(
        `${this.config.urlBase}${ruta}${construirConsulta(parametros)}`,
        {
          method: metodo,
          headers: cabeceras,
          body: esFormData ? (cuerpo as FormData) : cuerpo !== undefined ? JSON.stringify(cuerpo) : undefined,
          signal: controlador.signal,
        },
      );
    } catch (causa) {
      clearTimeout(temporizador);
      senal?.removeEventListener('abort', abortar);
      const abortado = causa instanceof Error && causa.name === 'AbortError';
      throw new ErrorHttp({
        titulo: abortado
          ? 'La solicitud tardó demasiado'
          : 'No se pudo conectar con el servidor',
        detalle: abortado
          ? 'Revisa tu conexión e inténtalo de nuevo.'
          : 'Verifica que tengas internet y vuelve a intentarlo.',
        estadoHttp: 0,
      });
    }
    clearTimeout(temporizador);
    senal?.removeEventListener('abort', abortar);

    // Login, refresh y logout no deben entrar en un ciclo de renovación.
    const autenticacion = /^\/api\/v1\/Auth(?:\/|$)/i.test(ruta);
    if (respuesta.status === 401 && !autenticacion) {
      if (!reintentada && token && this.config.almacenSesion) {
        const renovado = await this.renovarToken(token, identidad);
        if (renovado) return this.ejecutarPeticion<T>(ruta, opciones, true, renovado);
      }
      await this.expirar(token);
    }

    if (respuesta.status === 204) return undefined as T;

    if (respuesta.ok && opciones.formato === 'blob') {
      if (!respuesta.headers.get('content-type')?.includes('application/pdf')) throw new ErrorHttp({ titulo: 'El servidor no devolvió un PDF válido.', estadoHttp: 502 });
      return await respuesta.blob() as T;
    }
    const texto = await respuesta.text();
    let datos: unknown = null;
    try { datos = texto ? JSON.parse(texto) : null; } catch { throw new ErrorHttp({ titulo: 'El servidor devolvió una respuesta no válida.', estadoHttp: respuesta.ok ? 502 : respuesta.status }); }

    if (!respuesta.ok) {
      throw new ErrorHttp(this.mapearError(datos, respuesta.status));
    }

    return datos as T;
  }

  /** Traduce ProblemDetails de ASP.NET Core al ErrorApi del front. */
  private mapearError(datos: unknown, estadoHttp: number): ErrorApi {
    const cuerpo = (datos ?? {}) as Record<string, unknown>;
    return {
      titulo:
        (cuerpo.titulo as string) ??
        (cuerpo.title as string) ??
        'Ocurrió un error inesperado',
      detalle: (cuerpo.detalle as string) ?? (cuerpo.detail as string),
      estadoHttp,
      errores:
        (cuerpo.errores as Record<string, string[]>) ??
        (cuerpo.errors as Record<string, string[]>),
    };
  }

  get<T>(ruta: string, parametros?: Record<string, unknown>): Promise<T> {
    return this.peticion<T>(ruta, { metodo: 'GET', parametros });
  }

  post<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.peticion<T>(ruta, { metodo: 'POST', cuerpo });
  }

  put<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.peticion<T>(ruta, { metodo: 'PUT', cuerpo });
  }

  patch<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    return this.peticion<T>(ruta, { metodo: 'PATCH', cuerpo });
  }

  delete<T>(ruta: string): Promise<T> {
    return this.peticion<T>(ruta, { metodo: 'DELETE' });
  }
}

/** Almacen en memoria: util para pruebas y como respaldo. */
export class AlmacenMemoria implements AlmacenToken {
  private token: string | null = null;

  async obtener(): Promise<string | null> {
    return this.token;
  }

  async guardar(token: string): Promise<void> {
    this.token = token;
  }

  async limpiar(): Promise<void> {
    this.token = null;
  }
}
