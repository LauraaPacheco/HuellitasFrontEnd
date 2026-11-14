import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  BadgeCheck,
  ChartColumn,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  House,
  Inbox,
  Megaphone,
  PawPrint,
  UserRound,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react';
import { NivelRol } from '@huellitas/shared';
import { MODO_DEMO } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Isotipo } from '@/componentes/ui/Isotipo';
import { BotonTema } from '@/componentes/ui/BotonTema';
import { AvisoDemo } from '@/componentes/ui/AvisoDemo';
import { ContextoSeccion, ContextoTituloPagina } from './TituloPagina';
import { BarraInferior } from './BarraInferior';
import './layout.css';

interface ItemMenu {
  readonly ruta: string;
  readonly etiqueta: string;
  /** Los mismos iconos de Lucide que usa la app movil. */
  readonly icono: LucideIcon;
  readonly niveles: readonly NivelRol[];
  /**
   * No se lista entre las secciones. Mi cuenta se abre desde el bloque de
   * usuario (iniciales y nombre); sigue aqui para que su pantalla tenga
   * icono en el titulo.
   */
  readonly fueraDeLista?: boolean;
  /** Va en la barra inferior movil. Se toman los cuatro primeros visibles. */
  readonly enBarra?: boolean;
}

const MENU: readonly ItemMenu[] = [
  { ruta: '/mi-cuenta', etiqueta: 'Mi cuenta', icono: UserRound, niveles: [NivelRol.Refugio, NivelRol.Administrador], fueraDeLista: true },
  { ruta: '/mi-refugio', etiqueta: 'Mi refugio', icono: House, niveles: [NivelRol.Refugio] },
  { ruta: '/solicitudes', etiqueta: 'Solicitudes', icono: Inbox, niveles: [NivelRol.Refugio, NivelRol.Administrador], enBarra: true },
  { ruta: '/mascotas', etiqueta: 'Mascotas', icono: PawPrint, niveles: [NivelRol.Refugio, NivelRol.Administrador], enBarra: true },
  { ruta: '/reportes', etiqueta: 'Reportes ciudadanos', icono: Megaphone, niveles: [NivelRol.Refugio, NivelRol.Administrador], enBarra: true },
  { ruta: '/seguimientos', etiqueta: 'Seguimientos', icono: ClipboardCheck, niveles: [NivelRol.Refugio], enBarra: true },
  { ruta: '/indicadores', etiqueta: 'Indicadores', icono: ChartColumn, niveles: [NivelRol.Refugio, NivelRol.Administrador] },
  { ruta: '/refugios', etiqueta: MODO_DEMO ? 'Verificar refugios' : 'Refugios', icono: BadgeCheck, niveles: [NivelRol.Administrador], enBarra: true },
  { ruta: '/usuarios', etiqueta: 'Usuarios', icono: Users, niveles: [NivelRol.Administrador] },
];

/** Preferencia del menu compacto en escritorio. Es por navegador, no por cuenta. */
const CLAVE_COMPACTO = 'huellitas.menuCompacto';

function leerCompacto(): boolean {
  try {
    return localStorage.getItem(CLAVE_COMPACTO) === '1';
  } catch {
    // Ventana privada o almacenamiento bloqueado: arranca expandido.
    return false;
  }
}

