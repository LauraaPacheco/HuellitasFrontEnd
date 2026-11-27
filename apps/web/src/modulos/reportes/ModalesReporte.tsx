import { useState, type FormEvent } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  ErrorHttp, ETIQUETA_SEXO, ETIQUETA_TIPO_REPORTE, Sexo, TipoReporte,
  type ConvertirReporteDto, type DetalleReporte,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Modal } from '@/componentes/ui/Modal/Modal';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);
const TIPOS = [TipoReporte.Herido, TipoReporte.Maltrato, TipoReporte.EnCalle, TipoReporte.Otro];

/** HU-REP-04: el refugio crea la ficha de la mascota que rescató desde el reporte. */
export function ModalConvertirMascota({ reporte, alCerrar, alCrear }: { reporte: DetalleReporte; alCerrar: () => void; alCrear: (mascotaId: number) => void }) {
  const [datos, setDatos] = useState<ConvertirReporteDto>({
    nombre: '', especieId: 0, razaId: null, tamanoId: 0, colorId: 0, sexo: Sexo.Macho, edadAproximada: null,
    descripcion: reporte.descripcion, esterilizada: false,
  });
  const [error, setError] = useState('');
  const especies = useQuery({ queryKey: ['catalogo', 'especies'], queryFn: () => api.catalogos.especies() });
  const razas = useQuery({ queryKey: ['catalogo', 'razas', datos.especieId], queryFn: () => api.catalogos.razas(datos.especieId), enabled: datos.especieId > 0 });
  const tamanos = useQuery({ queryKey: ['catalogo', 'tamanos'], queryFn: () => api.catalogos.tamanos() });
  const colores = useQuery({ queryKey: ['catalogo', 'colores'], queryFn: () => api.catalogos.colores() });
  const crear = useMutation({ mutationFn: () => api.reportes.convertirEnMascota(reporte.id, datos), onSuccess: alCrear, onError: (e) => setError(errorTexto(e)) });
  const cambiar = <K extends keyof ConvertirReporteDto>(clave: K, valor: ConvertirReporteDto[K]) => { setDatos((d) => ({ ...d, [clave]: valor })); setError(''); };

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (!datos.nombre.trim()) { setError('Ponle un nombre.'); return; }
    if (!datos.especieId || !datos.tamanoId || !datos.colorId) { setError('Elige especie, tamaño y color.'); return; }
    crear.mutate();
  }

  return (
    <Modal titulo={`Crear la ficha desde ${reporte.numeroReporte}`} ocupado={crear.isPending} alCerrar={alCerrar}>
      <form className="reporte-formulario" onSubmit={enviar} noValidate>
        <p className="reporte-formulario__ayuda">La mascota queda en tu catálogo como disponible, con procedencia «Reporte ciudadano». Después puedes agregar fotos y temperamento.</p>
        <label className="campo"><span className="campo__etiqueta">Nombre</span>
          <input className="campo__control" value={datos.nombre} maxLength={60} onChange={(e) => cambiar('nombre', e.target.value)} autoFocus /></label>
        <div className="reporte-formulario__fila">
          <Selector etiqueta="Especie" valor={datos.especieId} opciones={especies.data} alCambiar={(v) => setDatos((d) => ({ ...d, especieId: v, razaId: null }))} />
          <label className="campo"><span className="campo__etiqueta">Raza (opcional)</span>
            <select className="campo__control" value={datos.razaId ?? ''} disabled={!datos.especieId} onChange={(e) => cambiar('razaId', e.target.value ? Number(e.target.value) : null)}>
              <option value="">Sin raza definida</option>
              {razas.data?.filter((r) => r.activo).map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select></label>
        </div>
        <div className="reporte-formulario__fila">
          <Selector etiqueta="Tamaño" valor={datos.tamanoId} opciones={tamanos.data} alCambiar={(v) => cambiar('tamanoId', v)} />
          <Selector etiqueta="Color" valor={datos.colorId} opciones={colores.data} alCambiar={(v) => cambiar('colorId', v)} />
        </div>
        <div className="reporte-formulario__fila">
          <label className="campo"><span className="campo__etiqueta">Sexo</span>
            <select className="campo__control" value={datos.sexo} onChange={(e) => cambiar('sexo', Number(e.target.value) as Sexo)}>
              {[Sexo.Macho, Sexo.Hembra].map((s) => <option key={s} value={s}>{ETIQUETA_SEXO[s]}</option>)}
            </select></label>
          <label className="campo"><span className="campo__etiqueta">Edad aproximada en años (opcional)</span>
            <input className="campo__control" type="number" min={0} max={30} value={datos.edadAproximada ?? ''}
              onChange={(e) => cambiar('edadAproximada', e.target.value === '' ? null : Math.max(0, Math.min(30, Number(e.target.value))))} /></label>
        </div>
        <label className="campo"><span className="campo__etiqueta">Descripción</span>
          <textarea className="campo__control apoyos-area" value={datos.descripcion ?? ''} maxLength={1000} onChange={(e) => cambiar('descripcion', e.target.value)} /></label>
        <label className="reporte-formulario__check">
          <input type="checkbox" checked={datos.esterilizada} onChange={(e) => cambiar('esterilizada', e.target.checked)} /> Ya está esterilizad@
        </label>
        {error && <p role="alert" className="campo__error">{error}</p>}
        <div className="apoyos-pie">
          <Boton disabled={crear.isPending} onClick={alCerrar}>Cancelar</Boton>
          <Boton tipo="submit" variante="primario" disabled={crear.isPending}>{crear.isPending ? 'Creando…' : 'Crear ficha'}</Boton>
        </div>
      </form>
    </Modal>
  );
}

