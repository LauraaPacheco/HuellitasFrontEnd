import { useState, type FormEvent } from 'react';
import {
  ErrorHttp,
  esContrasenaValida,
  validarRefugio,
  normalizarRefugio,
  type SolicitudRefugioDto,
} from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { Link } from 'react-router-dom';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import { CamposRedesSociales } from '@/componentes/ui/CamposRedesSociales/CamposRedesSociales';
import { MarcoAuth } from './MarcoAuth';

const VACIO: SolicitudRefugioDto = {
  nombre: '',
  nit: '',
  direccion: '',
  telefono: '',
  correo: '',
  encargado: '',
  redesSociales: null,
  descripcion: '',
};

/**
 * HU-REF-01: un refugio se registra desde cero. Con el backend real
 * (POST /api/v1/Usuarios/registro-refugio) se crean a la vez la cuenta del
 * encargado y el refugio; el encargado confirma su correo y el refugio
 * queda pendiente hasta que el administrador lo verifique (HU-ADM-01).
 */
export function PaginaSolicitarRegistro() {
  const [datos, setDatos] = useState<SolicitudRefugioDto>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [contrasena, setContrasena] = useState('');
  const [confirmacion, setConfirmacion] = useState('');
  const [aceptaPolitica, setAceptaPolitica] = useState(false);

  const cambiar =
    (campo: keyof SolicitudRefugioDto) =>
    (valor: string) =>
      setDatos((previo) => ({ ...previo, [campo]: valor }));

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    if (enviando) return;
    const problema = validarRefugio(datos)
      ?? (!esContrasenaValida(contrasena) ? 'La contraseña debe tener al menos 8 caracteres.' : null)
      ?? (contrasena !== confirmacion ? 'Las contraseñas no coinciden.' : null)
      ?? (!aceptaPolitica ? 'Debes aceptar la política de tratamiento de datos.' : null);
    setError(problema);
    if (problema) return;

    setEnviando(true);
    try {
      await api.refugios.registrarRefugio({ ...normalizarRefugio(datos), contrasena, aceptaPolitica });
      setEnviado(true);
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp
          ? (causa.detalle ?? causa.message)
          : 'No pudimos enviar la solicitud. Inténtalo más tarde.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <MarcoAuth titulo="Solicitud enviada">
        <p style={{ margin: 0, color: 'var(--ink-muted)', lineHeight: '23px' }}>
          Recibimos la solicitud de <strong>{datos.nombre}</strong>.
          {MODO_DEMO ? ' ' : <> Te enviamos un correo a <strong>{datos.correo}</strong> para confirmar tu cuenta. </>}
          El administrador revisará los datos de contacto y el NIT.
        </p>
        <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 14 }}>
          Hasta que no esté verificado, el refugio no puede publicar mascotas.
          {!MODO_DEMO && ' Mientras tanto puedes entrar con tu correo y contraseña.'}
        </p>
        <Link to="/login">Ir a iniciar sesión</Link>
      </MarcoAuth>
    );
  }

  return (
    <MarcoAuth
      ancho="amplio"
      titulo="Registrar un refugio"
      descripcion="Déjanos los datos del refugio. Un administrador los revisa antes de darte acceso al panel."
    >
      {/* Los campos van emparejados por tema, no por largo: el refugio y su
          NIT, dónde queda y cómo llamarlo, a quién escribirle. En una
          pantalla angosta la rejilla cae sola a una columna. */}
      <form onSubmit={alEnviar} noValidate className="marco-auth__campos">
        <Campo
          id="nombre"
          etiqueta="Nombre del refugio"
          valor={datos.nombre}
          alCambiar={cambiar('nombre')}
          marcador="Fundación Patitas"
        />
        <Campo
          id="nit"
          etiqueta="NIT"
          valor={datos.nit}
          alCambiar={cambiar('nit')}
          marcador="900123456-7"
          ayuda="Con dígito de verificación"
        />
        <Campo
          id="direccion"
          etiqueta="Dirección"
          valor={datos.direccion}
          alCambiar={cambiar('direccion')}
          marcador="Calle 5 #38-25, Cali"
        />
        <Campo
          id="telefono"
          etiqueta="Teléfono"
          tipo="tel"
          autoComplete="tel"
          valor={datos.telefono}
          alCambiar={cambiar('telefono')}
          marcador="10 dígitos"
        />
        <Campo
          id="correo"
          etiqueta="Correo de contacto"
          tipo="email"
          autoComplete="email"
          valor={datos.correo}
          alCambiar={cambiar('correo')}
          marcador="refugio@ejemplo.com"
          ayuda="Correo para contactar al refugio"
        />
        <Campo
          id="encargado"
          etiqueta="Persona encargada"
          autoComplete="name"
          valor={datos.encargado}
          alCambiar={cambiar('encargado')}
        />
        <div className="marco-auth__ancho-completo">
          <CamposRedesSociales
            id="redes"
            valor={datos.redesSociales}
            alCambiar={(redesSociales) => setDatos((previo) => ({ ...previo, redesSociales }))}
            ayuda="Ayuda al administrador a verificar que el refugio existe"
          />
        </div>
        <div className="marco-auth__ancho-completo">
          <Campo
            id="descripcion"
            etiqueta="Cuéntanos del refugio (opcional)"
            valor={datos.descripcion ?? ''}
            alCambiar={cambiar('descripcion')}
            marcador="Cuántos animales atienden, desde cuándo"
          />
        </div>

        <Campo
          id="contrasena"
          etiqueta="Contraseña para tu cuenta"
          tipo="password"
          autoComplete="new-password"
          valor={contrasena}
          alCambiar={setContrasena}
          ayuda="Al menos 8 caracteres. Con ella entrarás al panel."
        />
        <Campo
          id="confirmar-contrasena"
          etiqueta="Confirma la contraseña"
          tipo="password"
          autoComplete="new-password"
          valor={confirmacion}
          alCambiar={setConfirmacion}
        />
        <label className="marco-auth__ancho-completo registro-politica">
          <input type="checkbox" checked={aceptaPolitica} onChange={(e) => setAceptaPolitica(e.target.checked)} />
          <span>Acepto la política de tratamiento de datos personales (Ley 1581 de 2012).</span>
        </label>

        {error && (
          <p className="marco-auth__error marco-auth__ancho-completo" role="alert">
            {error}
          </p>
        )}

        <div className="marco-auth__ancho-completo">
          <Boton tipo="submit" variante="primario" ancho cargando={enviando}>
            Registrar refugio
          </Boton>
        </div>
      </form>
    </MarcoAuth>
  );
}
