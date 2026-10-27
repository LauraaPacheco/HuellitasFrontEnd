import { Redirect } from 'expo-router';

export default function Inicio() {
  // El visitante entra directo al catálogo; el login queda a un toque.
  return <Redirect href="/principal/catalogo" />;
}
