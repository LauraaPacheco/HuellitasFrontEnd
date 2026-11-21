import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, HandHeart, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  ErrorHttp, ESTADO_NECESIDAD, ETIQUETA_TIPO_NECESIDAD, EstadoNecesidad, TipoNecesidad, formatearFecha,
  type GuardarNecesidadDto, type NecesidadRefugio,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
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
const TIPOS = [TipoNecesidad.Alimento, TipoNecesidad.Medicinas, TipoNecesidad.Insumos, TipoNecesidad.Otro];

type Edicion = { modo: 'nueva' } | { modo: 'editar'; necesidad: NecesidadRefugio };

/**
 * HU-REF-03: lo que el refugio necesita que le donen. Lo publicado se ve
 * en su perfil público y en la app; al recibirlo se marca como cubierto.
 */
export function PaginaNecesidades() {
  const { usuario } = useSesion();
  const refugioId = usuario?.refugioId;
  const cache = useQueryClient();
  const [edicion, setEdicion] = useState<Edicion>();
  const [borrar, setBorrar] = useState<NecesidadRefugio>();
  const [mensaje, setMensaje] = useState('');
  const clave = ['necesidades', refugioId];

  const consulta = useQuery({
    queryKey: clave,
    queryFn: () => api.refugios.necesidades(refugioId!, { tamanoPagina: 100 }),
    enabled: !!refugioId,
    retry: false,
  });

  const accion = useMutation({
    mutationFn: ({ tipo, id }: { tipo: 'cubrir' | 'eliminar'; id: number }) =>
      tipo === 'cubrir' ? api.refugios.marcarNecesidadCubierta(id) : api.refugios.eliminarNecesidad(id),
    onSuccess: (_d, { tipo }) => {
      setMensaje(tipo === 'cubrir' ? 'Marcamos la necesidad como cubierta.' : 'La necesidad se eliminó.');
      setBorrar(undefined);
      void cache.invalidateQueries({ queryKey: ['necesidades'] });
    },
  });

  const publicadas = consulta.data?.items.filter((n) => n.estado === EstadoNecesidad.Publicada) ?? [];
  const cubiertas = consulta.data?.items.filter((n) => n.estado === EstadoNecesidad.Cubierta) ?? [];

  return (
    <>
      <Encabezado
        titulo="Necesidades"
        resumen="Publica lo que el refugio necesita que le donen. Los adoptantes lo ven en tu perfil."
        acciones={refugioId ? <Boton variante="primario" onClick={() => { setMensaje(''); setEdicion({ modo: 'nueva' }); }}><Plus size={16} strokeWidth={2} aria-hidden="true" /> Publicar necesidad</Boton> : undefined}
      />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}
      {accion.isError && <p role="alert" className="campo__error">{errorTexto(accion.error)}</p>}

      {!refugioId ? (
        <EstadoVacio titulo="Tu cuenta no tiene un refugio asociado" descripcion="Solicita al administrador que revise la asociación." />
      ) : consulta.isPending ? (
        <EstadoCargando mensaje="Cargando necesidades…" />
      ) : consulta.isError ? (
        <EstadoError titulo="No pudimos cargar las necesidades" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      ) : consulta.data.items.length === 0 ? (
        <EstadoVacio
          ilustracion="trio"
          titulo="Aún no publicas necesidades"
          descripcion="Cuéntales a los adoptantes qué te hace falta: alimento, medicinas o insumos, y cómo pueden donar."
          accion={<Boton variante="primario" onClick={() => setEdicion({ modo: 'nueva' })}>Publicar la primera</Boton>}
        />
      ) : (
        <div className="apoyos-secciones">
          <section aria-labelledby="necesidades-abiertas">
            <h2 id="necesidades-abiertas" className="apoyos-titulo">Publicadas · {publicadas.length}</h2>
            {publicadas.length === 0
              ? <p className="cuenta__aviso">Todo lo publicado ya está cubierto.</p>
              : <ul className="apoyos-rejilla">{publicadas.map((n) => (
                <TarjetaNecesidad key={n.id} necesidad={n} ocupado={accion.isPending}
                  alEditar={() => { setMensaje(''); setEdicion({ modo: 'editar', necesidad: n }); }}
                  alCubrir={() => accion.mutate({ tipo: 'cubrir', id: n.id })}
                  alEliminar={() => setBorrar(n)} />
              ))}</ul>}
          </section>
          {cubiertas.length > 0 && (
            <section aria-labelledby="necesidades-cubiertas">
              <h2 id="necesidades-cubiertas" className="apoyos-titulo">Cubiertas · {cubiertas.length}</h2>
              <ul className="apoyos-rejilla">{cubiertas.map((n) => (
                <TarjetaNecesidad key={n.id} necesidad={n} ocupado={accion.isPending} alEliminar={() => setBorrar(n)} />
              ))}</ul>
            </section>
          )}
        </div>
      )}

      {edicion && (
        <FormularioNecesidad
          inicial={edicion.modo === 'editar' ? edicion.necesidad : undefined}
          alCerrar={(guardado) => {
            setEdicion(undefined);
            if (guardado) { setMensaje(edicion.modo === 'nueva' ? 'Publicamos la necesidad.' : 'Guardamos los cambios.'); void cache.invalidateQueries({ queryKey: ['necesidades'] }); }
          }}
        />
      )}

      {borrar && (
        <Modal titulo="Eliminar necesidad" compacto ocupado={accion.isPending} alCerrar={() => setBorrar(undefined)}>
          <p>¿Eliminar «{borrar.descripcion}»? Dejará de verse en tu perfil público.</p>
          <div className="apoyos-pie">
            <Boton disabled={accion.isPending} onClick={() => setBorrar(undefined)}>Cancelar</Boton>
            <Boton variante="peligro" cargando={accion.isPending} onClick={() => accion.mutate({ tipo: 'eliminar', id: borrar.id })}>Eliminar</Boton>
          </div>
        </Modal>
      )}
    </>
  );
}

