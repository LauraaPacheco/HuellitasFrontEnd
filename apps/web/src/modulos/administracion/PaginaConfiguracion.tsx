import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pencil, Plus } from 'lucide-react';
import { ErrorHttp, formatearFecha, type ConfiguracionSistema } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import '@/componentes/ui/Campo/campo.css';
import '@/estilos/tabla.css';
import '@/modulos/apoyos/apoyos.css';
import './administracion.css';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);

/**
 * HU-ADM-03: la política de datos con su historial (publicar una versión
 * nueva obliga a todos a aceptarla otra vez) y los parámetros de la
 * plataforma, que se ajustan sin tocar código.
 */
export function PaginaConfiguracion() {
  const cache = useQueryClient();
  const [mensaje, setMensaje] = useState('');
  const [publicar, setPublicar] = useState(false);
  const [parametro, setParametro] = useState<ConfiguracionSistema | 'nuevo' | null>(null);
  const politicas = useQuery({ queryKey: ['admin', 'politicas'], queryFn: () => api.administracion.politicas(), retry: false });
  const parametros = useQuery({ queryKey: ['admin', 'configuracion'], queryFn: () => api.administracion.configuracion(), retry: false });
  const vigente = politicas.data?.find((p) => p.activo) ?? null;

  return (
    <>
      <Encabezado titulo="Configuración" resumen="La política de tratamiento de datos y los parámetros de la plataforma." />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}

      <div className="admin-secciones">
        <section className="admin-seccion" aria-labelledby="titulo-politica">
          <header className="admin-seccion__cabecera">
            <h2 id="titulo-politica">Política de datos</h2>
            <Boton variante="primario" onClick={() => { setMensaje(''); setPublicar(true); }}><Plus size={16} strokeWidth={2} aria-hidden="true" /> Publicar versión</Boton>
          </header>
          {politicas.isPending ? <EstadoCargando mensaje="Cargando la política…" />
            : politicas.isError ? <EstadoError titulo="No pudimos cargar la política" error={politicas.error} alReintentar={() => void politicas.refetch()} reintentando={politicas.isFetching} />
            : (
              <>
                {vigente ? (
                  <article className="admin-politica">
                    <p className="admin-politica__version"><FileText size={16} strokeWidth={1.75} aria-hidden="true" /> Versión {vigente.version} · vigente desde {formatearFecha(vigente.fechaPublicacion)}</p>
                    <p className="admin-politica__texto">{vigente.contenido}</p>
                  </article>
                ) : <p className="admin-ayuda">Todavía no hay una política publicada.</p>}
                {politicas.data.length > 1 && (
                  <details className="admin-historial">
                    <summary>Versiones anteriores ({politicas.data.length - 1})</summary>
                    <ul>{politicas.data.filter((p) => !p.activo).map((p) => <li key={p.id}>Versión {p.version} · {formatearFecha(p.fechaPublicacion)}</li>)}</ul>
                  </details>
                )}
              </>
            )}
        </section>

        <section className="admin-seccion" aria-labelledby="titulo-parametros">
          <header className="admin-seccion__cabecera">
            <h2 id="titulo-parametros">Parámetros</h2>
            <Boton onClick={() => { setMensaje(''); setParametro('nuevo'); }}><Plus size={16} strokeWidth={2} aria-hidden="true" /> Agregar</Boton>
          </header>
          {parametros.isPending ? <EstadoCargando mensaje="Cargando parámetros…" />
            : parametros.isError ? <EstadoError titulo="No pudimos cargar los parámetros" error={parametros.error} alReintentar={() => void parametros.refetch()} reintentando={parametros.isFetching} />
            : parametros.data.length === 0 ? <p className="admin-ayuda">No hay parámetros configurados.</p>
            : (
              <div className="tabla-scroll">
                <table className="tabla tabla--tarjetas">
                  <thead><tr><th scope="col">Parámetro</th><th scope="col">Valor</th><th scope="col">Estado</th><th scope="col"><span className="visualmente-oculto">Editar</span></th></tr></thead>
                  <tbody>{parametros.data.map((p) => (
                    <tr key={p.id}>
                      <td className="tabla__c-titulo"><span className="tabla__nombre admin-clave">{p.clave}</span>{p.descripcion && <span className="tabla__detalle">{p.descripcion}</span>}</td>
                      <td className="tabla__c-ancho" data-etiqueta="Valor"><strong>{p.valor}</strong></td>
                      <td className="tabla__c-estado"><Insignia estado={p.activo ? { etiqueta: 'Activo', tono: 'marca' } : { etiqueta: 'Inactivo', tono: 'neutro' }} /></td>
                      <td className="tabla__c-accion"><Boton aria-label={`Editar ${p.clave}`} onClick={() => { setMensaje(''); setParametro(p); }}><Pencil size={16} strokeWidth={1.75} aria-hidden="true" /> Editar</Boton></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
        </section>
      </div>

      {publicar && (
        <ModalPolitica versionActual={vigente?.version ?? null} alCerrar={() => setPublicar(false)}
          alListo={() => { setPublicar(false); setMensaje('Publicamos la política. Los usuarios deberán aceptarla al volver a entrar.'); void cache.invalidateQueries({ queryKey: ['admin', 'politicas'] }); }} />
      )}
      {parametro && (
        <ModalParametro parametro={parametro === 'nuevo' ? null : parametro} alCerrar={() => setParametro(null)}
          alListo={() => { setParametro(null); setMensaje('Guardamos el parámetro.'); void cache.invalidateQueries({ queryKey: ['admin', 'configuracion'] }); }} />
      )}
    </>
  );
}

function ModalPolitica({ versionActual, alCerrar, alListo }: { versionActual: string | null; alCerrar: () => void; alListo: () => void }) {
  const [version, setVersion] = useState('');
  const [contenido, setContenido] = useState('');
  const guardar = useMutation({ mutationFn: () => api.administracion.publicarPolitica({ version, contenido }), onSuccess: alListo });
  return (
    <Modal titulo="Publicar nueva versión" ocupado={guardar.isPending} alCerrar={alCerrar}>
      <p className="admin-ayuda">Al publicarla, todas las personas tendrán que aceptarla la próxima vez que inicien sesión.{versionActual && ` La vigente es la ${versionActual}.`}</p>
      <label className="campo"><span className="campo__etiqueta">Versión</span>
        <input className="campo__control" value={version} maxLength={20} onChange={(e) => setVersion(e.target.value)} placeholder="Ejemplo: 1.1" /></label>
      <label className="campo"><span className="campo__etiqueta">Contenido</span>
        <textarea className="campo__control admin-texto-largo" value={contenido} onChange={(e) => setContenido(e.target.value)} placeholder="Texto completo de la política de tratamiento de datos" /></label>
      {guardar.isError && <p role="alert" className="campo__error">{errorTexto(guardar.error)}</p>}
      <div className="apoyos-pie">
        <Boton disabled={guardar.isPending} onClick={alCerrar}>Cancelar</Boton>
        <Boton variante="primario" cargando={guardar.isPending} disabled={!version.trim() || !contenido.trim()} onClick={() => guardar.mutate()}>Publicar</Boton>
      </div>
    </Modal>
  );
}

function ModalParametro({ parametro, alCerrar, alListo }: { parametro: ConfiguracionSistema | null; alCerrar: () => void; alListo: () => void }) {
  const [clave, setClave] = useState(parametro?.clave ?? '');
  const [valor, setValor] = useState(parametro?.valor ?? '');
  const [descripcion, setDescripcion] = useState(parametro?.descripcion ?? '');
  const guardar = useMutation({ mutationFn: () => api.administracion.guardarConfiguracion({ clave, valor, descripcion }, parametro?.id), onSuccess: alListo });
  return (
    <Modal titulo={parametro ? `Editar ${parametro.clave}` : 'Nuevo parámetro'} compacto ocupado={guardar.isPending} alCerrar={alCerrar}>
      <label className="campo"><span className="campo__etiqueta">Clave</span>
        <input className="campo__control admin-clave" value={clave} maxLength={100} onChange={(e) => setClave(e.target.value)} placeholder="dias_alerta_desactualizacion" /></label>
      <label className="campo"><span className="campo__etiqueta">Valor</span>
        <input className="campo__control" value={valor} maxLength={500} onChange={(e) => setValor(e.target.value)} /></label>
      <label className="campo"><span className="campo__etiqueta">Descripción (opcional)</span>
        <input className="campo__control" value={descripcion} maxLength={300} onChange={(e) => setDescripcion(e.target.value)} /></label>
      {guardar.isError && <p role="alert" className="campo__error">{errorTexto(guardar.error)}</p>}
      <div className="apoyos-pie">
        <Boton disabled={guardar.isPending} onClick={alCerrar}>Cancelar</Boton>
        <Boton variante="primario" cargando={guardar.isPending} disabled={!clave.trim() || !valor.trim()} onClick={() => guardar.mutate()}>Guardar</Boton>
      </div>
    </Modal>
  );
}
