import { useState } from 'react';
import {
  ActivityIndicator,
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
import { api } from '@/lib/api';
import { Insignia } from '@/componentes/Insignia';
import { AvisoDemo } from '@/componentes/AvisoDemo';
import { espaciado, radios, usarPaleta } from '@/temas';

export default function PantallaCatalogo() {
  const paleta = usarPaleta();
  const [texto, setTexto] = useState('');
  const [filtro, setFiltro] = useState<FiltroMascota>({ pagina: 1, tamanoPagina: 20 });

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
      </View>

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
        accessibilityLabel={`${mascota.nombre}, ${mascota.especie}, del refugio ${mascota.refugioNombre}`}
        // Hijo de <Link asChild>: expo-router clona este elemento con
        // @radix-ui/react-slot y lanza si su prop style es un array.
        style={StyleSheet.flatten([
          estilos.tarjeta,
          { borderColor: paleta.border, backgroundColor: paleta.surface200 },
        ])}
      >
        <View style={[estilos.foto, { backgroundColor: paleta.surface300 }]}>
          <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>
            {mascota.fotoPrincipal ? '' : 'Sin foto'}
          </Text>
        </View>

        <View style={estilos.cuerpo}>
          <View style={estilos.fila}>
            <Text style={[estilos.nombre, { color: paleta.ink }]}>{mascota.nombre}</Text>
            <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
          </View>

          <Text style={[estilos.detalle, { color: paleta.inkMuted }]}>
            {[
              mascota.especie,
              mascota.raza,
              mascota.edadAproximada ? `${mascota.edadAproximada} años` : null,
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
            {tiempoRelativo(mascota.fechaUltimaActualizacion)}
          </Text>
        </View>
      </Pressable>
    </Link>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1 },
  buscador: { padding: espaciado.s4, paddingBottom: espaciado.s3, gap: espaciado.s3 },
  entrada: {
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
