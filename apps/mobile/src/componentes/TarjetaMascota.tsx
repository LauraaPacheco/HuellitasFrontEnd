import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { House, ImageOff, ShieldCheck } from 'lucide-react-native';
import { ESTADO_MASCOTA, tiempoRelativo, type MascotaResumen } from '@huellitas/shared';
import { DatosMascota, datosMascota } from '@/componentes/DatosMascota';
import { Insignia } from '@/componentes/Insignia';
import { BotonFavorito } from '@/componentes/BotonFavorito';
import { useFavoritos } from '@/lib/favoritos';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * Tarjeta del catálogo y de "Mis favoritos". Al adoptante le muestra el
 * corazón sobre la foto para guardar la mascota sin entrar a la ficha.
 */
export function TarjetaMascota({ mascota }: { readonly mascota: MascotaResumen }) {
  const paleta = usarPaleta();
  const favoritos = useFavoritos();

  return (
    <View>
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
              <Text numberOfLines={1} style={[estilos.nombre, { color: paleta.ink }]}>{mascota.nombre}</Text>
              <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
            </View>

            {/* Los datos de dos en dos con su icono, como en Mi cuenta de la web. */}
            <DatosMascota datos={datosMascota(mascota)} />

            {(mascota.refugioNombre || mascota.fechaUltimaActualizacion) && (
              <View style={[estilos.pieTarjeta, { borderTopColor: paleta.border }]}>
                {mascota.refugioNombre && (
                  <View style={estilos.refugio}>
                    {mascota.refugioVerificado
                      ? <ShieldCheck size={15} strokeWidth={1.75} color={paleta.brandStrong} />
                      : <House size={15} strokeWidth={1.75} color={paleta.inkMuted} />}
                    <Text numberOfLines={1} style={[estilos.refugioTexto, { color: paleta.ink }]}>{mascota.refugioNombre}</Text>
                  </View>
                )}
                {/* La frescura del dato fue la queja principal de la encuesta. */}
                {mascota.fechaUltimaActualizacion && (
                  <Text style={[estilos.detalle, { color: paleta.inkMuted }]}>{tiempoRelativo(mascota.fechaUltimaActualizacion)}</Text>
                )}
              </View>
            )}
          </View>
        </Pressable>
      </Link>

      {/* Fuera del Link para que tocar el corazón no abra la ficha. */}
      {favoritos.disponible && (
        <View style={estilos.corazon}>
          <BotonFavorito marcado={favoritos.esFavorito(mascota.id)} nombre={mascota.nombre} alPresionar={() => favoritos.alternar(mascota)} />
        </View>
      )}
    </View>
  );
}

export function FotoCatalogo({ uri, nombre, alto = 200 }: { uri: string | null; nombre: string; alto?: number }) {
  const [fallo, setFallo] = useState(false);
  const paleta = usarPaleta();
  return uri && !fallo ? (
    <Image source={{ uri }} accessibilityLabel={`Foto de ${nombre}`} resizeMode="cover" onError={() => setFallo(true)} style={[estilos.foto, { height: alto }]} />
  ) : (
    <View style={[estilos.foto, estilos.sinFoto, { height: alto, backgroundColor: paleta.surface300 }]}>
      <ImageOff size={28} strokeWidth={1.5} color={paleta.inkMuted} />
      <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>Sin foto disponible</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tarjeta: { borderWidth: 1, borderRadius: radios.lg, overflow: 'hidden' },
  foto: { width: '100%', height: 200 },
  sinFoto: { alignItems: 'center', justifyContent: 'center', gap: espaciado.s2 },
  cuerpo: { padding: espaciado.s4, gap: espaciado.s3 },
  fila: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s2 },
  nombre: { flexShrink: 1, fontSize: 20, fontWeight: '700' },
  detalle: { fontSize: 13 },
  pieTarjeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s3, paddingTop: espaciado.s3, borderTopWidth: 1 },
  refugio: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  refugioTexto: { fontSize: 13, fontWeight: '600', flexShrink: 1 },
  corazon: { position: 'absolute', top: espaciado.s3, right: espaciado.s3 },
});
