import { Navigate } from 'react-router-dom';
import { NivelRol } from '@huellitas/shared';
import { useSesion } from './ContextoSesion';

/**
 * Reparte a cada quien a su primera pantalla.
 *
 * Un refugio y el administrador trabajan sobre la bandeja de solicitudes.
 * Un adoptante no tiene nada que hacer en este panel: su aplicación es la
 * móvil, y sin-permiso se lo explica.
 */
export function InicioSegunRol() {
  const { tieneNivel } = useSesion();

  if (tieneNivel(NivelRol.Refugio, NivelRol.Administrador)) {
    return <Navigate to="/solicitudes" replace />;
  }
  return <Navigate to="/sin-permiso" replace />;
}
