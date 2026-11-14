import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, ExternalLink, FileText, Heart, Pencil, Star, Trash2, type LucideIcon } from 'lucide-react';
import { ErrorHttp, ESTADO_VERIFICACION, normalizarRefugio, validarRefugio, type EditarRefugioDto, type Refugio } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Campo } from '@/componentes/ui/Campo';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import '@/modulos/cuenta/cuenta.css';
import './refugios.css';

const mensajeError = (error: Error) => error instanceof ErrorHttp ? error.detalle ?? error.message : error.message;

const fecha = (valor: string) =>
  new Date(valor).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

function iniciales(nombre: string) {
  return nombre.trim().split(/\s+/).slice(0, 2).map((parte) => parte[0]?.toUpperCase() ?? '').join('');
}

/**
 * Mi refugio, con la misma composicion de Mi cuenta: arriba, el perfil del
 * refugio junto al formulario con su informacion; debajo, a todo el ancho,
 * los requisitos. En celular y tableta se apila.
 */
export function PaginaEditarRefugio() {
  const { usuario } = useSesion();
  const id = usuario?.refugioId;
  const consulta = useQuery({ queryKey: ['refugios', 'edicion', id], queryFn: () => api.refugios.miPerfil(id!), enabled: !!id, retry: false, gcTime: 0 });
  return <>
    <Encabezado titulo="Mi refugio" resumen="Actualiza la información pública y los requisitos de adopción." />
    {!id ? <EstadoVacio titulo="Tu cuenta no tiene un refugio asociado" descripcion="Solicita al administrador que revise la asociación antes de editar o publicar mascotas." />
      : consulta.isPending ? <EstadoCargando mensaje="Cargando tu refugio…" />
      : consulta.isError ? <EstadoError titulo="No pudimos cargar tu refugio" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
      : consulta.data && (
        <div className="cuenta">
          {/* Columna izquierda: el perfil y, debajo, los requisitos. */}
          <div className="cuenta__columna">
            <PerfilRefugio refugio={consulta.data} />
            <GestionRequisitos refugio={consulta.data} />
          </div>
          <FormularioRefugio key={consulta.data.id} refugio={consulta.data} />
        </div>
      )}
  </>;
}

function PerfilRefugio({ refugio }: { refugio: Refugio }) {
  const tieneDatos = !!refugio.nit || !!refugio.fechaVerificacion || refugio.totalAdopciones != null || refugio.promedioCalificacion != null;
  return (
    <section className="cuenta__tarjeta" aria-labelledby="refugio-perfil">
      <div className="cuenta__perfil">
        <span className="cuenta__avatar" aria-hidden="true">{iniciales(refugio.nombre)}</span>
        <div className="cuenta__identidad">
          <h2 id="refugio-perfil" className="cuenta__nombre">{refugio.nombre}</h2>
          <Insignia estado={ESTADO_VERIFICACION[refugio.estadoVerificacion]} />
        </div>
      </div>

      {tieneDatos && <dl className="cuenta__datos refugio-datos">
        {refugio.nit && <Dato icono={FileText} etiqueta="NIT" valor={refugio.nit} />}
        {refugio.fechaVerificacion && <Dato icono={BadgeCheck} etiqueta="Verificado el" valor={fecha(refugio.fechaVerificacion)} />}
        {refugio.totalAdopciones !== null && <Dato icono={Heart} etiqueta="Adopciones entregadas" valor={String(refugio.totalAdopciones)} />}
        {refugio.promedioCalificacion !== null && (
          <Dato icono={Star} etiqueta="Calificación promedio" valor={`${refugio.promedioCalificacion.toFixed(1)} de 5`} />
        )}
      </dl>}

      <p className="cuenta__descripcion">Editar el contacto no cambia el estado de verificación.</p>

      <Link className="boton boton--secundario refugio-publico" to={`/refugios/${refugio.id}`} state={{ volverA: '/mi-refugio' }}>
        <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
        Ver perfil público
      </Link>
    </section>
  );
}

function Dato({ icono: Icono, etiqueta, valor }: { icono: LucideIcon; etiqueta: string; valor: string }) {
  return (
    <div className="cuenta__dato">
      <Icono className="cuenta__dato-icono" size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <dt>{etiqueta}</dt>
        <dd>{valor}</dd>
      </div>
    </div>
  );
}

