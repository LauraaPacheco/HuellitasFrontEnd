/**
 * Cliente HTTP agnostico de plataforma: usa solo fetch, que existe tanto
 * en el navegador como en React Native. No importa nada de react-dom ni
 * de react-native, por eso lo pueden usar las dos apps.
 */

import type { ErrorApi } from '../types/comun';

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
  /** Se dispara cuando la API responde 401, para cerrar sesion en la app. */
  readonly alExpirarSesion?: () => void;
  readonly tiempoLimiteMs?: number;
}

type Metodo = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface OpcionesPeticion {
  readonly metodo?: Metodo;
  readonly cuerpo?: unknown;
  readonly parametros?: Record<string, unknown>;
  readonly senal?: AbortSignal;
}

const TIEMPO_LIMITE_POR_DEFECTO = 15_000;

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

  constructor(config: ConfiguracionCliente) {
    this.config = config;
  }

  async peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    const { metodo = 'GET', cuerpo, parametros, senal } = opciones;
    const token = await this.config.almacen.obtener();

    const cabeceras: Record<string, string> = { Accept: 'application/json' };
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
    senal?.addEventListener('abort', () => controlador.abort());

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

    if (respuesta.status === 401) {
      await this.config.almacen.limpiar();
      this.config.alExpirarSesion?.();
    }

    if (respuesta.status === 204) return undefined as T;

    const texto = await respuesta.text();
    const datos: unknown = texto ? JSON.parse(texto) : null;

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
