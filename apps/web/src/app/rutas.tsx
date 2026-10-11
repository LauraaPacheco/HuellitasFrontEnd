import { createBrowserRouter, Navigate } from 'react-router-dom';
import { NivelRol } from '@huellitas/shared';
import { Layout } from '@/componentes/layout/Layout';
import { PaginaLogin } from '@/modulos/autenticacion/PaginaLogin';
import { RutaProtegida } from '@/modulos/autenticacion/RutaProtegida';
import { PaginaBandeja } from '@/modulos/solicitudes/PaginaBandeja';
import { PaginaDetalleSolicitud } from '@/modulos/solicitudes/PaginaDetalleSolicitud';
import { PaginaPendiente } from '@/modulos/PaginaPendiente';

const REFUGIO_Y_ADMIN = [NivelRol.Refugio, NivelRol.Administrador] as const;

export const rutas = createBrowserRouter([
  { path: '/login', element: <PaginaLogin /> },
  {
    path: '/',
    element: (
      <RutaProtegida>
        <Layout />
      </RutaProtegida>
    ),
    children: [
      { index: true, element: <Navigate to="/solicitudes" replace /> },
      {
        path: 'solicitudes',
        element: (
          <RutaProtegida niveles={REFUGIO_Y_ADMIN}>
            <PaginaBandeja />
          </RutaProtegida>
        ),
      },
      {
        path: 'solicitudes/:id',
        element: (
          <RutaProtegida niveles={REFUGIO_Y_ADMIN}>
            <PaginaDetalleSolicitud />
          </RutaProtegida>
        ),
      },
      {
        path: 'mascotas',
        element: (
          <RutaProtegida niveles={REFUGIO_Y_ADMIN}>
            <PaginaPendiente titulo="Mascotas" historias="HU-MAS-01 a HU-MAS-05" />
          </RutaProtegida>
        ),
      },
      {
        path: 'reportes',
        element: (
          <RutaProtegida niveles={REFUGIO_Y_ADMIN}>
            <PaginaPendiente titulo="Reportes ciudadanos" historias="HU-REP-02" />
          </RutaProtegida>
        ),
      },
      {
        path: 'seguimientos',
        element: (
          <RutaProtegida niveles={[NivelRol.Refugio]}>
            <PaginaPendiente titulo="Seguimientos" historias="HU-TRA-03" />
          </RutaProtegida>
        ),
      },
      {
        path: 'indicadores',
        element: (
          <RutaProtegida niveles={REFUGIO_Y_ADMIN}>
            <PaginaPendiente titulo="Indicadores" historias="HU-ADM-04" />
          </RutaProtegida>
        ),
      },
      {
        path: 'refugios',
        element: (
          <RutaProtegida niveles={[NivelRol.Administrador]}>
            <PaginaPendiente
              titulo="Verificación de refugios"
              historias="HU-REF-01 y HU-ADM-01"
            />
          </RutaProtegida>
        ),
      },
      {
        path: 'usuarios',
        element: (
          <RutaProtegida niveles={[NivelRol.Administrador]}>
            <PaginaPendiente titulo="Usuarios" historias="HU-ADM-01" />
          </RutaProtegida>
        ),
      },
    ],
  },
  {
    path: '/sin-permiso',
    element: (
      <div style={{ padding: 'var(--space-7)' }}>
        <h1>No tienes permiso para ver esta página</h1>
        <p style={{ color: 'var(--ink-muted)' }}>
          Si crees que es un error, contacta al administrador de la plataforma.
        </p>
      </div>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
