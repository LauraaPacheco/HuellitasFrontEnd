import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarDays, KeyRound, Mail, ShieldCheck, UserX, type LucideIcon } from 'lucide-react';
import { ErrorHttp, esCorreoValido, validarDatosPersonales, type Usuario } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Campo } from '@/componentes/ui/Campo';
import { Boton } from '@/componentes/ui/Boton';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import '@/modulos/refugios/refugios.css';
import './cuenta.css';

const errorTexto = (e: unknown) =>
  e instanceof ErrorHttp ? e.detalle ?? e.message : e instanceof Error ? e.message : 'No pudimos guardar los cambios.';

const fecha = (valor: string) =>
  new Date(valor).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Mi cuenta.
 *
 * Dos columnas en escritorio: a la izquierda quien eres (perfil y datos
 * personales), a la derecha la seguridad. Son pocas opciones y asi caben
 * en una pantalla sin desplazar. En celular y tableta se apilan.
 */
export function PaginaCuenta() {
  const { usuario } = useSesion();
  const consulta = useQuery({
    queryKey: ['mi-cuenta', usuario?.id],
    queryFn: () => api.usuarios.yo(usuario ?? undefined),
    retry: false,
  });

  return (
    <>
      <Encabezado titulo="Mi cuenta" resumen="Consulta tus datos personales y administra la seguridad de tu cuenta." />
      {consulta.isPending ? (
        <EstadoCargando mensaje="Cargando tus datos…" />
      ) : consulta.isError ? (
        <EstadoError
          titulo="No pudimos consultar tu perfil"
          error={consulta.error}
          alReintentar={() => void consulta.refetch()}
          reintentando={consulta.isFetching}
        />
      ) : (
        <div className="cuenta">
          <PerfilCuenta usuario={consulta.data} />
          <SeguridadCuenta />
        </div>
      )}
    </>
  );
}

function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

