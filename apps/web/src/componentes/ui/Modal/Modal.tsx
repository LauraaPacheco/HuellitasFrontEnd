import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import './modal.css';

let modalesAbiertos = 0;
let desbordamientoAnterior = '';

/** El diálogo nativo gestiona el foco, Escape y la pila de modales. */
export function Modal({ titulo, children, alCerrar, ocupado = false, compacto = false }: {
  titulo: string;
  children: ReactNode;
  alCerrar: () => void;
  ocupado?: boolean;
  compacto?: boolean;
}) {
  const referencia = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialogo = referencia.current;
    if (!dialogo) return;
    const focoAnterior = document.activeElement;
    if (modalesAbiertos++ === 0) {
      desbordamientoAnterior = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    dialogo.showModal();
    return () => {
      dialogo.close();
      if (--modalesAbiertos === 0) document.body.style.overflow = desbordamientoAnterior;
      if (focoAnterior instanceof HTMLElement && focoAnterior.isConnected) focoAnterior.focus({ preventScroll: true });
    };
  }, []);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <dialog ref={referencia} className={`modal${compacto ? ' modal--compacto' : ''}`}
      aria-labelledby={id} aria-busy={ocupado || undefined}
      onCancel={evento => { evento.preventDefault(); if (!ocupado) alCerrar(); }}
      onClick={evento => { if (evento.target === evento.currentTarget && !ocupado) alCerrar(); }}>
      <div className="modal__contenido">
        <header className="modal__cabecera">
          <h2 id={id}>{titulo}</h2>
          <button type="button" className="modal__cerrar" aria-label={`Cerrar ${titulo}`} disabled={ocupado} onClick={alCerrar}>×</button>
        </header>
        {children}
      </div>
    </dialog>, document.body,
  );
}
