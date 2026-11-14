import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import './selectorFechaHora.css';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];

const dos = (n: number) => String(n).padStart(2, '0');
const isoDia = (f: Date) => `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;

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
  const [mes, setMes] = useState(() => {
    const base = diaElegido ? new Date(`${diaElegido}T12:00:00`) : ahora;
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const primerMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ultimoMes = new Date(ahora.getFullYear(), ahora.getMonth() + mesesAdelante, 1);
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

  function moverMes(delta: number) {
    setMes(new Date(mes.getFullYear(), mes.getMonth() + delta, 1));
  }

  const offset = (mes.getDay() + 6) % 7;
  const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const titulo = `${MESES[mes.getMonth()]} de ${mes.getFullYear()}`;

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
        <div className="sfh__calendario">
          <div className="sfh__navegacion">
            <button type="button" className="sfh__flecha" aria-label="Mes anterior" disabled={mes <= primerMes} onClick={() => moverMes(-1)}>
              <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
            </button>
            <span className="sfh__mes" aria-live="polite">{titulo}</span>
            <button type="button" className="sfh__flecha" aria-label="Mes siguiente" disabled={mes >= ultimoMes} onClick={() => moverMes(1)}>
              <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
            </button>
          </div>
          <div className="sfh__semana" aria-hidden="true">
            {DIAS_SEMANA.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="sfh__dias" role="group" aria-label={titulo}>
            {Array.from({ length: offset }, (_, i) => <span key={`vacio-${i}`} />)}
            {Array.from({ length: totalDias }, (_, i) => {
              const fecha = new Date(mes.getFullYear(), mes.getMonth(), i + 1);
              const codigo = isoDia(fecha);
              return (
                <button
                  key={codigo}
                  type="button"
                  className="sfh__dia"
                  disabled={!diaDisponible(codigo)}
                  aria-label={fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                  aria-pressed={diaElegido === codigo}
                  aria-current={codigo === hoy ? 'date' : undefined}
                  onClick={() => elegirDia(codigo)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </div>

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