function PerfilCuenta({ usuario }: { usuario: Usuario }) {
  const { guardarDatosPersonales } = useSesion();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [telefono, setTelefono] = useState(usuario.telefono ?? '');
  const [ocupado, setOcupado] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const sinCambios = nombre.trim() === usuario.nombre && telefono === (usuario.telefono ?? '');

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (ocupado) return;
    const errores = validarDatosPersonales({ nombre, telefono });
    setMensaje('');
    setError(Object.values(errores).join(' '));
    if (Object.keys(errores).length) return;
    setOcupado(true);
    try {
      await guardarDatosPersonales({ nombre: nombre.trim(), telefono: telefono.replace(/\s|-/g, '') });
      setMensaje('Datos personales guardados.');
    } catch (err) {
      setError(errorTexto(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="cuenta__tarjeta" aria-labelledby="cuenta-perfil">
      <div className="cuenta__perfil">
        <span className="cuenta__avatar" aria-hidden="true">{iniciales(usuario.nombre)}</span>
        <div className="cuenta__identidad">
          <h2 id="cuenta-perfil" className="cuenta__nombre">{usuario.nombre}</h2>
          <span className="cuenta__rol">{usuario.rol.nombre}</span>
        </div>
      </div>

      <dl className="cuenta__datos">
        <Dato icono={Mail} etiqueta="Correo" valor={usuario.correo} />
        <Dato icono={CalendarDays} etiqueta="Miembro desde" valor={fecha(usuario.fechaRegistro)} />
        {usuario.politicaAceptada && (
          <Dato
            icono={ShieldCheck}
            etiqueta="Política de datos"
            valor={`Versión ${usuario.politicaAceptada}${usuario.fechaAceptacionPolitica ? ` · ${fecha(usuario.fechaAceptacionPolitica)}` : ''}`}
          />
        )}
      </dl>

      <form className="cuenta__form" onSubmit={(e) => void enviar(e)}>
        <h3 className="cuenta__subtitulo">Datos personales</h3>
        <div className="cuenta__fila">
          <Campo id="cuenta-nombre" etiqueta="Nombre completo" valor={nombre} alCambiar={setNombre} autoComplete="name" />
          <Campo id="cuenta-telefono" etiqueta="Teléfono" valor={telefono} alCambiar={setTelefono} tipo="tel" autoComplete="tel" />
        </div>
        {mensaje && <p className="cuenta__ok" role="status">{mensaje}</p>}
        {error && <p className="campo__error" role="alert">{error}</p>}
        <div className="cuenta__acciones">
          <Boton variante="primario" tipo="submit" cargando={ocupado} disabled={sinCambios}>
            Guardar cambios
          </Boton>
        </div>
      </form>
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

type Accion = 'password' | 'correo' | 'desactivar';

const ACCIONES: readonly { valor: Accion; etiqueta: string; icono: LucideIcon }[] = [
  { valor: 'password', etiqueta: 'Contraseña', icono: KeyRound },
  { valor: 'correo', etiqueta: 'Correo', icono: Mail },
  { valor: 'desactivar', etiqueta: 'Desactivar', icono: UserX },
];

function SeguridadCuenta() {
  const { cerrarSesion } = useSesion();
  const navegar = useNavigate();
  const [accion, setAccion] = useState<Accion>('password');
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  const [correo, setCorreo] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');
  const [confirmar, setConfirmar] = useState(false);

  function cambiarAccion(valor: Accion) {
    setAccion(valor);
    setActual('');
    setError('');
  }

  async function guardar() {
    if (ocupado) return;
    setError('');
    if (!actual) { setError('Escribe la contraseña actual.'); return; }
    if (accion === 'password' && (nueva.length < 8 || nueva !== repetir)) {
      setError('Usa al menos 8 caracteres y confirma la nueva contraseña.');
      return;
    }
    if (accion === 'correo' && !esCorreoValido(correo)) { setError('Escribe un correo válido.'); return; }
    setOcupado(true);
    try {
      if (accion === 'password') await api.usuarios.cambiarPassword(actual, nueva);
      else if (accion === 'correo') await api.usuarios.cambiarCorreo(correo.trim(), actual);
      else await api.usuarios.desactivarCuenta(actual);
      await cerrarSesion();
      navegar('/login', {
        replace: true,
        state: {
          mensaje:
            accion === 'correo'
              ? 'Revisa tu nuevo correo para confirmar el cambio.'
              : accion === 'password'
                ? 'Contraseña actualizada. Inicia sesión nuevamente.'
                : 'Tu cuenta se desactivó.',
        },
      });
    } catch (err) {
      setError(errorTexto(err));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <section className="cuenta__tarjeta" aria-labelledby="cuenta-seguridad">
      <div>
        <h2 id="cuenta-seguridad" className="cuenta__titulo">Seguridad de la cuenta</h2>
        <p className="cuenta__descripcion">Para cualquier cambio te pediremos tu contraseña actual.</p>
      </div>

      {/* Opciones a la vista en vez de una lista desplegable: son tres. */}
      <div className="cuenta__opciones" role="group" aria-label="¿Qué quieres cambiar?">
        {ACCIONES.map(({ valor, etiqueta, icono: Icono }) => (
          <button
            key={valor}
            type="button"
            className={`cuenta__opcion${accion === valor ? ' cuenta__opcion--activa' : ''}${valor === 'desactivar' ? ' cuenta__opcion--peligro' : ''}`}
            aria-pressed={accion === valor}
            onClick={() => cambiarAccion(valor)}
          >
            <Icono size={16} strokeWidth={1.75} aria-hidden="true" />
            {etiqueta}
          </button>
        ))}
      </div>

      {MODO_DEMO && (
        <p className="cuenta__aviso">Los cambios de seguridad están disponibles al conectarte al servidor. La demo no modifica credenciales.</p>
      )}

      <form
        className="cuenta__form"
        onSubmit={(e) => {
          e.preventDefault();
          if (accion === 'desactivar') setConfirmar(true);
          else void guardar();
        }}
      >
        <fieldset disabled={ocupado || MODO_DEMO}>
          {accion === 'desactivar' && (
            <p className="cuenta__alerta">Se desactivará tu cuenta y se cerrará tu sesión. No podrás volver a ingresar con ella.</p>
          )}
          <Campo id="cuenta-actual" etiqueta="Contraseña actual" valor={actual} alCambiar={setActual} tipo="password" autoComplete="current-password" />
          {accion === 'password' && (
            <div className="cuenta__fila">
              <Campo id="cuenta-nueva" etiqueta="Nueva contraseña" valor={nueva} alCambiar={setNueva} tipo="password" autoComplete="new-password" ayuda="Mínimo 8 caracteres." />
              <Campo id="cuenta-repetir" etiqueta="Confirmar contraseña" valor={repetir} alCambiar={setRepetir} tipo="password" autoComplete="new-password" />
            </div>
          )}
          {accion === 'correo' && (
            <Campo
              id="cuenta-correo"
              etiqueta="Nuevo correo"
              valor={correo}
              alCambiar={setCorreo}
              tipo="email"
              autoComplete="email"
              ayuda="Tendrás que confirmarlo desde ese correo para volver a ingresar."
            />
          )}
          {error && <p role="alert" className="campo__error">{error}</p>}
          <div className="cuenta__acciones">
            <Boton tipo="submit" variante={accion === 'desactivar' ? 'peligro' : 'primario'} cargando={ocupado}>
              {accion === 'password' ? 'Cambiar contraseña' : accion === 'correo' ? 'Cambiar correo' : 'Desactivar cuenta'}
            </Boton>
          </div>
        </fieldset>
      </form>

      {confirmar && (
        <Modal titulo="Desactivar cuenta" compacto ocupado={ocupado} alCerrar={() => setConfirmar(false)}>
          <p>¿Confirmas la desactivación? Se cerrará tu sesión y no podrás ingresar con esta cuenta.</p>
          {error && <p role="alert" className="campo__error">{error}</p>}
          <div className="refugio-acciones">
            <Boton variante="peligro" cargando={ocupado} onClick={() => void guardar()}>Confirmar desactivación</Boton>
            <Boton disabled={ocupado} onClick={() => setConfirmar(false)}>Cancelar</Boton>
          </div>
        </Modal>
      )}
    </section>
  );
}
