import { NavLink, Outlet } from 'react-router-dom';
import { NivelRol } from '@huellitas/shared';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Isotipo } from '@/componentes/ui/Isotipo';
import { Boton } from '@/componentes/ui/Boton';
import { BotonTema } from '@/componentes/ui/BotonTema';
import { AvisoDemo } from '@/componentes/ui/AvisoDemo';
import './layout.css';

interface ItemMenu {
  readonly ruta: string;
  readonly etiqueta: string;
  readonly niveles: readonly NivelRol[];
}

const MENU: readonly ItemMenu[] = [
  { ruta: '/solicitudes', etiqueta: 'Solicitudes', niveles: [NivelRol.Refugio, NivelRol.Administrador] },
  { ruta: '/mascotas', etiqueta: 'Mascotas', niveles: [NivelRol.Refugio, NivelRol.Administrador] },
  { ruta: '/reportes', etiqueta: 'Reportes ciudadanos', niveles: [NivelRol.Refugio, NivelRol.Administrador] },
  { ruta: '/seguimientos', etiqueta: 'Seguimientos', niveles: [NivelRol.Refugio] },
  { ruta: '/indicadores', etiqueta: 'Indicadores', niveles: [NivelRol.Refugio, NivelRol.Administrador] },
  { ruta: '/refugios', etiqueta: 'Verificación de refugios', niveles: [NivelRol.Administrador] },
  { ruta: '/usuarios', etiqueta: 'Usuarios', niveles: [NivelRol.Administrador] },
];

export function Layout() {
  const { usuario, cerrarSesion, tieneNivel } = useSesion();
  const visibles = MENU.filter((item) => tieneNivel(...item.niveles));

  return (
    <div className="layout">
      <nav className="layout__lateral" aria-label="Navegación principal">
        <div className="layout__marca">
          <Isotipo tamano={30} />
          <span>Huellitas</span>
        </div>

        <ul className="layout__menu">
          {visibles.map((item) => (
            <li key={item.ruta}>
              <NavLink
                to={item.ruta}
                className={({ isActive }) =>
                  isActive ? 'layout__enlace layout__enlace--activo' : 'layout__enlace'
                }
              >
                {item.etiqueta}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="layout__cuenta">
          <p className="layout__nombre">{usuario?.nombre}</p>
          <p className="layout__rol">{usuario?.rol.nombre}</p>
          <BotonTema conEtiqueta />
          <Boton variante="texto" onClick={() => void cerrarSesion()}>
            Cerrar sesión
          </Boton>
        </div>
      </nav>

      <main className="layout__contenido">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <AvisoDemo />
        </div>
        <Outlet />
      </main>
    </div>
  );
}
