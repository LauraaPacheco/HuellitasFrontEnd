import { useNavigate } from 'react-router-dom';
import { NivelRol } from '@huellitas/shared';
import { Boton } from '@/componentes/ui/Boton';
import { Ilustracion } from '@/componentes/ui/Ilustracion';
import { MarcoAuth } from './MarcoAuth';
import { useSesion } from './ContextoSesion';

/**
 * Donde cae quien entra con una cuenta que no manda en esta aplicación.
 *
 * El caso normal no es un error: la web es el panel de refugios y
 * administradores, así que un adoptante no tiene ninguna pantalla aquí.
 * Por eso explica a qué cuenta pertenece y ofrece salir, en vez de dejar
 * a la persona encerrada sin ningún enlace.
 */
export function PaginaSinPermiso() {
  const { usuario, cerrarSesion } = useSesion();
  const navegar = useNavigate();

  const esAdoptante = usuario?.rol.nivel === NivelRol.Adoptante;

  async function salir() {
    await cerrarSesion();
    navegar('/login', { replace: true });
  }

  return (
    <MarcoAuth
      sello={<Ilustracion variante="perro-triste" tamano={168} />}
      titulo={esAdoptante ? 'Esta cuenta es de adoptante' : 'No tienes permiso para ver esta página'}
      descripcion={
        esAdoptante
          ? 'La web es el panel de los refugios y del administrador. Para adoptar, buscar mascotas y seguir tu solicitud, usa la app de Huellitas en tu celular.'
          : 'Tu cuenta no tiene acceso a esta sección. Si crees que es un error, contacta al administrador de la plataforma.'
      }
      pie={<span style={{ color: 'var(--ink-muted)', fontWeight: 400 }} />}
    >
      {usuario && (
        <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 14 }}>
          Entraste como <strong>{usuario.correo}</strong>, con el rol{' '}
          <strong>{usuario.rol.nombre}</strong>.
        </p>
      )}

      <Boton variante="primario" ancho onClick={() => void salir()}>
        Entrar con otra cuenta
      </Boton>
    </MarcoAuth>
  );
}
