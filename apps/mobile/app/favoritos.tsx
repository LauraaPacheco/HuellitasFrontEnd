import { FlatList, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useFavoritos } from '@/lib/favoritos';
import { useSesion } from '@/lib/sesion';
import { TarjetaMascota } from '@/componentes/TarjetaMascota';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, usarPaleta } from '@/temas';

/** HU-MAS-07: las mascotas que el adoptante guardó con el corazón. */
export default function PantallaFavoritos() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { usuario, cargando } = useSesion();
  const favoritos = useFavoritos();
  const { consulta } = favoritos;

  if (cargando) return <EstadoCargando mensaje="Cargando…" />;
  if (!usuario) return <AvisoSesion titulo="Tus favoritos" mensaje="Crea tu cuenta para guardar las mascotas que te gustan." />;
  if (!favoritos.disponible) {
    return <EstadoVacio titulo="Solo para adoptantes" descripcion="Los favoritos están disponibles para las cuentas de adoptante." />;
  }
  if (consulta.isPending) return <EstadoCargando mensaje="Cargando tus favoritos…" />;
  if (consulta.isError) {
    return <EstadoError titulo="No pudimos cargar tus favoritos" error={consulta.error} alReintentar={() => void consulta.refetch()} reintentando={consulta.isFetching} />;
  }

  return (
    <FlatList
      style={{ backgroundColor: paleta.surface100 }}
      data={consulta.data.items}
      keyExtractor={(m) => String(m.id)}
      contentContainerStyle={estilos.lista}
      refreshing={consulta.isRefetching}
      onRefresh={() => void consulta.refetch()}
      renderItem={({ item }) => <TarjetaMascota mascota={item} />}
      ListEmptyComponent={
        <EstadoVacio
          ilustracion="confundido"
          titulo="Aún no tienes favoritos"
          descripcion="Toca el corazón en una mascota del catálogo para guardarla aquí."
          accion={<Boton titulo="Ver el catálogo" variante="secundario" alPresionar={() => router.replace('/principal/catalogo')} />}
        />
      }
    />
  );
}

const estilos = StyleSheet.create({
  lista: { flexGrow: 1, padding: espaciado.s4, paddingBottom: espaciado.s6, gap: espaciado.s4 },
});