function TarjetaNecesidad({ necesidad: n, ocupado, alEditar, alCubrir, alEliminar }: {
  necesidad: NecesidadRefugio; ocupado: boolean; alEditar?: () => void; alCubrir?: () => void; alEliminar: () => void;
}) {
  const cubierta = n.estado === EstadoNecesidad.Cubierta;
  return (
    <li className={`apoyos-tarjeta${cubierta ? ' apoyos-tarjeta--atenuada' : ''}`}>
      <div className="apoyos-tarjeta__cabecera">
        <span className="apoyos-chip"><HandHeart size={14} strokeWidth={1.75} aria-hidden="true" /> {ETIQUETA_TIPO_NECESIDAD[n.tipo]}</span>
        <Insignia estado={ESTADO_NECESIDAD[n.estado]} />
      </div>
      <p className="apoyos-tarjeta__texto">{n.descripcion}</p>
      {n.medioDonacion && <p className="apoyos-tarjeta__dato"><strong>Cómo donar:</strong> {n.medioDonacion}</p>}
      <p className="apoyos-tarjeta__fecha">Publicada el {formatearFecha(n.fechaPublicacion)}</p>
      <div className="apoyos-tarjeta__acciones">
        {alCubrir && <Boton disabled={ocupado} onClick={alCubrir}><CheckCheck size={16} strokeWidth={1.75} aria-hidden="true" /> Marcar cubierta</Boton>}
        {alEditar && <button type="button" className="apoyos-icono" aria-label={`Editar: ${n.descripcion}`} title="Editar" disabled={ocupado} onClick={alEditar}><Pencil size={16} strokeWidth={1.75} aria-hidden="true" /></button>}
        <button type="button" className="apoyos-icono apoyos-icono--peligro" aria-label={`Eliminar: ${n.descripcion}`} title="Eliminar" disabled={ocupado} onClick={alEliminar}><Trash2 size={16} strokeWidth={1.75} aria-hidden="true" /></button>
      </div>
    </li>
  );
}

function FormularioNecesidad({ inicial, alCerrar }: { inicial?: NecesidadRefugio; alCerrar: (guardado: boolean) => void }) {
  const [datos, setDatos] = useState<GuardarNecesidadDto>({
    tipo: inicial?.tipo ?? TipoNecesidad.Alimento, descripcion: inicial?.descripcion ?? '', medioDonacion: inicial?.medioDonacion ?? '',
  });
  const [errorLocal, setErrorLocal] = useState('');
  const guardar = useMutation({
    mutationFn: () => (inicial ? api.refugios.editarNecesidad(inicial.id, datos) : api.refugios.publicarNecesidad(datos)),
    onSuccess: () => alCerrar(true),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (guardar.isPending) return;
    const error = !datos.descripcion.trim() ? 'Describe qué necesitas (por ejemplo, la cantidad y el tipo).' : '';
    setErrorLocal(error);
    if (!error) guardar.mutate();
  }

  return (
    <Modal titulo={inicial ? 'Editar necesidad' : 'Publicar necesidad'} compacto ocupado={guardar.isPending} alCerrar={() => alCerrar(false)}>
      <form className="cuenta__form" onSubmit={enviar} noValidate>
        <fieldset disabled={guardar.isPending}>
          <label className="campo">
            <span className="campo__etiqueta">Tipo</span>
            <select className="campo__control" value={datos.tipo} onChange={(e) => setDatos({ ...datos, tipo: Number(e.target.value) as TipoNecesidad })}>
              {TIPOS.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_NECESIDAD[t]}</option>)}
            </select>
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Qué necesitas</span>
            <textarea className="campo__control apoyos-area" maxLength={500} value={datos.descripcion}
              placeholder="Concentrado para cachorros, 4 bultos de 8 kg" onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
          </label>
          <label className="campo">
            <span className="campo__etiqueta">Cómo donar (opcional)</span>
            <input className="campo__control" maxLength={200} value={datos.medioDonacion ?? ''}
              placeholder="Nequi 3001234567 o entrega en la sede" onChange={(e) => setDatos({ ...datos, medioDonacion: e.target.value })} />
          </label>
          {(errorLocal || guardar.isError) && <p role="alert" className="campo__error">{errorLocal || (guardar.error && errorTexto(guardar.error))}</p>}
          <div className="apoyos-pie">
            <Boton disabled={guardar.isPending} onClick={() => alCerrar(false)}>Cancelar</Boton>
            <Boton tipo="submit" variante="primario" cargando={guardar.isPending}>{inicial ? 'Guardar cambios' : 'Publicar'}</Boton>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
