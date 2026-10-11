/** Tipos transversales: paginacion, respuestas de la API y filtros. */

/** Campos que toda entidad transaccional hereda (ver EntidadBase). */
export interface EntidadBase {
  readonly id: number;
  readonly activo: boolean;
  readonly fechaCreacion: string;
  readonly fechaModificacion: string | null;
}

/** Registro historico: no se edita ni se inactiva (HU-TRA-01, HU-TRA-05). */
export interface EntidadInmutable {
  readonly id: number;
  readonly fechaCreacion: string;
}

export interface Paginado<T> {
  readonly items: readonly T[];
  readonly pagina: number;
  readonly tamanoPagina: number;
  readonly total: number;
  readonly totalPaginas: number;
}

export interface FiltroPaginado {
  pagina?: number;
  tamanoPagina?: number;
}

/** Error que devuelve la API. Coincide con ProblemDetails de ASP.NET Core. */
export interface ErrorApi {
  readonly titulo: string;
  readonly detalle?: string;
  readonly estadoHttp: number;
  /** Errores por campo, para pintarlos junto a cada input del formulario. */
  readonly errores?: Readonly<Record<string, readonly string[]>>;
}

/** Resultado de validar si un usuario puede postularse (HU-ADO-01). */
export interface ResultadoValidacion {
  readonly puedeContinuar: boolean;
  readonly faltantes: readonly string[];
}

export interface OpcionCatalogo {
  readonly id: number;
  readonly nombre: string;
  readonly activo: boolean;
}
