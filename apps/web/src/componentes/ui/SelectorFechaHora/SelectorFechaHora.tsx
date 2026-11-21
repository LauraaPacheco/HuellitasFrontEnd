import { useMemo } from 'react';
import { CalendarioMes, isoDia } from '../CalendarioMes/CalendarioMes';
import './selectorFechaHora.css';


const dos = (n: number) => String(n).padStart(2, '0');

/** "14:30" → "2:30 p. m." */
function horaLegible(hora: string) {
  const [h = 0, m = 0] = hora.split(':').map(Number);
  const sufijo = h < 12 ? 'a. m.' : 'p. m.';
  return `${h % 12 || 12}:${dos(m)} ${sufijo}`;
}

/**
 * Selector de fecha y hora para citas futuras.
 *
 * Se dibuja en línea (pensado para ir dentro de un modal): un calendario
 * donde solo se eligen días desde hoy y una rejilla de horarios dentro de
 * la jornada. Devuelve el mismo formato que `datetime-local`
 * ("AAAA-MM-DDTHH:mm", hora local) para no tocar a quien lo consume.
 */
export function SelectorFechaHora({
  etiqueta,
  valor,
  alCambiar,
  horaInicio = 8,
  horaFin = 18,
  intervaloMinutos = 30,
  mesesAdelante = 6,
}: {
  etiqueta: string;
  valor: string;
  alCambiar: (valor: string) => void;
  /** Primera hora disponible (incluida). */
  horaInicio?: number;
  /** Hora de cierre (excluida). */
  horaFin?: number;
  intervaloMinutos?: number;
  /** Hasta cuántos meses hacia adelante se puede agendar. */
  mesesAdelante?: number;
}) {
  const ahora = new Date();
  const hoy = isoDia(ahora);
  const [diaElegido = '', horaElegida = ''] = valor ? valor.split('T') : [];
  const limite = isoDia(new Date(ahora.getFullYear(), ahora.getMonth() + mesesAdelante + 1, 0));

  const horarios = useMemo(() => {
    const lista: string[] = [];
    for (let min = horaInicio * 60; min < horaFin * 60; min += intervaloMinutos) {
      lista.push(`${dos(Math.floor(min / 60))}:${dos(min % 60)}`);
    }
    return lista;
  }, [horaInicio, horaFin, intervaloMinutos]);

  const horaPasada = (dia: string, hora: string) => Date.parse(`${dia}T${hora}`) <= ahora.getTime();
  // Un día solo vale si queda al menos un horario libre (hoy después del cierre no cuenta).
  const diaDisponible = (dia: string) => dia >= hoy && dia <= limite && horarios.some((h) => !horaPasada(dia, h));

  function elegirDia(dia: string) {
    const conserva = horaElegida && !horaPasada(dia, horaElegida) ? horaElegida : '';
    alCambiar(conserva ? `${dia}T${conserva}` : `${dia}T`);
  }

  const manana = horarios.filter((h) => h < '12:00');
  const tarde = horarios.filter((h) => h >= '12:00');

  const resumen = diaElegido
    ? new Date(`${diaElegido}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })
    : '';

  const grupo = (nombre: string, lista: string[]) =>
    lista.length > 0 && (
      <div className="sfh__grupo">
        <span className="sfh__grupo-titulo">{nombre}</span>
        <div className="sfh__horas">
          {lista.map((h) => (
            <button
              key={h}
              type="button"
              className="sfh__hora"
              aria-pressed={horaElegida === h}
              disabled={!diaElegido || horaPasada(diaElegido, h)}
              onClick={() => alCambiar(`${diaElegido}T${h}`)}
            >
              {horaLegible(h)}
            </button>
          ))}
        </div>
      </div>
    );

  return (
    <fieldset className="sfh">
      <legend className="sfh__etiqueta">{etiqueta}</legend>

      <div className="sfh__panel">
        <CalendarioMes valor={diaElegido} alElegir={elegirDia} desde={hoy} hasta={limite} habilitado={diaDisponible} />

        <div className="sfh__horario">
          {diaElegido ? (
            <>
              {grupo('Mañana', manana)}
              {grupo('Tarde', tarde)}
            </>
          ) : (
            <p className="sfh__vacio">Elige un día para ver los horarios.</p>
          )}
        </div>
      </div>

      <p className="sfh__resumen" aria-live="polite">
        {diaElegido && horaElegida ? (
          <>Visita el <strong>{resumen}</strong> a las <strong>{horaLegible(horaElegida)}</strong></>
        ) : diaElegido ? (
          <>Elegiste el <strong>{resumen}</strong>. Ahora elige la hora.</>
        ) : (
          'Aún no eliges fecha.'
        )}
      </p>
    </fieldset>
  );
}
