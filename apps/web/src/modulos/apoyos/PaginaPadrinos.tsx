import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, HeartHandshake, X } from 'lucide-react';
import {
  ErrorHttp, ESTADO_APADRINAMIENTO, EstadoApadrinamiento, formatearFecha, type ApadrinamientoResumen,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import '@/componentes/ui/Campo/campo.css';
import '@/modulos/cuenta/cuenta.css';
import './apoyos.css';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);
type Filtro = 'pendientes' | 'activos' | 'finalizados';
const FILTROS: { valor: Filtro; etiqueta: string; estado: EstadoApadrinamiento }[] = [
  { valor: 'pendientes', etiqueta: 'Por responder', estado: EstadoApadrinamiento.Solicitado },
  { valor: 'activos', etiqueta: 'Activos', estado: EstadoApadrinamiento.Activo },
  { valor: 'finalizados', etiqueta: 'Finalizados', estado: EstadoApadrinamiento.Finalizado },
];

/**
 * HU-REF-03: personas que quieren apadrinar a una mascota del refugio.
 * El refugio acepta o rechaza cada solicitud; el padrino puede cancelar
 * después desde la app.
 */
export function PaginaPadrinos() {
  const cache = useQueryClient();
  const [filtro, setFiltro] = useState<Filtro>('pendientes');
  const [decision, setDecision] = useState<{ apadrinamiento: ApadrinamientoResumen; aceptar: boolean }>();
  const [mensaje, setMensaje] = useState('');

  const consulta = useQuery({
    queryKey: ['apadrinamientos', 'refugio'],
    queryFn: () => api.refugios.apadrinamientosRefugio({ tamanoPagina: 100 }),
    retry: false,
  });

  const items = consulta.data?.items ?? [];
  const actual = FILTROS.find((f) => f.valor === filtro)!;
  const visibles = items.filter((a) => a.estado === actual.estado).sort((a, b) => b.fechaInicio.localeCompare(a.fechaInicio));

  return (
    <>
      <Encabezado titulo="Padrinos" resumen="Personas que quieren apoyar a una de tus mascotas mientras encuentra hogar." />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}

      {consulta.isPending ? (
        <EstadoCargando mensaje="Cargando padrinos…" />
      ) : consulta.isError ? (
        <EstadoError titulo="No pudimos cargar los apadrinamientos" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      ) : items.length === 0 ? (
        <EstadoVacio ilustracion="trio" titulo="Aún no tienes padrinos" descripcion="Cuando alguien quiera apadrinar a una de tus mascotas desde la app, aparecerá aquí para que lo aceptes." />
      ) : (
        <>
          <div className="apoyos-pestanas" role="group" aria-label="Filtrar por estado">
            {FILTROS.map((f) => (
              <button key={f.valor} type="button" className="apoyos-pestana" aria-pressed={filtro === f.valor} onClick={() => setFiltro(f.valor)}>
                {f.etiqueta} · {items.filter((a) => a.estado === f.estado).length}
              </button>
            ))}
          </div>
          {visibles.length === 0 ? (
            <p className="cuenta__aviso">{filtro === 'pendientes' ? 'No tienes solicitudes por responder.' : 'No hay apadrinamientos en este estado.'}</p>
          ) : (
            <ul className="apoyos-rejilla">
              {visibles.map((a) => (
                <li key={a.id} className="apoyos-tarjeta">
                  <div className="apoyos-tarjeta__cabecera">
                    <p className="apoyos-tarjeta__titulo"><HeartHandshake size={16} strokeWidth={1.75} aria-hidden="true" /> {a.mascotaNombre}</p>
                    <Insignia estado={ESTADO_APADRINAMIENTO[a.estado]} />
                  </div>
                  <p className="apoyos-tarjeta__dato"><strong>Padrino:</strong> {a.padrinoNombre}</p>
                  {a.observacion && <p className="apoyos-tarjeta__texto">«{a.observacion}»</p>}
                  <p className="apoyos-tarjeta__fecha">Desde el {formatearFecha(a.fechaInicio)}</p>
                  {a.estado === EstadoApadrinamiento.Solicitado && (
                    <div className="apoyos-tarjeta__acciones">
                      <Boton variante="primario" onClick={() => { setMensaje(''); setDecision({ apadrinamiento: a, aceptar: true }); }}><Check size={16} strokeWidth={2} aria-hidden="true" /> Aceptar</Boton>
                      <Boton variante="peligro" onClick={() => { setMensaje(''); setDecision({ apadrinamiento: a, aceptar: false }); }}><X size={16} strokeWidth={2} aria-hidden="true" /> Rechazar</Boton>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </>
      )}

      {decision && (
        <Decision
          {...decision}
          alCerrar={(hecho) => {
            setDecision(undefined);
            if (hecho) {
              setMensaje(decision.aceptar ? `Aceptaste a ${decision.apadrinamiento.padrinoNombre} como padrino de ${decision.apadrinamiento.mascotaNombre}.` : 'Rechazaste la solicitud de apadrinamiento.');
              void cache.invalidateQueries({ queryKey: ['apadrinamientos'] });
            }
          }}
        />
      )}
    </>
  );
}

function Decision({ apadrinamiento: a, aceptar, alCerrar }: { apadrinamiento: ApadrinamientoResumen; aceptar: boolean; alCerrar: (hecho: boolean) => void }) {
  const [observacion, setObservacion] = useState('');
  const gestionar = useMutation({
    mutationFn: () => api.refugios.gestionarApadrinamiento(a.id, aceptar, observacion),
    onSuccess: () => alCerrar(true),
  });
  return (
    <Modal titulo={aceptar ? 'Aceptar padrino' : 'Rechazar solicitud'} compacto ocupado={gestionar.isPending} alCerrar={() => alCerrar(false)}>
      <p>{aceptar ? `${a.padrinoNombre} quedará como padrino activo de ${a.mascotaNombre}.` : `${a.padrinoNombre} no quedará como padrino de ${a.mascotaNombre}.`}</p>
      <label className="campo">
        <span className="campo__etiqueta">Mensaje para el padrino (opcional)</span>
        <textarea className="campo__control apoyos-area" maxLength={300} value={observacion} disabled={gestionar.isPending}
          placeholder={aceptar ? 'Gracias por tu apoyo. Te escribiremos para coordinar.' : 'Por ahora no recibimos padrinos para esta mascota.'}
          onChange={(e) => setObservacion(e.target.value)} />
      </label>
      {gestionar.isError && <p role="alert" className="campo__error">{errorTexto(gestionar.error)}</p>}
      <div className="apoyos-pie">
        <Boton disabled={gestionar.isPending} onClick={() => alCerrar(false)}>Cancelar</Boton>
        <Boton variante={aceptar ? 'primario' : 'peligro'} cargando={gestionar.isPending} onClick={() => gestionar.mutate()}>{aceptar ? 'Aceptar' : 'Rechazar'}</Boton>
      </div>
    </Modal>
  );
}