export function Layout() {
  const { usuario, cerrarSesion, tieneNivel } = useSesion();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [compacto, setCompacto] = useState(leerCompacto);
  const [tituloPagina, setTituloPagina] = useState<string>();
  const [desplazado, setDesplazado] = useState(false);

  // La barra movil solo marca su borde cuando hay contenido pasando debajo.
  useEffect(() => {
    const alDesplazar = () => setDesplazado(window.scrollY > 4);
    alDesplazar();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    return () => window.removeEventListener('scroll', alDesplazar);
  }, []);
  const { pathname } = useLocation();
  useEffect(() => {
    try {
      localStorage.setItem(CLAVE_COMPACTO, compacto ? '1' : '0');
    } catch {
      // Sin almacenamiento solo se pierde el recuerdo, no la funcion.
    }
  }, [compacto]);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const botonCerrar = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  function cerrarMenu() {
    if (menuAbierto) { setMenuAbierto(false); botonMenu.current?.focus(); }
  }

  // Panel lateral en movil: mientras esta abierto la pagina de fondo no se
  // desplaza, el foco entra al panel y, si la ventana crece a escritorio,
  // se cierra solo para no dejar el fondo bloqueado.
  useEffect(() => {
    if (!menuAbierto) return;
    const anterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // El foco entra a la primera opcion de la ventana.
    panel.current?.querySelector<HTMLElement>('.layout__enlace')?.focus();
    const escritorio = window.matchMedia('(min-width: 901px)');
    const alCambiar = () => { if (escritorio.matches) setMenuAbierto(false); };
    escritorio.addEventListener('change', alCambiar);
    return () => {
      document.body.style.overflow = anterior;
      escritorio.removeEventListener('change', alCambiar);
    };
  }, [menuAbierto]);

  /** Con el panel abierto, Tab da la vuelta dentro de el y no se escapa al fondo. */
  function atraparFoco(evento: React.KeyboardEvent) {
    if (!menuAbierto || evento.key !== 'Tab' || !panel.current) return;
    const enfocables = panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
    if (enfocables.length === 0) return;
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    if (!primero || !ultimo) return;
    if (evento.shiftKey && document.activeElement === primero) { evento.preventDefault(); ultimo.focus(); }
    else if (!evento.shiftKey && document.activeElement === ultimo) { evento.preventDefault(); primero.focus(); }
  }
  const visibles = MENU.filter((item) => tieneNivel(...item.niveles));
  const enBarra = visibles.filter((item) => item.enBarra).slice(0, 4);
  const seccionActual = visibles.find((item) => pathname === item.ruta || pathname.startsWith(`${item.ruta}/`));
  // Si la pagina no trae Encabezado, la barra usa el nombre de la seccion.
  const tituloBarra = tituloPagina ?? seccionActual?.etiqueta;
  const IconoSeccion = seccionActual?.icono;

  return (
    <div className={`layout${compacto ? ' layout--compacto' : ''}${menuAbierto ? ' layout--menu-abierto' : ''}${desplazado ? ' layout--desplazado' : ''}`}>
      <nav id="navegacion-principal" className="layout__lateral" aria-label="Navegación principal" onKeyDown={evento => { if (evento.key === 'Escape') cerrarMenu(); }}>
        {/* Solo en escritorio: en movil el menu ya se pliega con su boton. */}
        <button
          type="button"
          className="layout__colapsar"
          aria-controls="navegacion-principal"
          aria-expanded={!compacto}
          aria-label={compacto ? 'Expandir menú' : 'Contraer menú'}
          title={compacto ? 'Expandir menú' : 'Contraer menú'}
          onClick={() => setCompacto((valor) => !valor)}
        >
          {compacto
            ? <ChevronRight size={16} strokeWidth={2} aria-hidden="true" />
            : <ChevronLeft size={16} strokeWidth={2} aria-hidden="true" />}
        </button>

        <div className="layout__cabecera">
          <div className="layout__marca">
            <Isotipo tamano={30} />
            <span className="layout__nombre-marca">Huellitas</span>
          </div>
          {/* Copia visual del titulo para la barra movil. El h1 real sigue en
              la pagina para el lector de pantalla; esta no se lee dos veces. */}
          {IconoSeccion && (
            <span className="layout__icono-barra" aria-hidden="true">
              <IconoSeccion size={18} strokeWidth={1.75} />
            </span>
          )}
          {tituloBarra && <span className="layout__titulo-barra" aria-hidden="true">{tituloBarra}</span>}
        </div>

        {/* Capa oscura detras del panel en movil: tocarla cierra el menu. */}
        <div className="layout__fondo" aria-hidden="true" onClick={cerrarMenu} />

        <div
          ref={panel}
          id="menu-panel"
          className={`layout__opciones${menuAbierto ? ' layout__opciones--abiertas' : ''}`}
          onKeyDown={atraparFoco}
        >
        {/* Solo se ve en el panel movil: marca y boton de cerrar. */}
        <div className="layout__cajon-cabecera">
          <div className="layout__marca">
            <Isotipo tamano={30} />
            <span>Huellitas</span>
          </div>
          <button ref={botonCerrar} type="button" className="layout__cerrar-cajon" aria-label="Cerrar menú" onClick={cerrarMenu}>
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <ul className="layout__menu">
          {visibles.filter((item) => !item.fueraDeLista).map((item) => (
            <li key={item.ruta}>
              <NavLink
                to={item.ruta}
                onClick={cerrarMenu}
                // En compacto el texto se oculta: el title da el nombre al pasar el mouse.
                title={compacto ? item.etiqueta : undefined}
                className={({ isActive }) =>
                  isActive ? 'layout__enlace layout__enlace--activo' : 'layout__enlace'
                }
              >
                <item.icono className="layout__icono" size={18} strokeWidth={1.75} aria-hidden="true" />
                <span className="layout__etiqueta">{item.etiqueta}</span>
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="layout__cuenta">
          {/* Tus iniciales y tu nombre llevan a Mi cuenta. */}
          <NavLink
            to="/mi-cuenta"
            onClick={cerrarMenu}
            className={({ isActive }) => `layout__usuario${isActive ? ' layout__usuario--activo' : ''}`}
            aria-label={`Mi cuenta: ${usuario?.nombre ?? ''}, ${usuario?.rol.nombre ?? ''}`}
            title={compacto ? `Mi cuenta · ${usuario?.nombre ?? ''}` : 'Ir a mi cuenta'}
          >
            <span className="layout__avatar" aria-hidden="true">
              {iniciales(usuario?.nombre)}
            </span>
            <div className="layout__identidad" aria-hidden="true">
              <p className="layout__nombre">{usuario?.nombre}</p>
              <p className="layout__rol">{usuario?.rol.nombre}</p>
            </div>
          </NavLink>

          <div className="layout__acciones-cuenta">
            <button type="button" className="layout__salir" title={compacto ? 'Cerrar sesión' : undefined} onClick={() => void cerrarSesion()}>
              <IconoSalir />
              <span className="layout__salir-texto">Cerrar sesión</span>
            </button>
            <BotonTema />
          </div>
        </div>
        </div>
      </nav>

      {/* Movil: accesos directos abajo; "Más" abre el menu completo. */}
      <BarraInferior
        items={enBarra}
        menuAbierto={menuAbierto}
        refMas={botonMenu}
        alAbrirMas={() => (menuAbierto ? cerrarMenu() : setMenuAbierto(true))}
      />

      <main className="layout__contenido">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <AvisoDemo />
        </div>
        <ContextoTituloPagina.Provider value={setTituloPagina}>
          <ContextoSeccion.Provider value={seccionActual}>
            <Outlet />
          </ContextoSeccion.Provider>
        </ContextoTituloPagina.Provider>
      </main>
    </div>
  );
}

/** Dos iniciales: las del primer y segundo nombre, o una si solo hay uno. */
function iniciales(nombre?: string) {
  if (!nombre) return '';
  return nombre
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

function IconoSalir() {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h11" />
    </svg>
  );
}
