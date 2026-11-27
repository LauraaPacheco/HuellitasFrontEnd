import { useEffect, useId, useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { CalendarioMes, isoDia } from '../CalendarioMes/CalendarioMes';
import './campoFecha.css';

/**
 * Campo de fecha (sin hora) con el calendario de la app en lugar del
 * nativo del navegador. Se despliega debajo del campo, dentro del mismo
 * flujo, así que funciona dentro de un modal sin abrir otro encima.
 * Devuelve AAAA-MM-DD, igual que un input type="date".
 */
export function CampoFecha({
  etiqueta,
  valor,
  alCambiar,
  desde,
  hasta,
  atajoHoy = true,
}: {
  readonly etiqueta: string;
  readonly valor: string;
  readonly alCambiar: (dia: string) => void;
  readonly desde?: string;
  readonly hasta?: string;
  readonly atajoHoy?: boolean;
}) {
  const id = useId();
  const contenedor = useRef<HTMLDivElement>(null);
  const [abierto, setAbierto] = useState(false);
  const hoy = isoDia(new Date());
  const hoyValido = (!desde || hoy >= desde) && (!hasta || hoy <= hasta);
  const texto = valor
    ? new Date(`${valor}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : 'Selecciona una fecha';

  // Se cierra al hacer clic fuera o con Escape (sin cerrar el modal que lo contiene).
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: PointerEvent) => { if (!contenedor.current?.contains(e.target as Node)) setAbierto(false); };
    document.addEventListener('pointerdown', fuera);
    return () => document.removeEventListener('pointerdown', fuera);
  }, [abierto]);

  function elegir(dia: string) {
    alCambiar(dia);
    setAbierto(false);
    contenedor.current?.querySelector<HTMLButtonElement>('.campo-fecha__control')?.focus();
  }

  return (
    <div
      ref={contenedor}
      className="campo campo-fecha"
      onKeyDown={(e) => { if (e.key === 'Escape' && abierto) { e.preventDefault(); e.stopPropagation(); setAbierto(false); } }}
    >
      <span className="campo__etiqueta" id={`${id}-etiqueta`}>{etiqueta}</span>
      <button
        type="button"
        className={`campo__control campo-fecha__control${valor ? '' : ' campo-fecha__control--vacio'}`}
        aria-labelledby={`${id}-etiqueta ${id}-valor`}
        aria-expanded={abierto}
        aria-controls={`${id}-panel`}
        onClick={() => setAbierto((a) => !a)}
      >
        <span id={`${id}-valor`} className="campo-fecha__texto">{texto}</span>
        <CalendarDays size={18} strokeWidth={1.75} aria-hidden="true" />
      </button>
      {abierto && (
        <div id={`${id}-panel`} className="campo-fecha__panel">
          <CalendarioMes valor={valor} alElegir={elegir} desde={desde} hasta={hasta} />
          {atajoHoy && hoyValido && (
            <div className="campo-fecha__pie">
              <button type="button" className="campo-fecha__hoy" onClick={() => elegir(hoy)}>Hoy</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
