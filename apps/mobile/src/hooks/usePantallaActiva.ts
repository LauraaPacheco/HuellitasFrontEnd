import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';

/** Solo consulta cambios mientras la pantalla esté visible y la app abierta. */
export function usePantallaActiva(): boolean {
  const [enfocada, setEnfocada] = useState(false);
  const [appActiva, setAppActiva] = useState(AppState.currentState === 'active' || AppState.currentState == null);
  useFocusEffect(useCallback(() => {
    setEnfocada(true);
    return () => setEnfocada(false);
  }, []));
  useEffect(() => {
    const suscripcion = AppState.addEventListener('change', estado => setAppActiva(estado === 'active'));
    return () => suscripcion.remove();
  }, []);
  return enfocada && appActiva;
}

export function useActualizarAlVolver(activa: boolean, actualizar: () => unknown): void {
  useEffect(() => {
    if (activa) void actualizar();
  }, [activa, actualizar]);
}
