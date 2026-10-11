import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import { useMutation } from '@tanstack/react-query';
import { ETIQUETA_TIPO_REPORTE, TipoReporte, ErrorHttp } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { espaciado, radios, usarPaleta } from '@/temas';

const TIPOS: readonly TipoReporte[] = [
  TipoReporte.Herido,
  TipoReporte.EnCalle,
  TipoReporte.Maltrato,
];

export default function PantallaReportar() {
  const paleta = usarPaleta();
  const { usuario } = useSesion();
  const [tipo, setTipo] = useState<TipoReporte>(TipoReporte.Herido);
  const [descripcion, setDescripcion] = useState('');
  const [ubicacion, setUbicacion] = useState<Location.LocationObjectCoords | null>(null);
  const [obteniendo, setObteniendo] = useState(false);

  const enviar = useMutation({
    mutationFn: () => {
      if (!ubicacion) throw new Error('Falta la ubicación');
      return api.reportes.crear({
        tipo,
        descripcion,
        latitud: ubicacion.latitude,
        longitud: ubicacion.longitude,
      });
    },
    onSuccess: (reporte) => {
      Alert.alert(
        'Reporte enviado',
        `Tu reporte quedó con el número ${reporte.numeroReporte}. Te avisaremos cuando un refugio lo tome.`,
      );
      setDescripcion('');
    },
    onError: (causa) => {
      Alert.alert(
        'No se pudo enviar',
        causa instanceof ErrorHttp ? causa.message : 'Inténtalo de nuevo en un momento.',
      );
    },
  });

  async function tomarUbicacion() {
    setObteniendo(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Sin permiso de ubicación',
          'Puedes escribir la dirección a mano para que el refugio sepa dónde buscar.',
        );
        return;
      }
      const posicion = await Location.getCurrentPositionAsync({});
      setUbicacion(posicion.coords);
    } finally {
      setObteniendo(false);
    }
  }

  if (!usuario) {
    return (
      <AvisoSesion mensaje="Para reportar un animal necesitamos saber quién lo vio, por si el refugio debe contactarte." />
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.contenido}
    >
      <View style={estilos.grupo}>
        <Text style={[estilos.etiqueta, { color: paleta.ink }]}>Tipo de reporte</Text>
        <View style={estilos.chips}>
          {TIPOS.map((valor) => {
            const activo = valor === tipo;
            return (
              <Text
                key={valor}
                accessibilityRole="button"
                accessibilityState={{ selected: activo }}
                onPress={() => setTipo(valor)}
                style={[
                  estilos.chip,
                  {
                    backgroundColor: activo ? paleta.accent : paleta.surface100,
                    borderColor: activo ? paleta.accent : paleta.border,
                    color: paleta.ink,
                  },
                ]}
              >
                {ETIQUETA_TIPO_REPORTE[valor]}
              </Text>
            );
          })}
        </View>
      </View>

      <View style={estilos.grupo}>
        <Text style={[estilos.etiqueta, { color: paleta.ink }]}>¿Qué viste?</Text>
        <TextInput
          accessibilityLabel="Descripción del animal"
          value={descripcion}
          onChangeText={setDescripcion}
          multiline
          numberOfLines={4}
          placeholder="Estado del animal, tamaño, color, hace cuánto está ahí"
          placeholderTextColor={paleta.inkMuted}
          style={[
            estilos.area,
            {
              borderColor: paleta.border,
              backgroundColor: paleta.surface100,
              color: paleta.ink,
            },
          ]}
        />
      </View>

      <View style={estilos.grupo}>
        <Text style={[estilos.etiqueta, { color: paleta.ink }]}>Ubicación</Text>
        <Text style={{ color: paleta.inkMuted, fontSize: 14 }}>
          {ubicacion
            ? `${ubicacion.latitude.toFixed(5)}, ${ubicacion.longitude.toFixed(5)}`
            : 'Todavía no has marcado dónde está el animal.'}
        </Text>
        <Boton
          titulo={ubicacion ? 'Actualizar ubicación' : 'Usar mi ubicación actual'}
          variante="secundario"
          cargando={obteniendo}
          alPresionar={() => void tomarUbicacion()}
        />
      </View>

      {tipo === TipoReporte.Maltrato && (
        <View style={[estilos.aviso, { backgroundColor: paleta.accentTint }]}>
          <Text style={[estilos.avisoTitulo, { color: paleta.ink }]}>
            Si hay maltrato, denúncialo también
          </Text>
          <Text style={{ color: paleta.ink, fontSize: 13, lineHeight: 20 }}>
            Este reporte avisa a los refugios, pero no reemplaza la denuncia formal
            ante las autoridades (Ley 1774 de 2016).
          </Text>
        </View>
      )}

      <Boton
        titulo="Enviar reporte"
        cargando={enviar.isPending}
        deshabilitado={!ubicacion || descripcion.trim().length < 10}
        alPresionar={() => enviar.mutate()}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, gap: espaciado.s5, paddingBottom: espaciado.s7 },
  grupo: { gap: espaciado.s2 },
  etiqueta: { fontSize: 13, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s2 },
  chip: {
    paddingHorizontal: espaciado.s4,
    paddingVertical: espaciado.s2,
    borderWidth: 1,
    borderRadius: radios.pill,
    fontSize: 14,
    fontWeight: '600',
    overflow: 'hidden',
  },
  area: {
    minHeight: 100,
    padding: espaciado.s3,
    borderWidth: 1,
    borderRadius: radios.sm,
    fontSize: 15,
    textAlignVertical: 'top',
  },
  aviso: { padding: espaciado.s4, borderRadius: radios.md, gap: espaciado.s1 },
  avisoTitulo: { fontSize: 14, fontWeight: '700' },
});
