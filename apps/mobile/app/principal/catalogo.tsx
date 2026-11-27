import { useEspacioBarraPestanas } from '@/componentes/BarraPestanas';
import { usePantallaActiva, useActualizarAlVolver } from '@/hooks/usePantallaActiva';
import { HojaFiltros, contarFiltros, type FiltrosCatalogo } from '@/componentes/HojaFiltros';
import { useState } from 'react';
import { PawPrint, Search, SlidersHorizontal, X } from 'lucide-react-native';
import { TarjetaMascota } from '@/componentes/TarjetaMascota';
import { Recomendaciones } from '@/componentes/Recomendaciones';
import { Paginacion } from '@/componentes/Paginacion';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSesion } from '@/lib/sesion';
import { useQuery } from '@tanstack/react-query';
import { type FiltroMascota } from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { AvisoDemo } from '@/componentes/AvisoDemo';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, radios, usarPaleta } from '@/temas';

const UNA_HORA = 60 * 60 * 1000;

export default function PantallaCatalogo() {
  const paleta = usarPaleta();
  const espacioBarra = useEspacioBarraPestanas();
  const activa = usePantallaActiva();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  // Los catálogos solo los usa la hoja de filtros: se piden la primera vez que se abre,
  // no al entrar al catálogo (que es la pantalla de llegada después del login).
  const [catalogosPedidos, setCatalogosPedidos] = useState(false);
  const especies=useQuery({queryKey:['catalogos','especies'],queryFn:()=>api.catalogos.especies(),enabled:catalogosPedidos,staleTime:UNA_HORA});
  const tamanos=useQuery({queryKey:['catalogos','tamanos'],queryFn:()=>api.catalogos.tamanos(),enabled:catalogosPedidos,staleTime:UNA_HORA});
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<FiltroMascota>({ pagina: 1, tamanoPagina: 20 });
  const filtrosAplicados: FiltrosCatalogo = { especieId: filtro.especieId, tamanoId: filtro.tamanoId, sexo: filtro.sexo };
  const filtrosActivos = contarFiltros(filtrosAplicados);

  const { data, isLoading, isError, error, refetch, isRefetching, isFetching } = useQuery({
    queryKey: ['mascotas', filtro],
    queryFn: () => api.mascotas.buscar(filtro),
    refetchInterval: activa ? 10_000 : false,
    refetchIntervalInBackground: false,
  });

  useActualizarAlVolver(activa, refetch);

  function buscar() {
    setFiltro((previo) => ({ ...previo, pagina: 1, texto: texto.trim() || undefined }));
  }

  return (
    <View style={[estilos.pantalla, { backgroundColor: paleta.surface100 }]}>
      <View style={estilos.buscador}>
        <AvisoDemo />

        <View style={estilos.barra}>
          {MODO_DEMO ? (
            <View style={estilos.campoBusqueda}>
            <Search size={18} strokeWidth={1.75} color={paleta.inkMuted} style={estilos.lupa} pointerEvents="none" />
            <TextInput
              accessibilityLabel="Buscar mascota"
              value={texto}
              onChangeText={setTexto}
              onSubmitEditing={buscar}
              returnKeyType="search"
              placeholder="Nombre o raza"
              placeholderTextColor={paleta.inkMuted}
              style={[
                estilos.entrada,
                {
                  borderColor: paleta.border,
                  backgroundColor: paleta.surface200,
                  color: paleta.ink,
                },
              ]}
            />
            </View>
          ) : (
            <Text style={[estilos.resumen, { color: paleta.inkMuted }]}>
              {data ? `${data.total} ${data.total === 1 ? 'mascota' : 'mascotas'}` : ' '}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filtrosActivos ? `Filtros, ${filtrosActivos} activos` : 'Filtros'}
            onPress={() => { setCatalogosPedidos(true); setFiltrosAbiertos(true); }}
            style={({ pressed }) => [
              estilos.botonFiltros,
              {
                borderColor: filtrosActivos ? paleta.brand : paleta.border,
                backgroundColor: filtrosActivos ? paleta.brandTint : paleta.surface200,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <SlidersHorizontal size={18} strokeWidth={1.75} color={filtrosActivos ? paleta.brandStrong : paleta.ink} />
            <Text style={{ color: filtrosActivos ? paleta.brandStrong : paleta.ink, fontSize: 15, fontWeight: '600' }}>Filtros</Text>
            {filtrosActivos > 0 && (
              <View style={[estilos.contador, { backgroundColor: paleta.brandStrong }]}>
                <Text style={{ color: paleta.onBrand, fontSize: 12, fontWeight: '700' }}>{filtrosActivos}</Text>
              </View>
            )}
          </Pressable>
        </View>

        <InvitacionCuenta />
      </View>

      <HojaFiltros
        visible={filtrosAbiertos}
        filtro={filtrosAplicados}
        especies={especies.data ?? []}
        tamanos={tamanos.data ?? []}
        cargandoCatalogos={especies.isPending || tamanos.isPending}
        errorCatalogos={especies.isError || tamanos.isError}
        alReintentar={() => { void especies.refetch(); void tamanos.refetch(); }}
        alCerrar={() => setFiltrosAbiertos(false)}
        alAplicar={f => {
          setFiltro(previo => ({ ...previo, especieId: f.especieId, tamanoId: f.tamanoId, sexo: f.sexo, pagina: 1 }));
          setFiltrosAbiertos(false);
        }}
      />

      {isLoading && <EstadoCargando mensaje="Cargando mascotas…" />}

      {isError && (
        <EstadoError
          titulo="No pudimos cargar las mascotas"
          error={error}
          alReintentar={() => void refetch()}
          reintentando={isFetching}
        />
      )}

      {!isLoading && !isError && <FlatList
        data={data?.items ?? []}
        keyExtractor={(mascota) => String(mascota.id)}
        contentContainerStyle={[estilos.lista, { paddingBottom: espacioBarra }]}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListEmptyComponent={
          <EstadoVacio
            ilustracion="confundido"
            titulo="No encontramos mascotas"
            descripcion="Prueba con otra búsqueda o quita algún filtro."
          />
        }
        ListFooterComponent={data ? (
          <Paginacion pagina={data.pagina} totalPaginas={data.totalPaginas} ocupado={isRefetching} alCambiar={(pagina) => setFiltro((p) => ({ ...p, pagina }))} />
        ) : undefined}
        ListHeaderComponent={filtro.pagina === 1 && !filtro.texto && !filtrosActivos ? <Recomendaciones /> : undefined}
        renderItem={({ item }) => <TarjetaMascota mascota={item} />}
      />}
    </View>
  );
}

/**
 * Para quien mira sin sesion: el catalogo es la puerta de entrada y la
 * cuenta se pide aqui, a la vista, no solo al tocar "Postularme".
 */
function InvitacionCuenta() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { usuario } = useSesion();
  const [cerrada, setCerrada] = useState(false);
  if (usuario || cerrada) return null;

  return (
    <View style={[estilos.invitacion, { backgroundColor: paleta.brandTint, borderColor: paleta.brand }]}>
      <View style={[estilos.invitacionIcono, { backgroundColor: paleta.brandStrong }]}>
        <PawPrint size={20} strokeWidth={1.75} color={paleta.onBrand} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={[estilos.invitacionTitulo, { color: paleta.ink }]}>¿Ya tienes a tu favorita?</Text>
        <Text style={[estilos.invitacionTexto, { color: paleta.inkMuted }]}>Crea tu cuenta para postularte y seguir tu solicitud.</Text>
        <View style={estilos.invitacionAcciones}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/registro')}
            style={({ pressed }) => [estilos.invitacionBoton, { backgroundColor: paleta.brandStrong, opacity: pressed ? 0.85 : 1 }]}>
            <Text style={{ color: paleta.onBrand, fontSize: 14, fontWeight: '600' }}>Crear cuenta</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push('/login')}>
            <Text style={{ color: paleta.brandStrong, fontSize: 14, fontWeight: '600', textDecorationLine: 'underline' }}>Iniciar sesión</Text>
          </Pressable>
        </View>
      </View>
      <Pressable accessibilityRole="button" accessibilityLabel="Ocultar invitación" hitSlop={10} onPress={() => setCerrada(true)}>
        <X size={18} strokeWidth={1.75} color={paleta.inkMuted} />
      </Pressable>
    </View>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  buscador: { padding: espaciado.s4, paddingBottom: espaciado.s3, gap: espaciado.s3 },
  barra: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  resumen: { flex: 1, fontSize: 14 },
  botonFiltros: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s2,
    paddingHorizontal: espaciado.s4,
    borderWidth: 1,
    borderRadius: radios.md,
  },
  contador: { minWidth: 20, height: 20, paddingHorizontal: 5, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  campoBusqueda: { flex: 1, justifyContent: 'center' },
  lupa: { position: 'absolute', left: espaciado.s3, zIndex: 1 },
  entrada: {
    height: 48,
    paddingLeft: espaciado.s3 + 26,
    paddingRight: espaciado.s4,
    borderWidth: 1,
    borderRadius: radios.md,
    fontSize: 15,
  },
  lista: { flexGrow: 1, paddingHorizontal: espaciado.s4, paddingBottom: espaciado.s6, gap: espaciado.s4 },
  invitacion: { flexDirection: 'row', alignItems: 'flex-start', gap: espaciado.s3, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md },
  invitacionIcono: { width: 40, height: 40, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  invitacionTitulo: { fontSize: 15, fontWeight: '600' },
  invitacionTexto: { fontSize: 13, lineHeight: 19 },
  invitacionAcciones: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s4, marginTop: espaciado.s2 },
  invitacionBoton: { minHeight: 36, paddingHorizontal: espaciado.s4, borderRadius: radios.pill, justifyContent: 'center' },
});
