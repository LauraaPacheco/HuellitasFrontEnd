import { useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import './calendarioMes.css';

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const ANIOS_POR_PAGINA = 12;

const dos = (n: number) => String(n).padStart(2, '0');
/** Fecha local como AAAA-MM-DD (sin pasar por UTC). */
export const isoDia = (f: Date) => `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
const primeroDelMes = (dia: string) => { const [a = 0, m = 1] = dia.split('-').map(Number); return new Date(a, m - 1, 1); };
/** Clave AAAA-MM para comparar meses como texto. */
const claveMes = (anio: number, mes: number) => `${anio}-${dos(mes + 1)}`;

type Vista = 'dias' | 'meses' | 'anios';

/**
 * Calendario con tres vistas, como los de los sistemas operativos:
 * los días del mes, y al tocar el mes o el año del encabezado, una
 * rejilla para saltar directo a otro mes o a otro año. Lunes primero,
 * hoy con borde y el día elegido relleno con el verde de la marca.
 * `desde` y `hasta` (AAAA-MM-DD, incluidos) limitan días, meses y años;
 * `habilitado` filtra días sueltos.
 */
export function CalendarioMes({
  valor,
  alElegir,
  desde,
  hasta,
  habilitado,
}: {
  readonly valor: string;
  readonly alElegir: (dia: string) => void;
  readonly desde?: string;
  readonly hasta?: string;
  readonly habilitado?: (dia: string) => boolean;
}) {
  const hoy = isoDia(new Date());
  const [mes, setMes] = useState(() => primeroDelMes(valor || (hasta && hasta < hoy ? hasta : desde && desde > hoy ? desde : hoy)));
  const [vista, setVista] = useState<Vista>('dias');
  const anio = mes.getFullYear();
  const [inicioAnios, setInicioAnios] = useState(() => anio - (ANIOS_POR_PAGINA - 1));

  const minMes = desde?.slice(0, 7);
  const maxMes = hasta?.slice(0, 7);
  const minAnio = desde ? Number(desde.slice(0, 4)) : -Infinity;
  const maxAnio = hasta ? Number(hasta.slice(0, 4)) : Infinity;
  const mesValido = (a: number, m: number) => { const c = claveMes(a, m); return (!minMes || c >= minMes) && (!maxMes || c <= maxMes); };
  const disponible = (dia: string) => (!desde || dia >= desde) && (!hasta || dia <= hasta) && (habilitado?.(dia) ?? true);

  /** Va al mes pedido, ajustado al rango si se sale. */
  function irA(a: number, m: number) {
    let destino = claveMes(a, m);
    if (minMes && destino < minMes) destino = minMes;
    if (maxMes && destino > maxMes) destino = maxMes;
    setMes(primeroDelMes(`${destino}-01`));
  }

  // Lo que hacen las flechas depende de la vista: un mes, un año o una página de años.
  const flechas = {
    dias: {
      atras: !minMes || claveMes(anio, mes.getMonth()) > minMes,
      adelante: !maxMes || claveMes(anio, mes.getMonth()) < maxMes,
      mover: (d: number) => setMes(new Date(anio, mes.getMonth() + d, 1)),
      atrasTexto: 'Mes anterior', adelanteTexto: 'Mes siguiente',
    },
    meses: {
      atras: anio > minAnio,
      adelante: anio < maxAnio,
      mover: (d: number) => irA(anio + d, mes.getMonth()),
      atrasTexto: 'Año anterior', adelanteTexto: 'Año siguiente',
    },
    anios: {
      atras: inicioAnios > minAnio,
      adelante: inicioAnios + ANIOS_POR_PAGINA - 1 < maxAnio,
      mover: (d: number) => setInicioAnios((i) => i + d * ANIOS_POR_PAGINA),
      atrasTexto: 'Años anteriores', adelanteTexto: 'Años siguientes',
    },
  }[vista];

  function abrirAnios() {
    // La página termina en el año que se ve (así salen los anteriores de un
    // vistazo) sin pasarse del último año permitido ni empezar antes del primero.
    let inicio = anio - (ANIOS_POR_PAGINA - 1);
    if (inicio + ANIOS_POR_PAGINA - 1 > maxAnio) inicio = maxAnio - (ANIOS_POR_PAGINA - 1);
    if (inicio < minAnio) inicio = minAnio;
    setInicioAnios(inicio);
    setVista(vista === 'anios' ? 'dias' : 'anios');
  }

  const offset = (mes.getDay() + 6) % 7;
  const totalDias = new Date(anio, mes.getMonth() + 1, 0).getDate();
  const titulo = `${MESES[mes.getMonth()]} de ${anio}`;
  const anios = Array.from({ length: ANIOS_POR_PAGINA }, (_, i) => inicioAnios + i);

  return (
    <div className="cm">
      <div className="cm__navegacion">
        <button type="button" className="cm__flecha" aria-label={flechas.atrasTexto} disabled={!flechas.atras} onClick={() => flechas.mover(-1)}>
          <ChevronLeft size={18} strokeWidth={2} aria-hidden="true" />
        </button>
        <div className="cm__titulo" aria-live="polite">
          <button type="button" className="cm__selector" aria-expanded={vista === 'meses'} aria-label={`Cambiar mes, ahora ${MESES[mes.getMonth()]}`}
            onClick={() => setVista(vista === 'meses' ? 'dias' : 'meses')}>
            <span className="cm__mes">{MESES[mes.getMonth()]}</span>
            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className={vista === 'meses' ? 'cm__chevron--abierto' : undefined} />
          </button>
          <button type="button" className="cm__selector" aria-expanded={vista === 'anios'} aria-label={`Cambiar año, ahora ${anio}`} onClick={abrirAnios}>
            <span>{anio}</span>
            <ChevronDown size={14} strokeWidth={2} aria-hidden="true" className={vista === 'anios' ? 'cm__chevron--abierto' : undefined} />
          </button>
        </div>
        <button type="button" className="cm__flecha" aria-label={flechas.adelanteTexto} disabled={!flechas.adelante} onClick={() => flechas.mover(1)}>
          <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
        </button>
      </div>

      {vista === 'meses' && (
        <div className="cm__rejilla" role="group" aria-label={`Meses de ${anio}`}>
          {MESES.map((nombre, i) => (
            <button key={nombre} type="button" className="cm__opcion"
              disabled={!mesValido(anio, i)}
              aria-pressed={i === mes.getMonth()}
              aria-current={claveMes(anio, i) === hoy.slice(0, 7) ? 'date' : undefined}
              onClick={() => { setMes(new Date(anio, i, 1)); setVista('dias'); }}>
              {nombre.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {vista === 'anios' && (
        <div className="cm__rejilla" role="group" aria-label={`Años de ${anios[0]} a ${anios[anios.length - 1]}`}>
          {anios.map((a) => (
            <button key={a} type="button" className="cm__opcion"
              disabled={a < minAnio || a > maxAnio}
              aria-pressed={a === anio}
              aria-current={String(a) === hoy.slice(0, 4) ? 'date' : undefined}
              onClick={() => { irA(a, mes.getMonth()); setVista('meses'); }}>
              {a}
            </button>
          ))}
        </div>
      )}

      {vista === 'dias' && (
        <>
          <div className="cm__semana" aria-hidden="true">
            {DIAS_SEMANA.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="cm__dias" role="group" aria-label={titulo}>
            {Array.from({ length: offset }, (_, i) => <span key={`vacio-${i}`} />)}
            {Array.from({ length: totalDias }, (_, i) => {
              const fecha = new Date(anio, mes.getMonth(), i + 1);
              const codigo = isoDia(fecha);
              return (
                <button
                  key={codigo}
                  type="button"
                  className="cm__dia"
                  disabled={!disponible(codigo)}
                  aria-label={fecha.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                  aria-pressed={valor === codigo}
                  aria-current={codigo === hoy ? 'date' : undefined}
                  onClick={() => alElegir(codigo)}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