function FormularioRefugio({ refugio }: { refugio: Refugio }) {
  const cliente = useQueryClient();
  const inicial: EditarRefugioDto = {
    nombre: refugio.nombre, direccion: refugio.direccion, telefono: refugio.telefono ?? '', correo: refugio.correo ?? '',
    encargado: refugio.encargado ?? '', redesSociales: refugio.redesSociales ?? '', descripcion: refugio.descripcion ?? '',
  };
  const [datos, setDatos] = useState<EditarRefugioDto>(inicial);
  const [errorLocal, setErrorLocal] = useState('');
  const sinCambios = (Object.keys(inicial) as (keyof EditarRefugioDto)[]).every((campo) => (datos[campo] ?? '') === (inicial[campo] ?? ''));
  const guardar = useMutation({ mutationFn: () => api.refugios.editar(refugio.id, normalizarRefugio(datos)),
    onSuccess: () => { void cliente.invalidateQueries({ queryKey: ['refugios'] }); } });
  function cambiar(campo: keyof EditarRefugioDto, valor: string) {
    setDatos(prev => ({ ...prev, [campo]: valor })); guardar.reset(); setErrorLocal('');
  }
  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (guardar.isPending) return;
    const error = MODO_DEMO ? validarRefugio(datos) : !datos.direccion.trim() ? 'Escribe la dirección del refugio.' : !/^\d{10}$/.test(normalizarRefugio(datos).telefono) ? 'El teléfono debe tener 10 dígitos.' : null; setErrorLocal(error ?? '');
    if (!error) guardar.mutate();
  }
  return (
    <section className="cuenta__tarjeta" aria-labelledby="refugio-informacion">
      <div>
        <h2 id="refugio-informacion" className="cuenta__titulo">Información del refugio</h2>
        <p className="cuenta__descripcion">Es lo que ven los adoptantes en el perfil público.</p>
      </div>
      <form className="cuenta__form" onSubmit={enviar} noValidate>
        <fieldset disabled={guardar.isPending}>
          {MODO_DEMO && <div className="cuenta__fila">
            <Campo id="refugio-nombre" etiqueta="Nombre del refugio" valor={datos.nombre} alCambiar={v => cambiar('nombre', v)} />
            <Campo id="refugio-encargado" etiqueta="Persona encargada" valor={datos.encargado} alCambiar={v => cambiar('encargado', v)} />
          </div>}
          <Campo id="refugio-direccion" etiqueta="Dirección" valor={datos.direccion} alCambiar={v => cambiar('direccion', v)} />
          <div className="cuenta__fila">
            <Campo id="refugio-telefono" etiqueta="Teléfono" tipo="tel" valor={datos.telefono} alCambiar={v => cambiar('telefono', v)} ayuda="10 dígitos" />
            {MODO_DEMO && <Campo id="refugio-correo" etiqueta="Correo de contacto" tipo="email" valor={datos.correo} alCambiar={v => cambiar('correo', v)} />}
          </div>
          <Campo id="refugio-redes" etiqueta="Redes sociales (opcional)" valor={datos.redesSociales ?? ''} alCambiar={v => cambiar('redesSociales', v)} />
          <div className="campo">
            <label className="campo__etiqueta" htmlFor="refugio-descripcion">Descripción (opcional)</label>
            <textarea className="campo__control refugio-descripcion" id="refugio-descripcion" value={datos.descripcion ?? ''} onChange={e => cambiar('descripcion', e.target.value)} />
          </div>
          {(errorLocal || guardar.isError) && <p role="alert" className="campo__error">{errorLocal || (guardar.error && mensajeError(guardar.error))}</p>}
          {guardar.isSuccess && <p className="cuenta__ok" role="status">La información del refugio se guardó.</p>}
          <div className="cuenta__acciones">
            <Boton tipo="submit" variante="primario" cargando={guardar.isPending} disabled={sinCambios}>Guardar cambios</Boton>
          </div>
        </fieldset>
      </form>
    </section>
  );
}

