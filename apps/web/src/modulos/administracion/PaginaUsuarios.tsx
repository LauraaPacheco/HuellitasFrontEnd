import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, UserRoundCog } from 'lucide-react';
import {
  ErrorHttp, ESTADOS_USUARIO_ADMIN, formatearFecha, ROLES_ADMIN, type DescriptorEstado, type UsuarioAdmin,
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
import '@/estilos/tabla.css';
import '@/modulos/apoyos/apoyos.css';
import './administracion.css';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);
const ESTADO: Record<string, DescriptorEstado> = {
  Activo: { etiqueta: 'Activo', tono: 'marca' },
  PendienteVerificacion: { etiqueta: 'Sin confirmar correo', tono: 'advertencia' },
  Bloqueado: { etiqueta: 'Bloqueado', tono: 'peligro' },
  Desactivado: { etiqueta: 'Desactivado', tono: 'neutro' },
};
const estadoDe = (u: UsuarioAdmin) => ESTADO[u.estado] ?? { etiqueta: u.estado, tono: 'neutro' as const };

type Accion = { tipo: 'rol' | 'estado'; usuario: UsuarioAdmin };

/** HU-ADM-01: el administrador busca cuentas, cambia su rol y las activa o desactiva con motivo. */
export function PaginaUsuarios() {
  const { usuario: yo } = useSesion();
  const cache = useQueryClient();
  const [texto, setTexto] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [rolId, setRolId] = useState<number | undefined>();
  const [estado, setEstado] = useState<number | undefined>();
  const [pagina, setPagina] = useState(1);
  const [accion, setAccion] = useState<Accion | null>(null);
  const [mensaje, setMensaje] = useState('');

  const consulta = useQuery({
    queryKey: ['admin', 'usuarios', busqueda, rolId, estado, pagina],
    queryFn: () => api.administracion.usuarios({ busqueda, rolId, estado, pagina, tamanoPagina: 15 }),
    placeholderData: (previo) => previo,
    retry: false,
  });

  function buscar() { setBusqueda(texto); setPagina(1); }

  return (
    <>
      <Encabezado titulo="Usuarios" resumen="Busca cuentas, cambia su rol y actívalas o desactívalas cuando haga falta." />
      {mensaje && <p role="status" className="apoyos-mensaje">{mensaje}</p>}

      <form className="admin-filtros" role="search" onSubmit={(e) => { e.preventDefault(); buscar(); }}>
        <label className="admin-busqueda">
          <Search size={16} strokeWidth={1.75} aria-hidden="true" />
          <span className="visualmente-oculto">Buscar por nombre o correo</span>
          <input className="campo__control" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Nombre o correo" />
        </label>
        <label className="admin-filtro"><span>Rol</span>
          <select className="campo__control" value={rolId ?? ''} onChange={(e) => { setRolId(e.target.value ? Number(e.target.value) : undefined); setPagina(1); }}>
            <option value="">Todos</option>
            {ROLES_ADMIN.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
          </select></label>
        <label className="admin-filtro"><span>Estado</span>
          <select className="campo__control" value={estado ?? ''} onChange={(e) => { setEstado(e.target.value ? Number(e.target.value) : undefined); setPagina(1); }}>
            <option value="">Todos</option>
            {ESTADOS_USUARIO_ADMIN.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </select></label>
        <Boton tipo="submit">Buscar</Boton>
      </form>

      {consulta.isPending ? <EstadoCargando mensaje="Cargando usuarios…" />
        : consulta.isError ? <EstadoError titulo="No pudimos cargar los usuarios" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />
        : consulta.data.items.length === 0 ? <EstadoVacio titulo="No encontramos cuentas" descripcion="Prueba con otro nombre, correo o filtro." />
        : (
          <>
            <div className="tabla-scroll">
              <table className="tabla tabla--tarjetas">
                <thead><tr><th scope="col">Cuenta</th><th scope="col">Rol</th><th scope="col">Registro</th><th scope="col">Estado</th><th scope="col"><span className="visualmente-oculto">Acciones</span></th></tr></thead>
                <tbody>{consulta.data.items.map((u) => {
                  const soyYo = u.id === yo?.id;
                  return (
                    <tr key={u.id}>
                      <td className="tabla__c-titulo"><span className="tabla__nombre">{u.nombre}{soyYo && ' (tú)'}</span><span className="tabla__detalle">{u.correo}</span></td>
                      <td className="tabla__c-dato" data-etiqueta="Rol">{u.rol}</td>
                      <td className="tabla__c-dato" data-etiqueta="Registro">{formatearFecha(u.fechaRegistro)}</td>
                      <td className="tabla__c-estado"><Insignia estado={estadoDe(u)} /></td>
                      <td className="tabla__c-accion">
                        <div className="admin-acciones">
                          <Boton onClick={() => { setMensaje(''); setAccion({ tipo: 'rol', usuario: u }); }}><UserRoundCog size={16} strokeWidth={1.75} aria-hidden="true" /> Rol</Boton>
                          {u.activo
                            ? <Boton variante="peligro" disabled={soyYo} title={soyYo ? 'No puedes desactivar tu propia cuenta' : undefined} onClick={() => { setMensaje(''); setAccion({ tipo: 'estado', usuario: u }); }}>Desactivar</Boton>
                            : <Boton onClick={() => { setMensaje(''); setAccion({ tipo: 'estado', usuario: u }); }}>Activar</Boton>}
                        </div>
                      </td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </div>
            {consulta.data.totalPaginas > 1 && (
              <div className="admin-paginas">
                <Boton disabled={pagina === 1} onClick={() => setPagina((p) => p - 1)}>Anterior</Boton>
                <span>Página {pagina} de {consulta.data.totalPaginas} · {consulta.data.total} cuentas</span>
                <Boton disabled={pagina >= consulta.data.totalPaginas} onClick={() => setPagina((p) => p + 1)}>Siguiente</Boton>
              </div>
            )}
          </>
        )}

      {accion && (
        <ModalAccion accion={accion} alCerrar={() => setAccion(null)}
          alListo={(texto) => { setAccion(null); setMensaje(texto); void cache.invalidateQueries({ queryKey: ['admin', 'usuarios'] }); }} />
      )}
    </>
  );
}

function ModalAccion({ accion, alCerrar, alListo }: { accion: Accion; alCerrar: () => void; alListo: (mensaje: string) => void }) {
  const u = accion.usuario;
  const actual = ROLES_ADMIN.find((r) => r.nombre === u.rol)?.id ?? ROLES_ADMIN[2].id;
  const [rol, setRol] = useState<number>(actual);
  const [motivo, setMotivo] = useState('');
  const activar = !u.activo;
  const guardar = useMutation({
    mutationFn: () => accion.tipo === 'rol' ? api.administracion.cambiarRolUsuario(u.id, rol) : api.administracion.cambiarEstadoUsuario(u.id, activar, motivo),
    onSuccess: () => alListo(accion.tipo === 'rol'
      ? `${u.nombre} ahora tiene el rol ${ROLES_ADMIN.find((r) => r.id === rol)?.nombre}.`
      : activar ? `Activamos la cuenta de ${u.nombre}.` : `Desactivamos la cuenta de ${u.nombre}.`),
  });
  const titulo = accion.tipo === 'rol' ? `Rol de ${u.nombre}` : activar ? 'Activar cuenta' : 'Desactivar cuenta';
  return (
    <Modal titulo={titulo} compacto ocupado={guardar.isPending} alCerrar={alCerrar}>
      {accion.tipo === 'rol' ? (
        <>
          <label className="campo"><span className="campo__etiqueta">Rol</span>
            <select className="campo__control" value={rol} onChange={(e) => setRol(Number(e.target.value))}>
              {ROLES_ADMIN.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select></label>
          <p className="admin-ayuda">Si la cuenta deja de ser Refugio, pierde el acceso al panel de su refugio.</p>
        </>
      ) : activar ? (
        <p>¿Activar la cuenta de <strong>{u.nombre}</strong> ({u.correo})? Podrá volver a iniciar sesión.</p>
      ) : (
        <>
          <p>¿Desactivar la cuenta de <strong>{u.nombre}</strong> ({u.correo})? No podrá iniciar sesión.</p>
          <label className="campo"><span className="campo__etiqueta">Motivo</span>
            <textarea className="campo__control apoyos-area" value={motivo} maxLength={500} onChange={(e) => setMotivo(e.target.value)} placeholder="Por qué se desactiva" /></label>
        </>
      )}
      {guardar.isError && <p role="alert" className="campo__error">{errorTexto(guardar.error)}</p>}
      <div className="apoyos-pie">
        <Boton disabled={guardar.isPending} onClick={alCerrar}>Cancelar</Boton>
        <Boton variante={accion.tipo === 'estado' && !activar ? 'peligro' : 'primario'} cargando={guardar.isPending}
          disabled={(accion.tipo === 'rol' && rol === actual) || (accion.tipo === 'estado' && !activar && !motivo.trim())}
          onClick={() => guardar.mutate()}>
          {accion.tipo === 'rol' ? 'Guardar rol' : activar ? 'Activar' : 'Desactivar'}
        </Boton>
      </div>
    </Modal>
  );
}
