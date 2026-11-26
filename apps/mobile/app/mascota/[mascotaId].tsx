import { useState } from 'react';
import { Image, Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ChevronRight,
  HeartHandshake,
  HouseHeart,
  ImageIcon,
  Phone,
  Pill,
  Share2,
  ShieldCheck,
  Stethoscope,
  Syringe,
  type LucideIcon,
} from 'lucide-react-native';
import {
  ESTADO_MASCOTA,
  ETIQUETA_TIPO_REGISTRO_CLINICO,
  EstadoMascota,
  Sexo,
  TipoContenido,
  TipoRegistroClinico,
  formatearFecha,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { useFavoritos } from '@/lib/favoritos';
import { BotonFavorito } from '@/componentes/BotonFavorito';
import { HistoriaMascota } from '@/componentes/HistoriaMascota';
import { BotonDenunciar } from '@/componentes/BotonDenunciar';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { DatosMascota, datosMascota } from '@/componentes/DatosMascota';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { espaciado, radios, usarPaleta } from '@/temas';

const ICONOS_CLINICOS: Record<TipoRegistroClinico, LucideIcon> = {
  [TipoRegistroClinico.Vacuna]: Syringe,
  [TipoRegistroClinico.Desparasitacion]: Pill,
  [TipoRegistroClinico.Esterilizacion]: ShieldCheck,
  [TipoRegistroClinico.Diagnostico]: Stethoscope,
  [TipoRegistroClinico.Tratamiento]: Pill,
};

/**
 * Ficha publica de una mascota.
 *
 * Galeria arriba, luego quien es (con el mismo bloque de datos que la
 * tarjeta del catalogo), su historia y su refugio. La accion principal
 * queda fija abajo para que siempre este a mano.
 */
export default function PantallaMascota() {
  const paleta = usarPaleta();
  const router = useRouter();
  const margenes = useSafeAreaInsets();
  const { usuario } = useSesion();
  const { mascotaId: parametro } = useLocalSearchParams<{ mascotaId: string }>();
  const mascotaId = Number(parametro);
  const valido = Number.isSafeInteger(mascotaId) && mascotaId > 0;
  const [ancho, setAncho] = useState(320);
  const [fotoActual, setFotoActual] = useState(0);
  // Mas alta en celular (las fotos de mascotas suelen ser verticales) y con
  // tope para que en tableta no ocupe toda la pantalla.
  const altoFoto = Math.round(Math.min(Math.max(ancho * 0.85, 260), 420));
  const consulta = useQuery({
    queryKey: ['mascota', mascotaId],
    queryFn: () => api.mascotas.obtenerFicha(mascotaId),
    enabled: valido,
    retry: false,
  });
  // El historial pide sesión iniciada (cualquier rol); sin ella se invita a entrar.
  const clinica = useQuery({
    queryKey: ['historial-clinico', mascotaId],
    queryFn: () => api.mascotas.historialClinico(mascotaId, { tamanoPagina: 20 }),
    enabled: valido && !!usuario,
    retry: false,
  });
  const favoritos = useFavoritos();
  const [compartiendo, setCompartiendo] = useState(false);
  const [errorCompartir, setErrorCompartir] = useState('');
  const mascota = consulta.data;

  async function compartir() {
    if (compartiendo) return;
    setCompartiendo(true); setErrorCompartir('');
    try {
      const datos = await api.mascotas.compartir(mascotaId);
      await Share.share({ title: datos.titulo, message: `${datos.titulo}\n${datos.descripcion}\n${datos.urlFicha}`, url: datos.urlFicha });
    } catch {
      setErrorCompartir('No pudimos preparar el enlace para compartir. Intenta de nuevo.');
    } finally {
      setCompartiendo(false);
    }
  }
  const disponible = mascota?.estado === EstadoMascota.Disponible || mascota?.estado === EstadoMascota.EnProceso;
  const volver = () => (router.canGoBack() ? router.back() : router.replace('/principal/catalogo'));

  return (
    <View onLayout={(e) => setAncho(e.nativeEvent.layout.width)} style={{ flex: 1, backgroundColor: paleta.surface100 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: espaciado.s6 }}>
        <View style={[estilos.galeria, { paddingTop: margenes.top, backgroundColor: paleta.surface200 }]}>
          {mascota?.fotos.length ? (
            <ScrollView
              horizontal
              pagingEnabled
              style={{ width: ancho, maxWidth: '100%' }}
              showsHorizontalScrollIndicator={false}
              accessibilityLabel="Fotos de la mascota"
              onMomentumScrollEnd={(e) => setFotoActual(Math.round(e.nativeEvent.contentOffset.x / ancho))}
            >
              {mascota.fotos.map((uri, i) => (
                <FotoPublica key={`${uri}-${i}`} uri={uri} nombre={`${mascota.nombre}, foto ${i + 1}`} ancho={ancho} alto={altoFoto} />
              ))}
            </ScrollView>
          ) : (
            <View style={[estilos.sinFoto, { height: Math.min(altoFoto, 220) }]}>
              <ImageIcon size={28} strokeWidth={1.5} color={paleta.inkMuted} />
              <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>
                {consulta.isPending && valido ? 'Cargando ficha…' : 'Sin fotos por ahora'}
              </Text>
            </View>
          )}
          {mascota && mascota.fotos.length > 1 && (
            <View style={estilos.puntos} accessibilityLabel={`Foto ${Math.min(fotoActual + 1, mascota.fotos.length)} de ${mascota.fotos.length}`}>
              {mascota.fotos.map((_, i) => (
                <View
                  key={i}
                  style={[estilos.punto, { backgroundColor: i === fotoActual ? '#ffffff' : 'rgba(255,255,255,0.5)', width: i === fotoActual ? 18 : 6 }]}
                />
              ))}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Volver al catálogo"
            onPress={volver}
            style={({ pressed }) => [
              estilos.volver,
              { top: margenes.top + espaciado.s3, backgroundColor: paleta.surface100, borderColor: paleta.border, opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <ArrowLeft size={22} strokeWidth={1.75} color={paleta.ink} />
          </Pressable>
          {mascota && (
            <View style={[estilos.accionesFoto, { top: margenes.top + espaciado.s3 }]}>
              {favoritos.disponible && (
                <BotonFavorito marcado={favoritos.esFavorito(mascota.id)} nombre={mascota.nombre} alPresionar={() => favoritos.alternar({ id: mascota.id })} />
              )}
              {disponible && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Compartir la ficha de ${mascota.nombre}`}
                  accessibilityState={{ busy: compartiendo }}
                  disabled={compartiendo}
                  onPress={() => void compartir()}
                  style={({ pressed }) => [estilos.botonRedondo, { backgroundColor: paleta.surface100, borderColor: paleta.border, opacity: pressed || compartiendo ? 0.7 : 1 }]}
                >
                  <Share2 size={20} strokeWidth={1.75} color={paleta.ink} />
                </Pressable>
              )}
            </View>
          )}
        </View>

        <View style={estilos.contenido}>
          {consulta.isPending && valido ? (
            <EstadoCargando mensaje="Cargando la ficha…" />
          ) : !valido ? (
            <EstadoVacio ilustracion="confundido" titulo="Esta ficha no existe" descripcion="El enlace de la mascota no es válido." />
          ) : !mascota ? (
            <EstadoError
              titulo="No pudimos consultar esta mascota"
              error={consulta.error}
              alReintentar={() => void consulta.refetch()}
              reintentando={consulta.isFetching}
            />
          ) : (
            <>
              <View style={estilos.nombreFila}>
                <Text accessibilityRole="header" numberOfLines={2} style={[estilos.nombre, { color: paleta.ink }]}>
                  {mascota.nombre}
                </Text>
                <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
              </View>

              {errorCompartir !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger, fontSize: 14 }}>{errorCompartir}</Text>}

              <DatosMascota datos={datosMascota(mascota)} fondo={paleta.surface200} />

              <Seccion titulo={`Conoce a ${mascota.nombre}`}>
                <Text style={[estilos.parrafo, { color: mascota.descripcion ? paleta.ink : paleta.inkMuted }]}>
                  {mascota.descripcion?.trim() || 'El refugio todavía no agregó una descripción.'}
                </Text>
              </Seccion>

              <Seccion titulo="Salud y cuidados">
                {!usuario ? (
                  <Text style={[estilos.parrafo, { color: paleta.inkMuted }]}>
                    <Text accessibilityRole="link" onPress={() => router.push('/login')} style={{ color: paleta.brandStrong, fontWeight: '600', textDecorationLine: 'underline' }}>
                      Inicia sesión
                    </Text>{' '}para ver sus vacunas y atenciones.
                  </Text>
                ) : clinica.isPending ? (
                  <EstadoCargando compacto mensaje="Cargando el historial…" />
                ) : clinica.isError ? (
                  <>
                    <Text style={{ color: paleta.inkMuted }}>No pudimos cargar el historial.</Text>
                    <Boton titulo="Reintentar" variante="secundario" alPresionar={() => void clinica.refetch()} />
                  </>
                ) : !clinica.data.items.length ? (
                  <Text style={[estilos.parrafo, { color: paleta.inkMuted }]}>El refugio todavía no ha cargado atenciones.</Text>
                ) : (
                  <View style={[estilos.caja, { backgroundColor: paleta.surface200 }]}>
                    {clinica.data.items.map((registro) => {
                      const Icono = ICONOS_CLINICOS[registro.tipo] ?? Stethoscope;
                      return (
                        <View key={registro.id} style={[estilos.fila, { alignItems: 'flex-start' }]}>
                          <IconoCirculo icono={Icono} />
                          <View style={{ flex: 1 }}>
                            <Text style={[estilos.filaTitulo, { color: paleta.ink }]}>{ETIQUETA_TIPO_REGISTRO_CLINICO[registro.tipo]}</Text>
                            <Text style={[estilos.filaTexto, { color: paleta.inkMuted }]}>{formatearFecha(registro.fecha)}</Text>
                            {registro.descripcion && <Text style={[estilos.filaTexto, { color: paleta.ink }]}>{registro.descripcion}</Text>}
                          </View>
                        </View>
                      );
                    })}
                    {clinica.data.total > clinica.data.items.length && (
                      <Text style={[estilos.filaTexto, { color: paleta.inkMuted }]}>
                        Mostramos las {clinica.data.items.length} atenciones más recientes de {clinica.data.total}.
                      </Text>
                    )}
                  </View>
                )}
              </Seccion>

              <HistoriaMascota mascotaId={mascotaId} />

              <BotonDenunciar tipo={TipoContenido.Mascota} id={mascotaId} que="esta publicación" />

              {disponible && favoritos.disponible && (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Apadrinar a ${mascota.nombre}`}
                  onPress={() => router.push(`/apadrinar/${mascotaId}`)}
                  style={({ pressed }) => [estilos.caja, estilos.fila, { backgroundColor: pressed ? paleta.surface300 : paleta.surface200 }]}
                >
                  <IconoCirculo icono={HeartHandshake} />
                  <View style={{ flex: 1 }}>
                    <Text style={[estilos.filaTitulo, { color: paleta.ink }]}>¿No puedes adoptar? Apadrínal{mascota.sexo === Sexo.Macho ? 'o' : 'a'}</Text>
                    <Text style={[estilos.filaTexto, { color: paleta.inkMuted }]}>Apoya su cuidado mientras encuentra familia</Text>
                  </View>
                  <ChevronRight size={18} color={paleta.inkMuted} />
                </Pressable>
              )}

              <Seccion titulo="Su refugio">
                {mascota.refugioId !== undefined ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Conocer ${mascota.refugioNombre} y sus requisitos`}
                    onPress={() => router.push(`/refugio/${mascota.refugioId}`)}
                    style={({ pressed }) => [estilos.caja, estilos.fila, { backgroundColor: pressed ? paleta.surface300 : paleta.surface200 }]}
                  >
                    <IconoCirculo icono={HouseHeart} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={[estilos.filaTitulo, { color: paleta.ink }]}>{mascota.refugioNombre}</Text>
                      <Text style={[estilos.filaTexto, { color: paleta.inkMuted }]}>Conocer el refugio y sus requisitos</Text>
                    </View>
                    <ChevronRight size={18} color={paleta.inkMuted} />
                  </Pressable>
                ) : (
                  <View style={[estilos.caja, estilos.fila, { backgroundColor: paleta.surface200 }]}>
                    <IconoCirculo icono={HouseHeart} />
                    <View style={{ flex: 1 }}>
                      <Text style={[estilos.filaTitulo, { color: paleta.ink }]}>{mascota.refugioNombre}</Text>
                      {mascota.refugioTelefono && (
                        <View style={estilos.telefono}>
                          <Phone size={13} color={paleta.inkMuted} />
                          <Text selectable style={[estilos.filaTexto, { color: paleta.inkMuted, marginTop: 0 }]}>{mascota.refugioTelefono}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}
              </Seccion>
            </>
          )}
        </View>
      </ScrollView>

      {/* Accion fija abajo: siempre a la vista, como en las tiendas. */}
      {mascota && (
        <View style={[estilos.pie, { paddingBottom: margenes.bottom + espaciado.s3, backgroundColor: paleta.surface100, borderTopColor: paleta.border }]}>
          {!disponible ? (
            <View style={estilos.noDisponible}>
              <HeartHandshake size={18} strokeWidth={1.75} color={paleta.inkMuted} />
              <Text style={[estilos.filaTexto, { color: paleta.inkMuted, marginTop: 0, flex: 1 }]}>
                {mascota.nombre} no está recibiendo postulaciones en este momento.
              </Text>
            </View>
          ) : usuario ? (
            <Boton titulo="Postularme para adoptar" alPresionar={() => router.push(`/postular/${mascotaId}`)} />
          ) : (
            <>
              <Boton titulo="Crear cuenta para postularme" alPresionar={() => router.push('/registro')} />
              <Text style={[estilos.yaTengo, { color: paleta.inkMuted }]}>
                ¿Ya tienes cuenta?{' '}
                <Text accessibilityRole="link" onPress={() => router.push('/login')} style={{ color: paleta.brandStrong, fontWeight: '600', textDecorationLine: 'underline' }}>
                  Inicia sesión
                </Text>
              </Text>
            </>
          )}
        </View>
      )}
    </View>
  );
}

function Seccion({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  const paleta = usarPaleta();
  return (
    <View style={estilos.seccion}>
      <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>{titulo}</Text>
      {children}
    </View>
  );
}

function IconoCirculo({ icono: Icono }: { icono: LucideIcon }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.iconoCirculo, { backgroundColor: paleta.brandTint }]}>
      <Icono size={18} strokeWidth={1.75} color={paleta.brandStrong} />
    </View>
  );
}

/**
 * Foto de la galeria. Se ve completa (contain) para no cortarle la cabeza
 * a la mascota, y detras va la misma foto ampliada y difuminada llenando
 * el ancho: asi una foto vertical no queda como una franja con bandas
 * oscuras a los lados.
 */
function FotoPublica({ uri, nombre, ancho, alto }: { uri: string; nombre: string; ancho: number; alto: number }) {
  const [fallo, setFallo] = useState(false);
  const paleta = usarPaleta();
  if (fallo) {
    return (
      <View style={[estilos.sinFoto, { width: ancho, height: alto }]}>
        <ImageIcon size={27} color={paleta.inkMuted} />
        <Text style={{ color: paleta.inkMuted }}>No pudimos cargar esta foto.</Text>
      </View>
    );
  }
  return (
    <View style={{ width: ancho, height: alto, overflow: 'hidden', backgroundColor: paleta.surface200 }}>
      <Image
        source={{ uri }}
        blurRadius={28}
        resizeMode="cover"
        style={[StyleSheet.absoluteFill, { opacity: 0.7, transform: [{ scale: 1.15 }] }]}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      />
      <View style={[StyleSheet.absoluteFill, { backgroundColor: paleta.surface100, opacity: 0.25 }]} />
      <Image source={{ uri }} accessibilityLabel={nombre} onError={() => setFallo(true)} resizeMode="contain" style={{ width: ancho, height: alto }} />
    </View>
  );
}

const estilos = StyleSheet.create({
  galeria: { borderBottomLeftRadius: radios.lg, borderBottomRightRadius: radios.lg, overflow: 'hidden' },
  sinFoto: { alignItems: 'center', justifyContent: 'center', gap: espaciado.s2 },
  volver: {
    position: 'absolute',
    left: espaciado.s4,
    width: 44,
    height: 44,
    borderRadius: radios.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accionesFoto: { position: 'absolute', right: espaciado.s4, flexDirection: 'row', gap: espaciado.s2 },
  botonRedondo: { width: 44, height: 44, borderRadius: radios.pill, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  puntos: { position: 'absolute', bottom: espaciado.s3, alignSelf: 'center', flexDirection: 'row', gap: 6 },
  punto: { height: 6, borderRadius: 3 },
  contenido: { padding: espaciado.s4, gap: espaciado.s5 },
  nombreFila: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: espaciado.s2 },
  nombre: { fontSize: 28, fontWeight: '700', letterSpacing: -0.5, flexShrink: 1 },
  seccion: { gap: espaciado.s3 },
  titulo: { fontSize: 17, fontWeight: '600' },
  parrafo: { fontSize: 15, lineHeight: 23 },
  caja: { padding: espaciado.s3, borderRadius: radios.md, gap: espaciado.s3 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  filaTitulo: { fontSize: 15, fontWeight: '600' },
  filaTexto: { fontSize: 13, marginTop: 2 },
  iconoCirculo: { width: 40, height: 40, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  telefono: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  pie: { paddingHorizontal: espaciado.s4, paddingTop: espaciado.s3, gap: espaciado.s2, borderTopWidth: 1 },
  noDisponible: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, minHeight: 48 },
  yaTengo: { fontSize: 14, textAlign: 'center' },
});
