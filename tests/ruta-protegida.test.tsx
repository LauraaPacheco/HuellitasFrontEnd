import { beforeEach, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { NivelRol } from '../packages/shared/src/types/enums';
const estado = vi.hoisted(() => ({ usuario: null as unknown, cargando: false, tieneNivel: vi.fn(), navegar: vi.fn() }));
vi.mock('../apps/web/src/modulos/autenticacion/ContextoSesion', () => ({ useSesion: () => estado }));
vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/mascotas' }),
  Navigate: (props: unknown) => { estado.navegar(props); return null; },
}));
import { RutaProtegida } from '../apps/web/src/modulos/autenticacion/RutaProtegida';
beforeEach(() => { estado.usuario = null; estado.cargando = false; estado.tieneNivel.mockReset(); estado.navegar.mockClear(); });
const pintar = () => renderToStaticMarkup(<RutaProtegida niveles={[NivelRol.Refugio]}><p>Contenido privado</p></RutaProtegida>);
it('no muestra contenido privado durante la carga', () => { estado.cargando = true; expect(pintar()).toContain('Cargando'); expect(estado.navegar).not.toHaveBeenCalled(); });
it('manda al login guardando la ruta de regreso', () => { expect(pintar()).not.toContain('Contenido privado'); expect(estado.navegar).toHaveBeenCalledWith(expect.objectContaining({ to: '/login', state: { desde: '/mascotas' }, replace: true })); });
it('rechaza al usuario cuyo rol no tiene acceso', () => { estado.usuario = { id: 1 }; estado.tieneNivel.mockReturnValue(false); expect(pintar()).not.toContain('Contenido privado'); expect(estado.navegar).toHaveBeenCalledWith(expect.objectContaining({ to: '/sin-permiso' })); });
it('muestra contenido al rol autorizado', () => { estado.usuario = { id: 1 }; estado.tieneNivel.mockReturnValue(true); expect(pintar()).toContain('Contenido privado'); expect(estado.tieneNivel).toHaveBeenCalledWith(NivelRol.Refugio); expect(estado.navegar).not.toHaveBeenCalled(); });
