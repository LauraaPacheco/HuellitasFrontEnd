import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { ErrorHttp, esCorreoValido } from '@huellitas/shared';
import { useSesion } from './ContextoSesion';
import { Isotipo } from '@/componentes/ui/Isotipo';
import { Boton } from '@/componentes/ui/Boton';
import { BotonTema } from '@/componentes/ui/BotonTema';
import { Ilustracion } from '@/componentes/ui/Ilustracion';
import { Campo } from '@/componentes/ui/Campo';
import { AvisoDemo } from '@/componentes/ui/AvisoDemo';
import './login.css';

export function PaginaLogin() {
  const { usuario, iniciarSesion } = useSesion();
  const navegar = useNavigate();
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  // El destino depende del rol: la raiz se encarga de repartir.
  if (usuario) return <Navigate to="/" replace />;

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    setError(null);

    if (!esCorreoValido(correo)) {
      setError('Escribe un correo válido.');
      return;
    }

    setEnviando(true);
    try {
      await iniciarSesion({ correo, contrasena });
      navegar('/');
    } catch (causa) {
      // Mensaje generico a proposito: no revelamos si el correo existe.
      setError(
        causa instanceof ErrorHttp && causa.estadoHttp === 0
          ? causa.message
          : 'El correo o la contraseña no coinciden.',
      );
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <aside className="login__panel">
        <div className="login__marca">
          <Isotipo tamano={48} sobreOscuro />
          <span className="login__nombre">Huellitas</span>
        </div>

        <div>
          <h1 className="login__titulo">
            Panel de refugios
            <br />y administración
          </h1>
          <p className="login__descripcion">
            Gestiona tus mascotas publicadas, responde solicitudes de adopción,
            atiende reportes ciudadanos y haz seguimiento a cada adopción
            entregada.
          </p>
        </div>

        {/* Entre el texto y las notas legales, que es donde el panel tenia
            aire de sobra. En pantallas bajas se oculta por CSS: antes que
            apretar el titulo, preferimos que no este. */}
        <div className="login__ilustracion">
          {/* Sin alto: aqui lo decide login.css, que lo ajusta al alto de
              la ventana. Un alto en linea le ganaria a esa regla. */}
          <Ilustracion variante="trio" />
        </div>

        <ul className="login__notas">
          <li>Solo los refugios verificados pueden publicar mascotas</li>
          <li>Tus datos se tratan según la Ley 1581 de 2012</li>
        </ul>
      </aside>

      <main className="login__formulario">
        {/* Fuera del <form>: no es un campo y no debe entrar en el tabulado
            entre correo y contrasena. */}
        <div className="login__tema">
          <BotonTema conEtiqueta />
        </div>

        <form onSubmit={alEnviar} noValidate>
          <h2 className="login__encabezado">Iniciar sesión</h2>
          <p className="login__ayuda">
            Ingresa con la cuenta del encargado del refugio
          </p>

          <AvisoDemo conCredenciales />

          <Campo
            id="correo"
            etiqueta="Correo"
            tipo="email"
            autoComplete="email"
            valor={correo}
            alCambiar={setCorreo}
            marcador="refugio@ejemplo.com"
          />

          <Campo
            id="contrasena"
            etiqueta="Contraseña"
            tipo="password"
            autoComplete="current-password"
            valor={contrasena}
            alCambiar={setContrasena}
          />

          {error && (
            <p className="login__error" role="alert">
              {error}
            </p>
          )}

          <div className="login__fila">
            <Link to="/olvide-contrasena">Olvidé mi contraseña</Link>
          </div>

          <Boton tipo="submit" variante="primario" ancho cargando={enviando}>
            Entrar al panel
          </Boton>

          <section className="login__registro">
            <h3>¿Tu refugio todavía no está en Huellitas?</h3>
            <p>
              Envía la solicitud con el NIT y los datos de contacto para que el
              administrador la revise.
            </p>
            <Link to="/solicitar-registro">Solicitar registro de refugio</Link>
          </section>
        </form>
      </main>
    </div>
  );
}
