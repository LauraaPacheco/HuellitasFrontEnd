import { lazy, Suspense } from 'react';
import { createBrowserRouter, Navigate, type RouteObject } from 'react-router-dom';
import { NivelRol } from '@huellitas/shared';
import { Layout } from '@/componentes/layout/Layout';
import { PaginaLogin } from '@/modulos/autenticacion/PaginaLogin';
import { PaginaConfirmarCorreo } from '@/modulos/autenticacion/PaginaConfirmarCorreo';
import { PaginaOlvideContrasena } from '@/modulos/autenticacion/PaginaOlvideContrasena';
import { PaginaSolicitarRegistro } from '@/modulos/autenticacion/PaginaSolicitarRegistro';
import { PaginaSinPermiso } from '@/modulos/autenticacion/PaginaSinPermiso';
import { InicioSegunRol } from '@/modulos/autenticacion/InicioSegunRol';
import { RutaProtegida } from '@/modulos/autenticacion/RutaProtegida';
import { PaginaBandeja } from '@/modulos/solicitudes/PaginaBandeja';
import { PaginaDetalleSolicitud } from '@/modulos/solicitudes/PaginaDetalleSolicitud';
import { PaginaPendiente } from '@/modulos/PaginaPendiente';

const REFUGIO_Y_ADMIN = [NivelRol.Refugio, NivelRol.Administrador] as const;

/**
 * Catalogo de componentes, solo en desarrollo.
 *
 * El lazy() va DENTRO del condicional a proposito. Si se declara afuera,
 * el import() queda alcanzable y el empaquetador no puede descartarlo: la
 * galeria termina viajando al usuario en produccion. Asi, Vite reemplaza
 * import.meta.env.DEV por false, la rama entera queda muerta y el chunk
 * no se genera. Comprobado: sin esto salia un PaginaGaleria-*.js en dist.
 */
const rutasDesarrollo: RouteObject[] = import.meta.env.DEV
  ? [
      {
        path: '/galeria',
        element: (() => {
          const Galeria = lazy(() =>
            import('@/modulos/galeria/PaginaGaleria').then((m) => ({
              default: m.PaginaGaleria,
            })),
          );
          return (
            <Suspense fallback={<p style={{ padding: 'var(--space-7)' }}>Cargando…</p>}>
              <Galeria />
            </Suspense>
          );
        })(),
      },
    ]
  : [];

export const rutas = createBrowserRouter([
  ...rutasDesarrollo,
  // Publicas: se llega sin sesion, desde un correo o desde el login.
  { path: '/login', element: <PaginaLogin /> },
  { path: '/confirmar', element: <PaginaConfirmarCorreo /> },
  { path: '/olvide-contrasena', element: <PaginaOlvideContrasena /> },
  { path: '/solicitar-registro', element: <PaginaSolicitarRegistro /> },
  {
    path: '/',
    element: (
      <RutaProtegida>
        <Layout />
      </RutaProtegida>
    ),
    children: [
      // A donde llega cada quien depende de su rol: mandar a todos a
      // /solicitudes dejaba al adoptante rebotando contra sin-permiso.
      { index: true, element: <InicioSegunRol /> },
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
      <RutaProtegida>
        <PaginaSinPermiso />
      </RutaProtegida>
    ),
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);