function Selector({ etiqueta, valor, opciones, alCambiar }: { etiqueta: string; valor: number; opciones?: readonly { id: number; nombre: string; activo: boolean }[]; alCambiar: (v: number) => void }) {
  return (
    <label className="campo"><span className="campo__etiqueta">{etiqueta}</span>
      <select className="campo__control" value={valor || ''} onChange={(e) => alCambiar(Number(e.target.value))}>
        <option value="" disabled>{opciones ? 'Elige una opción' : 'Cargando…'}</option>
        {opciones?.filter((o) => o.activo).map((o) => <option key={o.id} value={o.id}>{o.nombre}</option>)}
      </select></label>
  );
}

/** Solo administrador: corrige tipo, descripción, dirección y referencia. Ubicación y fotos se conservan. */
export function ModalEditarReporte({ reporte, alCerrar, alGuardar }: { reporte: DetalleReporte; alCerrar: () => void; alGuardar: () => void }) {
  const [tipo, setTipo] = useState(reporte.tipo);
  const [descripcion, setDescripcion] = useState(reporte.descripcion);
  const [direccion, setDireccion] = useState(reporte.direccion ?? '');
  const [referencia, setReferencia] = useState(reporte.puntoReferencia ?? '');
  const guardar = useMutation({
    mutationFn: () => api.reportes.editar(reporte.id, {
      tipo, descripcion, latitud: reporte.latitud, longitud: reporte.longitud, direccion, puntoReferencia: referencia, fotosUrls: reporte.fotos,
    }),
    onSuccess: alGuardar,
  });
  return (
    <Modal titulo={`Editar ${reporte.numeroReporte}`} ocupado={guardar.isPending} alCerrar={alCerrar}>
      <form className="reporte-formulario" onSubmit={(e) => { e.preventDefault(); guardar.mutate(); }} noValidate>
        <label className="campo"><span className="campo__etiqueta">Tipo</span>
          <select className="campo__control" value={tipo} onChange={(e) => setTipo(Number(e.target.value) as TipoReporte)}>
            {TIPOS.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_REPORTE[t]}</option>)}
          </select></label>
        <label className="campo"><span className="campo__etiqueta">Descripción</span>
          <textarea className="campo__control apoyos-area" value={descripcion} maxLength={1000} onChange={(e) => setDescripcion(e.target.value)} /></label>
        <label className="campo"><span className="campo__etiqueta">Dirección</span>
          <input className="campo__control" value={direccion} maxLength={200} onChange={(e) => setDireccion(e.target.value)} /></label>
        <label className="campo"><span className="campo__etiqueta">Punto de referencia</span>
          <input className="campo__control" value={referencia} maxLength={200} onChange={(e) => setReferencia(e.target.value)} /></label>
        {guardar.isError && <p role="alert" className="campo__error">{errorTexto(guardar.error)}</p>}
        <div className="apoyos-pie">
          <Boton disabled={guardar.isPending} onClick={alCerrar}>Cancelar</Boton>
          <Boton tipo="submit" variante="primario" disabled={guardar.isPending || !descripcion.trim()}>{guardar.isPending ? 'Guardando…' : 'Guardar cambios'}</Boton>
        </div>
      </form>
    </Modal>
  );
}

/** Borrado lógico: deja de verse en el mapa y queda en el historial con el motivo. */
export function ModalEliminarReporte({ reporte, alCerrar, alEliminar }: { reporte: DetalleReporte; alCerrar: () => void; alEliminar: () => void }) {
  const [motivo, setMotivo] = useState('');
  const eliminar = useMutation({ mutationFn: () => api.reportes.eliminar(reporte.id, motivo), onSuccess: alEliminar });
  return (
    <Modal titulo="Eliminar reporte" compacto ocupado={eliminar.isPending} alCerrar={alCerrar}>
      <p>¿Eliminar {reporte.numeroReporte}? Dejará de verse en el mapa y en la bandeja de los refugios.</p>
      <label className="campo"><span className="campo__etiqueta">Motivo (opcional)</span>
        <input className="campo__control" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} placeholder="Duplicado, falso, spam…" /></label>
      {eliminar.isError && <p role="alert" className="campo__error">{errorTexto(eliminar.error)}</p>}
      <div className="apoyos-pie">
        <Boton disabled={eliminar.isPending} onClick={alCerrar}>Cancelar</Boton>
        <Boton variante="peligro" disabled={eliminar.isPending} onClick={() => eliminar.mutate()}>{eliminar.isPending ? 'Eliminando…' : 'Eliminar'}</Boton>
      </div>
    </Modal>
  );
}
