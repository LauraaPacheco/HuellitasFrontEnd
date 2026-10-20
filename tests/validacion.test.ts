import { describe, it, expect } from 'vitest';
import { esCorreoValido, esTelefonoValido, esNitValido, esContrasenaValida, fuerzaContrasena } from '../packages/shared/src/utils/validacion';

describe('Validaciones de formularios compartidas por web y móvil', () => {
  it.each(['persona@dominio.co', ' persona+demo@dominio.com '])('acepta correo %s', correo => expect(esCorreoValido(correo)).toBe(true));
  it.each(['', 'sin-arroba.co', 'a@b', 'a b@dominio.co'])('rechaza correo %s', correo => expect(esCorreoValido(correo)).toBe(false));
  it('normaliza teléfono colombiano y rechaza números incompletos', () => {
    expect(esTelefonoValido('300 123-4567')).toBe(true);
    expect(esTelefonoValido('300123')).toBe(false);
    expect(esTelefonoValido('300123456x')).toBe(false);
  });
  it('normaliza NIT y rechaza letras', () => {
    expect(esNitValido('900.123.456-7')).toBe(true);
    expect(esNitValido('900ABC456-7')).toBe(false);
  });
  it('valida longitud mínima y distingue fuerza', () => {
    expect(esContrasenaValida('1234567')).toBe(false);
    expect(esContrasenaValida('12345678')).toBe(true);
    expect(fuerzaContrasena('Ab1!')).toBe('debil');
    expect(fuerzaContrasena('Demo1234')).toBe('media');
    expect(fuerzaContrasena('ClaveLarga123!')).toBe('fuerte');
  });
});
