import { useQuery } from '@tanstack/react-query';
import { Star } from 'lucide-react';
import { ETIQUETA_TIPO_NECESIDAD, EstadoNecesidad, formatearFecha } from '@huellitas/shared';
import { api } from '@/lib/api';

/** Estrellas de 1 a 5; el número va en el texto para el lector de pantalla. */
export function Estrellas({ puntaje }: { puntaje: number }) {
  return (
    <span className="estrellas" role="img" aria-label={`${puntaje} de 5 estrellas`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={16} strokeWidth={1.75} aria-hidden="true" className={i <= Math.round(puntaje) ? 'estrellas__llena' : 'estrellas__vacia'} />
      ))}
    </span>
  );
}

/** HU-REF-03: lo que el refugio necesita que le donen (solo lo publicado). */
export function NecesidadesPublicas({ refugioId }: { refugioId: number }) {
  const consulta = useQuery({ queryKey: ['necesidades', refugioId, 'publicas'], queryFn: () => api.refugios.necesidades(refugioId, { tamanoPagina: 50 }), retry: false });
  const abiertas = consulta.data?.items.filter((n) => n.estado === EstadoNecesidad.Publicada) ?? [];
  if (consulta.isPending || consulta.isError || abiertas.length === 0) return null;
  return (
    <section className="refugio-panel"><h2>Cómo puedes ayudar</h2>
      <ul className="refugio-necesidades">
        {abiertas.map((n) => (
          <li key={n.id}>
            <span className="refugio-necesidades__tipo">{ETIQUETA_TIPO_NECESIDAD[n.tipo]}</span>
            <p>{n.descripcion}</p>
            {n.medioDonacion && <p className="refugio-necesidades__medio">Cómo donar: {n.medioDonacion}</p>}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** HU-REF-04: opiniones de quienes adoptaron, con el promedio de lo cargado. */
export function OpinionesRefugio({ refugioId }: { refugioId: number }) {
  const consulta = useQuery({ queryKey: ['opiniones', refugioId], queryFn: () => api.refugios.opiniones(refugioId, { tamanoPagina: 20 }), retry: false });
  if (consulta.isPending || consulta.isError) return null;
  const items = consulta.data.items;
  const promedio = items.length ? items.reduce((s, o) => s + o.puntaje, 0) / items.length : 0;
  return (
    <section className="refugio-panel"><h2>Opiniones de adoptantes</h2>
      {items.length === 0 ? <p>Aún no hay opiniones. Las dejan quienes ya adoptaron en este refugio.</p> : (
        <>
          <p className="refugio-opiniones__resumen"><strong>{promedio.toFixed(1)}</strong> <Estrellas puntaje={promedio} /> <span>{consulta.data.total} {consulta.data.total === 1 ? 'opinión' : 'opiniones'}</span></p>
          <ul className="refugio-opiniones">
            {items.map((o) => (
              <li key={o.id}>
                <div className="refugio-opiniones__cabecera"><strong>{o.autor}</strong><Estrellas puntaje={o.puntaje} /></div>
                {o.comentario && <p>{o.comentario}</p>}
                <p className="refugio-opiniones__fecha">{formatearFecha(o.fecha)}</p>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
