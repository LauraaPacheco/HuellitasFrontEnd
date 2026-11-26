import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react';
import { ErrorHttp } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { useSesion } from './ContextoSesion';
import '@/componentes/ui/Campo/campo.css';
import './puertaPolitica.css';

/**
 * HU-ADM-03: si se publicó una política nueva, el login lo avisa y no se
 * sigue usando el panel hasta aceptarla (o cerrar sesión).
 */
export function PuertaPolitica() {
  const { usuario, aceptarPolitica, cerrarSesion } = useSesion();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const pendiente = usuario?.politicaPendiente ?? null;
  const politica = useQuery({ queryKey: ['politica', 'activa'], queryFn: () => api.administracion.politicaActiva(), enabled: !!pendiente, retry: false });
  if (!pendiente) return null;

  async function aceptar() {
    setEnviando(true); setError('');
    try { await aceptarPolitica(); }
    catch (e) { setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos registrar tu aceptación. Inténtalo de nuevo.'); }
    finally { setEnviando(false); }
  }

  return (
    // La única salida es aceptar o cerrar sesión: cerrar el aviso también cierra la sesión.
    <Modal titulo="Actualizamos la política de datos" ocupado={enviando} alCerrar={() => void cerrarSesion()}>
      <div className="puerta-politica">
        <p className="puerta-politica__intro"><ShieldCheck size={18} strokeWidth={1.75} aria-hidden="true" /> Para seguir usando Huellitas, lee y acepta la nueva versión{pendiente.version ? ` (${pendiente.version})` : ''}.</p>
        <div className="puerta-politica__texto" tabIndex={0} aria-label="Texto de la política">
          {politica.isPending ? 'Cargando la política…' : politica.data?.contenido ?? 'No pudimos cargar el texto de la política.'}
        </div>
        {error && <p role="alert" className="campo__error">{error}</p>}
        <div className="puerta-politica__acciones">
          <Boton disabled={enviando} onClick={() => void cerrarSesion()}>Cerrar sesión</Boton>
          <Boton variante="primario" cargando={enviando} disabled={politica.isPending} onClick={() => void aceptar()}>Acepto la política</Boton>
        </div>
      </div>
    </Modal>
  );
}
