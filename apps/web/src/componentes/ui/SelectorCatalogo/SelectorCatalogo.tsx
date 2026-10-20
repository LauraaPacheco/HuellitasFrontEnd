import type { OpcionCatalogo } from '@huellitas/shared';
import { opcionesElegibles } from '@/casos/catalogos';
import { Boton } from '../Boton/Boton';
import './selectorCatalogo.css';

interface Props<T extends OpcionCatalogo> {
  readonly id: string;
  readonly etiqueta: string;
  readonly opciones: readonly T[] | undefined;
  readonly valor: number | undefined;
  readonly alCambiar: (valor: number | undefined) => void;
  /** Texto de la opción vacía. Para exigir una selección, usa requerido. */
  readonly textoVacio?: string;
  readonly cargando?: boolean;
  readonly errorCarga?: boolean;
  readonly alReintentar?: () => void;
  readonly requerido?: boolean;
  /**
   * Para una dependencia que todavia no se cumple, como la raza antes de
   * elegir especie. Lleva su propio texto porque un desplegable gris sin
   * explicacion no dice por que no se puede usar.
   */
  readonly bloqueadoPor?: string;
  readonly ayuda?: string;
  readonly error?: string;
  /** La etiqueta se oculta a la vista pero sigue ahi para el lector. */
  readonly etiquetaOculta?: boolean;
}

/**
 * Desplegable alimentado por un catalogo parametrico (HU-MAS-02).
 *
 * Existe para que el filtrado de opciones no se repita: cada pantalla
 * que pintara su propio <select> acabaria decidiendo por su cuenta que
 * hacer con las opciones dadas de baja, y tarde o temprano una se
 * olvidaria. Aqui se decide una vez, en opcionesElegibles.
 *
 * Los tres estados en que no se puede elegir -cargando, bloqueado por
 * otro campo y catalogo vacio- llevan texto, no solo el gris de
 * deshabilitado: el color por si solo no explica nada.
 */
export function SelectorCatalogo<T extends OpcionCatalogo>({
  id,
  etiqueta,
  opciones,
  valor,
  alCambiar,
  textoVacio,
  cargando = false,
  errorCarga = false,
  alReintentar,
  requerido = false,
  bloqueadoPor,
  ayuda,
  error,
  etiquetaOculta = false,
}: Props<T>) {
  const elegibles = opcionesElegibles(opciones, valor);
  const vacio = !cargando && bloqueadoPor === undefined && elegibles.length === 0;
  const falloCarga = errorCarga && bloqueadoPor === undefined;
  const inutilizable = cargando || bloqueadoPor !== undefined || vacio || falloCarga;
  const mensajeError = error ?? (falloCarga ? 'No pudimos cargar las opciones. Vuelve a intentarlo.' : undefined);

  const idAyuda = ayuda ? `${id}-ayuda` : undefined;
  const idError = mensajeError ? `${id}-error` : undefined;

  const marcador = bloqueadoPor !== undefined
    ? bloqueadoPor
    : cargando
      ? 'Cargando…'
      : falloCarga
        ? 'Opciones no disponibles'
        : vacio
          ? 'Sin opciones disponibles'
          : textoVacio ?? 'Selecciona una opción';

  return (
    <div className="campo">
      <label
        className={etiquetaOculta ? 'visualmente-oculto' : 'campo__etiqueta'}
        htmlFor={id}
      >
        {etiqueta}
      </label>

      <select
        id={id}
        className={`campo__control${mensajeError ? ' campo__control--error' : ''}`}
        value={valor ?? ''}
        disabled={inutilizable}
        required={requerido}
        aria-busy={cargando || undefined}
        aria-invalid={mensajeError ? true : undefined}
        aria-describedby={[idAyuda, idError].filter(Boolean).join(' ') || undefined}
        onChange={(evento) =>
          alCambiar(evento.target.value ? Number(evento.target.value) : undefined)
        }
      >
        {/*
          La opcion vacia se pinta siempre que haya un marcador que
          mostrar, y tambien mientras no se pueda elegir: sin ella el
          navegador ensena la primera opcion real y parece que ya hay
          algo seleccionado.
        */}
        {marcador !== undefined && <option value="">{marcador}</option>}

        {elegibles.map((opcion) => (
          <option key={opcion.id} value={opcion.id} disabled={!opcion.activo}>
            {opcion.nombre}
            {/* Una opcion dada de baja solo aparece si es el valor
                guardado; se marca para que se entienda por que esta. */}
            {!opcion.activo ? ' (dada de baja)' : ''}
          </option>
        ))}
      </select>

      {ayuda && (
        <p className="campo__ayuda" id={idAyuda}>
          {ayuda}
        </p>
      )}
      {mensajeError && (
        <p className="campo__error" id={idError} role="alert">
          {mensajeError}
        </p>
      )}
      {falloCarga && alReintentar && (
        <Boton variante="texto" onClick={alReintentar} disabled={cargando}>
          Reintentar {etiqueta.toLowerCase()}
        </Boton>
      )}
    </div>
  );
}
