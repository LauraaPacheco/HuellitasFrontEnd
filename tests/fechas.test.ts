import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { aFechaIso, diasDesde, formatearFecha, formatearFechaHora, formatearFechaLarga, tiempoRelativo } from '../packages/shared/src/utils/fechas';
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2026-10-20T12:00:00Z')); });
afterEach(() => vi.useRealTimers());
it.each([null, undefined, ''])('muestra alternativas cuando falta la fecha: %s', fecha => {
  expect(formatearFecha(fecha)).toBe('Sin fecha');
  expect(formatearFechaLarga(fecha)).toBe('Sin fecha');
  expect(formatearFechaHora(fecha)).toBe('Sin fecha');
  expect(tiempoRelativo(fecha)).toBe('Sin actualizar');
  expect(diasDesde(fecha)).toBe(0);
});
it.each([[0, 'Actualizada hoy'], [1, 'Actualizada ayer'], [2, 'Actualizada hace 2 días'], [30, 'Actualizada hace un mes'], [60, 'Actualizada hace 2 meses'], [360, 'Actualizada hace más de un año']])('calcula antigüedad de %s días', (dias, esperado) => {
  const iso = new Date(Date.now() - Number(dias) * 86_400_000).toISOString();
  expect(tiempoRelativo(iso)).toBe(esperado);
  expect(diasDesde(iso)).toBe(dias);
});
it('formatea fechas en español sin depender de la hora del dispositivo', () => {
  expect(formatearFecha('2026-10-20T12:00:00Z')).toContain('2026');
  expect(formatearFechaLarga('2026-10-20T12:00:00Z')).toContain('octubre');
  expect(formatearFechaHora('2026-10-20T12:00:00Z')).toContain('20');
  expect(aFechaIso(new Date('2026-10-20T12:00:00Z'))).toBe('2026-10-20');
});