function GestionRequisitos({ refugio }: { refugio: Refugio }) {
  const cliente = useQueryClient();
  const [descripcion, setDescripcion] = useState('');
  const [obligatorio, setObligatorio] = useState(true);
  const [edicion, setEdicion] = useState<number | null>(null);
  const [borrado, setBorrado] = useState<number | null>(null);
  const [errorLocal, setErrorLocal] = useState('');
  const [mensaje, setMensaje] = useState('');
  const guardar = useMutation({
    mutationFn: async (accion: 'guardar' | 'eliminar') => {
      if (accion === 'eliminar') {
        if (borrado === null) throw new Error('Selecciona un requisito.');
        await api.refugios.eliminarRequisito(refugio.id, borrado);
      } else if (edicion !== null) {
        await api.refugios.editarRequisito(refugio.id, edicion, { descripcion: descripcion.trim(), esObligatorio: obligatorio });
      } else await api.refugios.guardarRequisito(refugio.id, descripcion.trim(), obligatorio, Math.min(255, Math.max(-1, ...refugio.requisitos.map(r => r.orden)) + 1));
    },
    onSuccess: (_data, accion) => {
      setMensaje(accion === 'eliminar' ? 'Requisito eliminado.' : 'Requisito guardado.');
      setDescripcion(''); setEdicion(null); setBorrado(null); setObligatorio(true);
      void cliente.invalidateQueries({ queryKey: ['refugios'] });
    },
  });
  const activos = [...refugio.requisitos].filter(r => r.activo).sort((a, b) => a.orden - b.orden);

  return (
    <section className="cuenta__tarjeta" aria-labelledby="refugio-requisitos">
      <div>
        <h2 id="refugio-requisitos" className="cuenta__titulo">Requisitos de adopción</h2>
        <p className="cuenta__descripcion">Distingue lo obligatorio de lo recomendado para que el adoptante sepa qué esperar.</p>
      </div>

      {activos.length === 0 ? <p className="cuenta__aviso">Todavía no agregaste requisitos.</p> : (
        <ol className="requisitos">
          {activos.map(r => (
            <li key={r.id} className={`requisitos__item${edicion === r.id ? ' requisitos__item--editando' : ''}`}>
              <div className="requisitos__fila">
                <span className="requisitos__texto">{r.descripcion}</span>
                <span className={`requisitos__tipo${r.esObligatorio ? ' requisitos__tipo--obligatorio' : ''}`}>
                  {r.esObligatorio ? 'Obligatorio' : 'Opcional'}
                </span>
                {MODO_DEMO && <span className="requisitos__acciones">
                  <button type="button" className="requisitos__icono" aria-label={`Editar requisito: ${r.descripcion}`} title="Editar" disabled={guardar.isPending}
                    onClick={() => { setEdicion(r.id); setBorrado(null); setDescripcion(r.descripcion); setObligatorio(r.esObligatorio); setMensaje(''); setErrorLocal(''); guardar.reset(); }}>
                    <Pencil size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                  <button type="button" className="requisitos__icono requisitos__icono--peligro" aria-label={`Eliminar requisito: ${r.descripcion}`} title="Eliminar" disabled={guardar.isPending}
                    onClick={() => { setBorrado(r.id); setMensaje(''); guardar.reset(); }}>
                    <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  </button>
                </span>}
              </div>
              {borrado === r.id && (
                <div className="requisitos__confirmar" role="group" aria-label="Confirmar eliminación del requisito">
                  <span>¿Eliminar este requisito del perfil?</span>
                  <Boton variante="peligro" cargando={guardar.isPending} onClick={() => guardar.mutate('eliminar')}>Eliminar</Boton>
                  <Boton disabled={guardar.isPending} onClick={() => setBorrado(null)}>Cancelar</Boton>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <form className="cuenta__form requisitos__nuevo" onSubmit={e => {
        e.preventDefault(); if (guardar.isPending) return;
        if (!descripcion.trim()) return setErrorLocal('Describe el requisito.');
        setErrorLocal(''); guardar.mutate('guardar');
      }} noValidate>
        <fieldset disabled={guardar.isPending}>
          <Campo id="nuevo-requisito" etiqueta={edicion === null ? 'Nuevo requisito' : 'Editar requisito'} valor={descripcion} alCambiar={v => { setDescripcion(v); setMensaje(''); }} />
          {(errorLocal || guardar.isError) && <p role="alert" className="campo__error">{errorLocal || (guardar.error && mensajeError(guardar.error))}</p>}
          {mensaje && <p className="cuenta__ok" role="status">{mensaje}</p>}
          <div className="requisitos__pie">
            <label className="requisitos__check">
              <input type="checkbox" checked={obligatorio} onChange={e => setObligatorio(e.target.checked)} /> Es obligatorio
            </label>
            <div className="cuenta__acciones">
              {edicion !== null && <Boton disabled={guardar.isPending} onClick={() => { setEdicion(null); setDescripcion(''); setObligatorio(true); setErrorLocal(''); }}>Cancelar</Boton>}
              <Boton tipo="submit" variante="primario" cargando={guardar.isPending}>{edicion === null ? 'Agregar requisito' : 'Guardar requisito'}</Boton>
            </div>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
