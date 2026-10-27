import { PaginaCuenta } from '@/modulos/cuenta/PaginaCuenta';
import { PaginaGestionMascota } from '@/modulos/mascotas/PaginaGestionMascota';
import { PaginaVerificacionRefugios } from '@/modulos/refugios/PaginaVerificacionRefugios';
import { PaginaPerfilRefugio } from '@/modulos/refugios/PaginaPerfilRefugio';
import { PaginaEditarRefugio } from '@/modulos/refugios/PaginaEditarRefugio';
import { PaginaRestablecerContrasena } from '@/modulos/autenticacion/PaginaRestablecerContrasena';
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
import { PaginaMascotas } from '@/modulos/mascotas/PaginaMascotas';
import { PaginaBandeja } from '@/modulos/solicitudes/PaginaBandeja';
import { PaginaDetalleSolicitud } from '@/modulos/solicitudes/PaginaDetalleSolicitud';
import { PaginaPendiente } from '@/modulos/PaginaPendiente';

const REFUGIO_Y_ADMIN = [NivelRol.Refugio, NivelRol.Administrador] as const;

/**
 * Catalogo de componentes, solo con el servidor de desarrollo levantado.
 *
 * Dos detalles aqui son a proposito y los dos se comprobaron mirando dist:
 *
 * 1. El lazy() va DENTRO del condicional. Declarado afuera, el import()
 *    queda alcanzable y el empaquetador no puede descartarlo: la galeria
 *    termina viajando al usuario. Asi la rama entera queda muerta y el
 *    chunk no se genera.
 * 2. La condicion es import.meta.hot y no import.meta.env.DEV, porque
 *    DEV mira el modo y no el comando: `vite build --mode demo` lo deja
 *    en true y la galeria viajaria igual. import.meta.hot solo existe
 *    con el servidor levantado, y en cualquier build Rollup lo sustituye
 *    por undefined. Si algun dia dejara de existir, lo que se pierde es
 *    la galeria en desarrollo, no la app: es un acceso a propiedad, no
 *    una variable global que al faltar rompe la pagina entera.
 */
const rutasDesarrollo: RouteObject[] = import.meta.hot
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
  { path: '/refugios/:id', element: <PaginaPerfilRefugio /> },
  { path: '/login', element: <PaginaLogin /> },
  { path: '/confirmar', element: <PaginaConfirmarCorreo /> },
  { path: '/restablecer-contrasena', element: <PaginaRestablecerContrasena /> },
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
      { path: 'mi-cuenta', element: <PaginaCuenta /> },
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
            <PaginaMascotas />
          </RutaProtegida>
        ),
      },
      { path: 'mascotas/nueva', element: <RutaProtegida niveles={[NivelRol.Refugio]}><PaginaGestionMascota /></RutaProtegida> },
      { path: 'mascotas/:id/editar', element: <RutaProtegida niveles={[NivelRol.Refugio]}><PaginaGestionMascota /></RutaProtegida> },
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
      { path: 'mi-refugio', element: <RutaProtegida niveles={[NivelRol.Refugio]}><PaginaEditarRefugio /></RutaProtegida> },
      {
        path: 'refugios',
        element: (
          <RutaProtegida niveles={[NivelRol.Administrador]}>
            <PaginaVerificacionRefugios />
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
