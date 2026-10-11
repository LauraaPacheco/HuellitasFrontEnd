import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { NivelRol } from '@huellitas/shared';
import { useSesion } from './ContextoSesion';

interface Props {
  readonly children: ReactNode;
  /** Si se omite, basta con tener sesion iniciada. */
  readonly niveles?: readonly NivelRol[];
}

/**
 * El control de acceso real vive en el backend (RNF-04). Esto solo evita
 * mostrar pantallas que el usuario no podria usar.
 */
export function RutaProtegida({ children, niveles }: Props) {
  const { usuario, cargando, tieneNivel } = useSesion();
  const ubicacion = useLocation();

  if (cargando) {
    return (
      <div style={{ padding: 'var(--space-7)', color: 'var(--ink-muted)' }}>
        Cargando…
      </div>
    );
  }

  if (!usuario) {
    return <Navigate to="/login" state={{ desde: ubicacion.pathname }} replace />;
  }

  if (niveles && !tieneNivel(...niveles)) {
    return <Navigate to="/sin-permiso" replace />;
  }

  return <>{children}</>;
}
