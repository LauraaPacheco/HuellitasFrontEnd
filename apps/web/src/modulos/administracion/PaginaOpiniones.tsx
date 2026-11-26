import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Star } from 'lucide-react';
import { ErrorHttp, EstadoModeracion, formatearFecha, type CalificacionAdmin } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import '@/componentes/ui/Campo/campo.css';
import '@/modulos/apoyos/apoyos.css';
import './administracion.css';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);

/** HU-REF-04: el administrador oculta las opiniones inapropiadas (o las vuelve a mostrar). */
export function PaginaOpiniones() {
  const cache = useQueryClient();
  const [estado, setEstado] = useState<EstadoModeracion>(EstadoModeracion.Publicada);
  const [mensaje, setMensaje] = useState('');
  const consulta = useQuery({
    queryKey: ['admin', 'opiniones', estado],
    queryFn: () => api.administracion.calificaciones({ estado, tamanoPagina: 50 }),
    retry: false,
  });
  const moderar = useMutation({
    mutationFn: (c: CalificacionAdmin) => api.administracion.moderarCalificacion(c.id,
      c.estado === EstadoModeracion.Publicada ? EstadoModeracion.Oculta : EstadoModeracion.Publicada),
    onSuccess: (_d, c) => {
      setMensaje(c.estado === EstadoModeracion.Publicada ? 'Ocultamos la opinión: ya no sale en el perfil del refugio.' : 'La opinión vuelve a verse en el perfil del refugio.');
      void cache.invalidateQueries({ queryKey: ['admin', 'opiniones'] });
      void cache.invalidateQueries({ queryKey: ['opiniones'] });
    },
  });

  return (
    <>
      <Encabezado titulo="Opiniones" resumen="Las calificaciones que dejan los adoptantes. Oculta las que no respetan las normas." />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}
      {moderar.isError && <p role="alert" className="campo__error">{errorTexto(moderar.error)}</p>}
      <div className="apoyos-pestanas" role="group" aria-label="Qué opiniones ver">
        {[{ v: EstadoModeracion.Publicada, t: 'Publicadas' }, { v: EstadoModeracion.Oculta, t: 'Ocultas' }].map((f) => (
          <button key={f.v} type="button" className="apoyos-pestana" aria-pressed={estado === f.v} onClick={() => { setEstado(f.v); setMensaje(''); }}>{f.t}</button>
        ))}
      </div>

      {consulta.isPending ? <EstadoCargando mensaje="Cargando opiniones…" />
        : consulta.isError ? <EstadoError titulo="No pudimos cargar las opiniones" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
        : consulta.data.items.length === 0 ? <EstadoVacio titulo={estado === EstadoModeracion.Oculta ? 'No hay opiniones ocultas' : 'No hay opiniones todavía'} descripcion="Aparecen cuando los adoptantes califican a los refugios." />
        : (
          <ul className="apoyos-rejilla">
            {consulta.data.items.map((c) => (
              <li key={c.id} className={`apoyos-tarjeta${c.estado === EstadoModeracion.Oculta ? ' apoyos-tarjeta--atenuada' : ''}`}>
                <div className="apoyos-tarjeta__cabecera">
                  <p className="apoyos-tarjeta__titulo">{c.refugioNombre}</p>
                  <span className="admin-estrellas" aria-label={`${c.puntaje} de 5 estrellas`}>
                    {[1, 2, 3, 4, 5].map((i) => <Star key={i} size={14} strokeWidth={1.75} aria-hidden="true" fill={i <= c.puntaje ? 'currentColor' : 'none'} />)}
                  </span>
                </div>
                <p className="apoyos-tarjeta__texto">{c.comentario ? `«${c.comentario}»` : 'Sin comentario'}</p>
                <p className="apoyos-tarjeta__fecha">{c.adoptanteNombre} · {formatearFecha(c.fecha)}</p>
                <div className="apoyos-tarjeta__acciones">
                  {c.estado === EstadoModeracion.Publicada
                    ? <Boton variante="peligro" disabled={moderar.isPending} onClick={() => moderar.mutate(c)}><EyeOff size={16} strokeWidth={1.75} aria-hidden="true" /> Ocultar</Boton>
                    : <Boton disabled={moderar.isPending} onClick={() => moderar.mutate(c)}><Eye size={16} strokeWidth={1.75} aria-hidden="true" /> Volver a mostrar</Boton>}
                </div>
              </li>
            ))}
          </ul>
        )}
    </>
  );
}
