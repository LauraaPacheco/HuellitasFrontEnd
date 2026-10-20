import { afterEach, describe, expect, it, vi } from 'vitest';
import { claimsDelToken, nivelDesdeNombreRol, sesionDesdeRespuesta, sesionPorVencer } from '../packages/shared/src/api/sesion';
import { NivelRol } from '../packages/shared/src/types/enums';
const jwt = (claims: unknown) => `header.${Buffer.from(JSON.stringify(claims)).toString('base64url')}.signature`;
afterEach(() => vi.useRealTimers());
describe('Sesión y roles', () => {
  it.each([[' ADMIN ', NivelRol.Administrador], ['Refugio', NivelRol.Refugio], ['Adoptante', NivelRol.Adoptante], ['Visitante', NivelRol.Visitante]])('normaliza rol %s', (nombre, nivel) => expect(nivelDesdeNombreRol(nombre)).toBe(nivel));
  it('un rol desconocido no obtiene permisos de administrador', () => expect(nivelDesdeNombreRol('otro')).toBe(NivelRol.Adoptante));
  it('lee claims UTF-8 sin depender de atob', () => {
    vi.stubGlobal('atob', undefined);
    expect(claimsDelToken(jwt({ sub: '42', nombre: 'María 🐾' }))).toEqual({ sub: '42', nombre: 'María 🐾' });
  });
  it.each(['', 'sin-puntos', 'a.!!!.b'])('tolera token ilegible %s', token => expect(claimsDelToken(token)).toEqual({}));
  it('traduce login y calcula expiración', () => {
    vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-20T12:00:00Z'));
    const sesion = sesionDesdeRespuesta({ accessToken: jwt({ sub: '42', email: 'real@huellitas.co' }), refreshToken: 'renovar', expiraEnSegundos: 900, nombre: 'María', rol: 'Refugio' }, 'otro@correo.co');
    expect(sesion.usuario.id).toBe(42);
    expect(sesion.usuario.correo).toBe('real@huellitas.co');
    expect(sesion.usuario.rol.nivel).toBe(NivelRol.Refugio);
    expect(sesion.refreshToken).toBe('renovar');
    expect(sesion.expiraEn).toBe('2026-10-20T12:15:00.000Z');
    expect(sesionPorVencer(sesion)).toBe(false);
    vi.advanceTimersByTime(841_000);
    expect(sesionPorVencer(sesion)).toBe(true);
  });
  it('conserva correo escrito si el token no lo incluye', () => {
    const sesion = sesionDesdeRespuesta({ accessToken: 'demo', refreshToken: '', expiraEnSegundos: 900, nombre: '', rol: '' }, 'persona@correo.co');
    expect(sesion.usuario.correo).toBe('persona@correo.co');
    expect(sesion.usuario.nombre).toBe('persona@correo.co');
  });
});
