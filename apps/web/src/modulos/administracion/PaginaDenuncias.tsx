import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Flag } from 'lucide-react';
import {
  ErrorHttp, ESTADO_DENUNCIA, ETIQUETA_MOTIVO_DENUNCIA, ETIQUETA_TIPO_CONTENIDO, EstadoDenuncia, TipoContenido, formatearFechaHora,
  type Denuncia,
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
import '@/modulos/apoyos/apoyos.css';
import './administracion.css';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);
const FILTROS: readonly { valor: EstadoDenuncia | null; texto: string }[] = [
  { valor: null, texto: 'Todas' },
  { valor: EstadoDenuncia.Recibida, texto: 'Recibidas' },
  { valor: EstadoDenuncia.EnRevision, texto: 'En revisión' },
  { valor: EstadoDenuncia.Resuelta, texto: 'Resueltas' },
];

/** Dónde ver lo denunciado. Las opiniones y los reportes se revisan en su propia pantalla. */
function enlaceContenido(d: Denuncia): string {
  if (d.tipoContenido === TipoContenido.Mascota) return `/public/mascotas/${d.idContenido}`;
  if (d.tipoContenido === TipoContenido.Refugio) return `/refugios/${d.idContenido}`;
  if (d.tipoContenido === TipoContenido.Calificacion) return '/opiniones';
  return '/reportes';
}

/** HU-ADM-02: bandeja de denuncias. Al resolver, el admin puede ocultar lo denunciado. */
export function PaginaDenuncias() {
  const cache = useQueryClient();
  const [estado, setEstado] = useState<EstadoDenuncia | null>(EstadoDenuncia.Recibida);
  const [resolver, setResolver] = useState<Denuncia | null>(null);
  const [mensaje, setMensaje] = useState('');
  const consulta = useQuery({
    queryKey: ['admin', 'denuncias', estado],
    queryFn: () => api.administracion.denuncias({ estado: estado ?? undefined, tamanoPagina: 50 }),
    retry: false,
  });

  return (
    <>
      <Encabezado titulo="Denuncias" resumen="Lo que los usuarios reportaron como sospechoso: mascotas, refugios, opiniones y reportes." />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}
      <div className="apoyos-pestanas" role="group" aria-label="Filtrar por estado">
        {FILTROS.map((f) => (
          <button key={f.texto} type="button" className="apoyos-pestana" aria-pressed={estado === f.valor} onClick={() => { setEstado(f.valor); setMensaje(''); }}>{f.texto}</button>
        ))}
      </div>

      {consulta.isPending ? <EstadoCargando mensaje="Cargando denuncias…" />
        : consulta.isError ? <EstadoError titulo="No pudimos cargar las denuncias" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
        : consulta.data.items.length === 0 ? <EstadoVacio ilustracion="trio" titulo="No hay denuncias aquí" descripcion="Cuando alguien denuncie una publicación, aparecerá en esta bandeja." />
        : (
          <ul className="apoyos-rejilla">
            {consulta.data.items.map((d) => (
              <li key={d.id} className="apoyos-tarjeta">
                <div className="apoyos-tarjeta__cabecera">
                  <span className="apoyos-chip"><Flag size={14} strokeWidth={1.75} aria-hidden="true" /> {ETIQUETA_MOTIVO_DENUNCIA[d.motivo]}</span>
                  <Insignia estado={ESTADO_DENUNCIA[d.estado]} />
                </div>
                <p className="apoyos-tarjeta__titulo">
                  {ETIQUETA_TIPO_CONTENIDO[d.tipoContenido]} #{d.idContenido} · <Link to={enlaceContenido(d)}>ver</Link>
                </p>
                {d.descripcion && <p className="apoyos-tarjeta__texto">«{d.descripcion}»</p>}
                <p className="apoyos-tarjeta__fecha">Denunció {d.denunciante} · {formatearFechaHora(d.fecha)}</p>
                {d.resultado && <p className="admin-resultado"><strong>Decisión:</strong> {d.resultado}</p>}
                {d.estado !== EstadoDenuncia.Resuelta && (
                  <div className="apoyos-tarjeta__acciones">
                    <Boton variante="primario" onClick={() => { setMensaje(''); setResolver(d); }}>Resolver</Boton>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}

      {resolver && (
        <ModalResolver denuncia={resolver} alCerrar={() => setResolver(null)}
          alListo={(oculto) => {
            setResolver(null);
            setMensaje(oculto ? 'Resolvimos la denuncia y ocultamos el contenido.' : 'Resolvimos la denuncia.');
            void cache.invalidateQueries({ queryKey: ['admin', 'denuncias'] });
          }} />
      )}
    </>
  );
}

function ModalResolver({ denuncia, alCerrar, alListo }: { denuncia: Denuncia; alCerrar: () => void; alListo: (oculto: boolean) => void }) {
  const [resultado, setResultado] = useState('');
  const [ocultar, setOcultar] = useState(false);
  const guardar = useMutation({
    mutationFn: () => api.administracion.resolverDenuncia(denuncia.id, { resultado, ocultarContenido: ocultar }),
    onSuccess: () => alListo(ocultar),
  });
  return (
    <Modal titulo="Resolver denuncia" compacto ocupado={guardar.isPending} alCerrar={alCerrar}>
      <p>{ETIQUETA_TIPO_CONTENIDO[denuncia.tipoContenido]} #{denuncia.idContenido} · {ETIQUETA_MOTIVO_DENUNCIA[denuncia.motivo]}</p>
      <label className="campo"><span className="campo__etiqueta">Decisión</span>
        <textarea className="campo__control apoyos-area" value={resultado} maxLength={500} onChange={(e) => setResultado(e.target.value)} placeholder="Qué se revisó y qué se decidió" /></label>
      <label className="admin-check">
        <input type="checkbox" checked={ocultar} onChange={(e) => setOcultar(e.target.checked)} />
        Ocultar {ETIQUETA_TIPO_CONTENIDO[denuncia.tipoContenido].toLowerCase()} para que deje de verse en la plataforma
      </label>
      {guardar.isError && <p role="alert" className="campo__error">{errorTexto(guardar.error)}</p>}
      <div className="apoyos-pie">
        <Boton disabled={guardar.isPending} onClick={alCerrar}>Cancelar</Boton>
        <Boton variante={ocultar ? 'peligro' : 'primario'} cargando={guardar.isPending} disabled={!resultado.trim()} onClick={() => guardar.mutate()}>
          {ocultar ? 'Resolver y ocultar' : 'Resolver'}
        </Boton>
      </div>
    </Modal>
  );
}
