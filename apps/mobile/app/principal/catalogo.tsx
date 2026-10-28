import { Boton } from '@/componentes/Boton';
import { HojaFiltros, contarFiltros, type FiltrosCatalogo } from '@/componentes/HojaFiltros';
import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Link } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  ESTADO_MASCOTA,
  ETIQUETA_SEXO,
  tiempoRelativo,
  type FiltroMascota,
  type MascotaResumen,
} from '@huellitas/shared';
import { api, MODO_DEMO } from '@/lib/api';
import { Insignia } from '@/componentes/Insignia';
import { AvisoDemo } from '@/componentes/AvisoDemo';
import { espaciado, radios, usarPaleta } from '@/temas';

export default function PantallaCatalogo() {
  const paleta = usarPaleta();
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const especies=useQuery({queryKey:['catalogos','especies'],queryFn:()=>api.catalogos.especies()});
  const tamanos=useQuery({queryKey:['catalogos','tamanos'],queryFn:()=>api.catalogos.tamanos()});
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<FiltroMascota>({ pagina: 1, tamanoPagina: 20 });
  const filtrosAplicados: FiltrosCatalogo = { especieId: filtro.especieId, tamanoId: filtro.tamanoId, sexo: filtro.sexo };
  const filtrosActivos = contarFiltros(filtrosAplicados);

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['mascotas', filtro],
    queryFn: () => api.mascotas.buscar(filtro),
  });

  function buscar() {
    setFiltro((previo) => ({ ...previo, pagina: 1, texto: texto.trim() || undefined }));
  }

  return (
    <View style={[estilos.pantalla, { backgroundColor: paleta.surface100 }]}>
      <View style={estilos.buscador}>
        <AvisoDemo />

        <View style={estilos.barra}>
          {MODO_DEMO ? (
            <TextInput
              accessibilityLabel="Buscar mascota"
              value={texto}
              onChangeText={setTexto}
              onSubmitEditing={buscar}
              returnKeyType="search"
              placeholder="Buscar por nombre o raza"
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
          ) : (
            <Text style={[estilos.resumen, { color: paleta.inkMuted }]}>
              {data ? `${data.total} ${data.total === 1 ? 'mascota' : 'mascotas'}` : ' '}
            </Text>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={filtrosActivos ? `Filtros, ${filtrosActivos} activos` : 'Filtros'}
            onPress={() => setFiltrosAbiertos(true)}
            style={({ pressed }) => [
              estilos.botonFiltros,
              {
                borderColor: filtrosActivos ? paleta.brand : paleta.border,
                backgroundColor: filtrosActivos ? paleta.brandTint : paleta.surface200,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Text style={{ color: filtrosActivos ? paleta.brand : paleta.ink, fontSize: 15, fontWeight: '600' }}>Filtros</Text>
            {filtrosActivos > 0 && (
              <View style={[estilos.contador, { backgroundColor: paleta.accent }]}>
                <Text style={{ color: paleta.surface100, fontSize: 12, fontWeight: '700' }}>{filtrosActivos}</Text>
              </View>
            )}
          </Pressable>
        </View>
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

      {isLoading && <ActivityIndicator style={{ marginTop: espaciado.s6 }} />}

      {isError && (
        <View style={estilos.vacio}>
          <Text style={[estilos.vacioTitulo, { color: paleta.ink }]}>
            No pudimos cargar las mascotas
          </Text>
          <Text style={[estilos.vacioTexto, { color: paleta.inkMuted }]}>
            Revisa tu conexión y desliza hacia abajo para reintentar.
          </Text>
        </View>
      )}

      <FlatList
        data={data?.items ?? []}
        keyExtractor={(mascota) => String(mascota.id)}
        contentContainerStyle={estilos.lista}
        refreshing={isRefetching}
        onRefresh={() => void refetch()}
        ListEmptyComponent={
          !isLoading && !isError ? (
            <View style={estilos.vacio}>
              <Text style={[estilos.vacioTitulo, { color: paleta.ink }]}>
                No encontramos mascotas
              </Text>
              <Text style={[estilos.vacioTexto, { color: paleta.inkMuted }]}>
                Prueba con otra búsqueda o quita algún filtro.
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={data && data.totalPaginas > 1 ? <View style={{gap:12,paddingVertical:16}}><Text style={{color:paleta.ink}}>Página {data.pagina} de {data.totalPaginas}</Text><Boton titulo="Anterior" deshabilitado={data.pagina<=1||isRefetching} alPresionar={()=>setFiltro(p=>({...p,pagina:(p.pagina??1)-1}))} /><Boton titulo="Siguiente" deshabilitado={data.pagina>=data.totalPaginas||isRefetching} alPresionar={()=>setFiltro(p=>({...p,pagina:(p.pagina??1)+1}))} /></View> : null}
        renderItem={({ item }) => <TarjetaMascota mascota={item} />}
      />
    </View>
  );
}

function TarjetaMascota({ mascota }: { readonly mascota: MascotaResumen }) {
  const paleta = usarPaleta();

  return (
    <Link href={`/mascota/${mascota.id}`} asChild>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${mascota.nombre}, ${mascota.especie}, ${mascota.refugioNombre ? `del refugio ${mascota.refugioNombre}` : ''}`}
        // Hijo de <Link asChild>: expo-router clona este elemento con
        // @radix-ui/react-slot y lanza si su prop style es un array.
        style={StyleSheet.flatten([
          estilos.tarjeta,
          { borderColor: paleta.border, backgroundColor: paleta.surface200 },
        ])}
      >
        <FotoCatalogo uri={mascota.fotoPrincipal} nombre={mascota.nombre} />

        <View style={estilos.cuerpo}>
          <View style={estilos.fila}>
            <Text style={[estilos.nombre, { color: paleta.ink }]}>{mascota.nombre}</Text>
            <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
          </View>

          <Text style={[estilos.detalle, { color: paleta.inkMuted }]}>
            {[
              mascota.especie,
              mascota.raza,
              mascota.edadAproximada !== null ? `${mascota.edadAproximada} años` : null,
              mascota.tamano,
              ETIQUETA_SEXO[mascota.sexo],
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>

          <Text style={[estilos.refugio, { color: paleta.ink }]}>
            {mascota.refugioNombre}
            {mascota.refugioVerificado && (
              <Text style={{ color: paleta.inkMuted }}> · verificado</Text>
            )}
          </Text>

          {/* La frescura del dato fue la queja principal de la encuesta. */}
          <Text style={[estilos.detalle, { color: paleta.inkMuted }]}>
            {mascota.fechaUltimaActualizacion ? tiempoRelativo(mascota.fechaUltimaActualizacion) : ''}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

function FotoCatalogo({uri,nombre}:{uri:string|null;nombre:string}) {
  const [fallo,setFallo]=useState(false);const paleta=usarPaleta();
  return uri && !fallo ? <Image source={{uri}} accessibilityLabel={`Foto de ${nombre}`} resizeMode="cover" onError={()=>setFallo(true)} style={{width:'100%',height:148}} /> : <View style={[estilos.foto,{backgroundColor:paleta.surface300}]}><Text style={{color:paleta.inkMuted}}>Sin foto disponible</Text></View>;
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
  entrada: {
    flex: 1,
    height: 48,
    paddingHorizontal: espaciado.s4,
    borderWidth: 1,
    borderRadius: radios.md,
    fontSize: 15,
  },
  lista: { paddingHorizontal: espaciado.s4, paddingBottom: espaciado.s6, gap: espaciado.s4 },
  tarjeta: { borderWidth: 1, borderRadius: radios.lg, overflow: 'hidden' },
  foto: { height: 148, alignItems: 'center', justifyContent: 'center' },
  cuerpo: { padding: espaciado.s4, gap: espaciado.s2 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  nombre: { fontSize: 22, fontWeight: '700' },
  detalle: { fontSize: 13 },
  refugio: { fontSize: 13, fontWeight: '600' },
  vacio: { padding: espaciado.s6, alignItems: 'center', gap: espaciado.s2 },
  vacioTitulo: { fontSize: 17, fontWeight: '600' },
  vacioTexto: { fontSize: 14, textAlign: 'center' },
});
