import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import type { NivelRol } from '@huellitas/shared';
import { useSesion } from './ContextoSesion';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';

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
      <EstadoCargando variante="pantalla" mensaje="Verificando tu sesión…" />
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
