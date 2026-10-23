import { useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Boton } from '../Boton';
import './calendario.css';

const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const iso = (fecha: Date) => `${String(fecha.getFullYear()).padStart(4, '0')}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;

/** Calendario de ingreso: no permite seleccionar días posteriores a hoy. */
export function Calendario({ id, etiqueta, valor, alCambiar, error }: {
  id: string; etiqueta: string; valor: string; alCambiar: (valor: string) => void; error?: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [mes, setMes] = useState(() => new Date());
  const hoy = new Date();
  const finMes = new Date(mes); finMes.setMonth(finMes.getMonth() + 1, 0);
  const ultimo = finMes.getDate();
  const inicioMes = new Date(mes); inicioMes.setDate(1);
  const offset = (inicioMes.getDay() + 6) % 7;
  const fecha = valor ? new Date(`${valor}T12:00:00`) : null;
  const mostrar = fecha && Number.isFinite(fecha.getTime()) ? fecha.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' }) : 'Selecciona una fecha';
  function abrir() {
    const inicial = fecha && Number.isFinite(fecha.getTime()) ? fecha : hoy;
    const inicio = new Date(inicial); inicio.setDate(1); setMes(inicio); setAbierto(true);
  }
  function moverMes(delta: number) { const siguiente = new Date(mes); siguiente.setMonth(siguiente.getMonth() + delta); setMes(siguiente); }
  const mesActual = mes.getFullYear() === hoy.getFullYear() && mes.getMonth() === hoy.getMonth();
  return <div className="campo">
    <label className="campo__etiqueta" htmlFor={id}>{etiqueta}</label>
    <button id={id} type="button" className={`campo__control calendario__abrir${error ? ' campo__control--error' : ''}`} onClick={abrir}
      aria-haspopup="dialog" aria-expanded={abierto} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined}>
      <span>{mostrar}</span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4m10-4v4M3 11h18"/></svg>
    </button>
    {error && <p className="campo__error" id={`${id}-error`} role="alert">{error}</p>}
    {abierto && <Modal titulo="Fecha de ingreso" compacto alCerrar={() => setAbierto(false)}>
      <p className="calendario__ayuda">Elige el día en que llegó al refugio.</p>
      <div className="calendario__navegacion">
        <button type="button" className="calendario__flecha" aria-label="Mes anterior" disabled={mes.getFullYear() === 1 && mes.getMonth() === 0} onClick={() => moverMes(-1)}>‹</button>
        <div className="calendario__periodo">
          <label><span className="visualmente-oculto">Mes</span><select value={mes.getMonth()} onChange={e => { const siguiente = new Date(mes); siguiente.setMonth(Number(e.target.value)); setMes(siguiente); }}>{meses.map((nombre, i) => <option value={i} key={nombre} disabled={mes.getFullYear() === hoy.getFullYear() && i > hoy.getMonth()}>{nombre}</option>)}</select></label>
          <label><span className="visualmente-oculto">Año</span><input type="number" min="1" max={hoy.getFullYear()} value={mes.getFullYear()} onChange={e => { const anio = Number(e.target.value); if (Number.isInteger(anio) && anio > 0 && anio <= hoy.getFullYear()) { const nueva = new Date(mes); nueva.setFullYear(anio); if (nueva > hoy) nueva.setMonth(hoy.getMonth()); setMes(nueva); } }} /></label>
        </div>
        <button type="button" className="calendario__flecha" aria-label="Mes siguiente" disabled={mesActual} onClick={() => moverMes(1)}>›</button>
      </div>
      <div className="calendario__semana" aria-hidden="true">{['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="calendario__dias" role="group" aria-label={`${meses[mes.getMonth()]} de ${mes.getFullYear()}`}>
        {Array.from({ length: offset }, (_, i) => <span key={`vacio-${i}`} />)}
        {Array.from({ length: ultimo }, (_, i) => {
          const dia = new Date(mes); dia.setDate(i + 1); const codigo = iso(dia);
          return <button key={codigo} type="button" disabled={codigo > iso(hoy)}
            aria-label={dia.toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
            aria-pressed={valor === codigo} aria-current={codigo === iso(hoy) ? 'date' : undefined}
            onClick={() => { alCambiar(codigo); setAbierto(false); }}>{i + 1}</button>;
        })}
      </div>
      <div className="calendario__pie"><Boton variante="texto" onClick={() => { alCambiar(iso(hoy)); setAbierto(false); }}>Elegir hoy</Boton><Boton onClick={() => setAbierto(false)}>Cancelar</Boton></div>
    </Modal>}
  </div>;
}
