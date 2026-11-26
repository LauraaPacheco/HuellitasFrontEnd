import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { CircleCheck, Footprints, Hand, HeartPulse, ImagePlus, LocateFixed, Lock, MapPin, PawPrint, Search, ShieldAlert, X, type LucideIcon } from 'lucide-react-native';
import { ETIQUETA_TIPO_REPORTE, TipoReporte, ErrorHttp, validarArchivoServidor, type ReporteCreado } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { buscarDirecciones, direccionDe, type ResultadoDireccion } from '@/lib/direccion';
import { useEspacioBarraPestanas } from '@/componentes/BarraPestanas';
import { Boton } from '@/componentes/Boton';
import { Mapa } from '@/componentes/mapa/Mapa';
import { CENTRO_CALI, type ControlMapa, type Coordenada } from '@/componentes/mapa/tipos';
import { espaciado, radios, usarPaleta } from '@/temas';

const TIPOS: readonly { valor: TipoReporte; icono: LucideIcon }[] = [
  { valor: TipoReporte.Herido, icono: HeartPulse },
  { valor: TipoReporte.EnCalle, icono: Footprints },
  { valor: TipoReporte.Maltrato, icono: ShieldAlert },
];
const MINIMO_DESCRIPCION = 10;
const MAX_FOTOS = 3;

function textoError(e: unknown): string {
  if (e instanceof ErrorHttp && e.estadoHttp === 429) return 'Enviaste varios reportes seguidos. Espera un minuto e inténtalo de nuevo.';
  return e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos enviar el reporte. Revisa tu conexión e inténtalo de nuevo.';
}

/**
 * HU-REP-01: reportar un animal en la calle. El mapa ocupa toda la
 * pantalla y el pin queda fijo en el centro: se mueve el mapa hasta donde
 * está el animal (como al pedir un taxi). Al mantener presionado un punto,
 * el mapa se centra ahí y sube la tarjeta para contar qué pasó.
 * No pide sesión: el backend acepta reportes anónimos. Las fotos sí piden
 * sesión; con ella el reporte queda a nombre de la persona y puede retirarlo.
 */
export default function PantallaReportar() {
  const paleta = usarPaleta();
  const espacioBarra = useEspacioBarraPestanas();
  const router = useRouter();
  const { usuario } = useSesion();
  const mapa = useRef<ControlMapa>(null);
  const [centro, setCentro] = useState<Coordenada>(CENTRO_CALI);
  const [direccion, setDireccion] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [tipo, setTipo] = useState<TipoReporte>(TipoReporte.Herido);
  const [descripcion, setDescripcion] = useState('');
  const [referencia, setReferencia] = useState('');
  const [fotos, setFotos] = useState<string[]>([]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFotos, setErrorFotos] = useState('');
  const [enviado, setEnviado] = useState<ReporteCreado | null>(null);
  const [altoTarjeta, setAltoTarjeta] = useState(0);
  // La tarjeta de "¿Qué le pasa al animal?" solo aparece al mantener presionado el mapa.
  const [abierta, setAbierta] = useState(false);
  // Buscador de direcciones: null = la barra muestra la dirección del pin.
  const [consulta, setConsulta] = useState<string | null>(null);
  const [resultados, setResultados] = useState<readonly ResultadoDireccion[] | null>(null);
  const [buscandoLugar, setBuscandoLugar] = useState(false);

  const enviar = useMutation({
    mutationFn: () => api.reportes.crear({
      tipo, descripcion: descripcion.trim(), latitud: centro.latitud, longitud: centro.longitud,
      direccion: direccion ?? undefined, puntoReferencia: referencia, fotosUrls: fotos,
    }),
    onSuccess: (reporte) => { setEnviado(reporte); setDescripcion(''); setReferencia(''); setFotos([]); },
  });
  // Quien reportó con sesión puede retirarlo mientras ningún refugio lo tome.
  const retirar = useMutation({
    mutationFn: (id: number) => api.reportes.eliminar(id, 'Retirado por quien lo reportó'),
    onSuccess: () => cerrarTarjeta(),
  });

  async function agregarFotos() {
    setErrorFotos('');
    const resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: MAX_FOTOS - fotos.length, quality: 0.8 });
    if (resultado.canceled) return;
    setSubiendo(true);
    try {
      const nuevas: string[] = [];
      for (const activo of resultado.assets) {
        const nombre = activo.fileName ?? `reporte-${Date.now()}.jpg`;
        const problema = validarArchivoServidor(nombre, activo.fileSize ?? 1, true);
        if (problema) { setErrorFotos(`${nombre}: ${problema}`); continue; }
        const form = new FormData();
        form.append('tipo', 'reportes');
        if (Platform.OS === 'web' && activo.file) form.append('archivo', activo.file);
        else form.append('archivo', { uri: activo.uri, name: nombre, type: activo.mimeType ?? 'image/jpeg' } as unknown as Blob);
        nuevas.push(await api.archivos.subir(form));
      }
      setFotos((f) => [...f, ...nuevas].slice(0, MAX_FOTOS));
    } catch (e) {
      setErrorFotos(e instanceof ErrorHttp && e.estadoHttp === 401
        ? 'Tu sesión expiró. Inicia sesión de nuevo para subir fotos, o envía el reporte sin ellas.'
        : e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos subir las fotos.');
    } finally {
      setSubiendo(false);
    }
  }

  // Al entrar, el mapa se ubica donde está la persona (si da permiso).
  useEffect(() => { void irAMiUbicacion(); }, []);

  // La dirección se pide cuando el mapa se queda quieto, no en cada
  // movimiento (Nominatim admite una consulta por segundo).
  useEffect(() => {
    let vigente = true;
    setBuscando(true);
    const espera = setTimeout(async () => {
      const texto = await direccionDe(centro);
      if (vigente) { setDireccion(texto); setBuscando(false); }
    }, Platform.OS === 'web' ? 1100 : 600);
    return () => { vigente = false; clearTimeout(espera); };
  }, [centro]);

  /** Ignora los "movimientos" sin desplazamiento real (el mapa cambia de alto), para no volver a pedir la dirección. */
  function moverCentro(c: Coordenada) {
    setCentro((previo) => (Math.abs(previo.latitud - c.latitud) < 1e-6 && Math.abs(previo.longitud - c.longitud) < 1e-6 ? previo : c));
  }

  async function irAMiUbicacion() {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const { coords } = await Location.getCurrentPositionAsync({});
      const aqui = { latitud: coords.latitude, longitud: coords.longitude };
      mapa.current?.centrarEn(aqui);
      setCentro(aqui);
    } catch {
      // Sin ubicación se queda en Cali y la persona mueve el mapa a mano.
    }
  }

  function reportarAqui(punto?: Coordenada) {
    if (punto) { mapa.current?.centrarEn(punto); setCentro(punto); }
    setAbierta(true);
  }

  async function buscar() {
    const texto = consulta?.trim() ?? '';
    if (texto.length < 3 || buscandoLugar) return;
    setBuscandoLugar(true);
    const encontrados = await buscarDirecciones(texto);
    setResultados(encontrados);
    setBuscandoLugar(false);
  }

  function elegirLugar(lugar: ResultadoDireccion) {
    Keyboard.dismiss();
    cerrarBuscador();
    setDireccion(lugar.etiqueta);
    reportarAqui(lugar.coordenada);
  }

  function cerrarBuscador() {
    setConsulta(null);
    setResultados(null);
    setBuscandoLugar(false);
  }

  function cerrarTarjeta() {
    setAbierta(false);
    setEnviado(null);
    enviar.reset();
    retirar.reset();
  }

  const listo = descripcion.trim().length >= MINIMO_DESCRIPCION;
  const sombra = { shadowColor: '#000', shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 6 };

  return (
    <View style={{ flex: 1, backgroundColor: paleta.surface200 }}>
      {/* El mapa termina donde empieza la tarjeta: así el pin queda en el
          centro de lo que se ve y los créditos del mapa no quedan tapados. */}
      <View style={[estilos.zonaMapa, { bottom: abierta ? altoTarjeta + espacioBarra - espaciado.s2 : 0 }]}>
        <Mapa ref={mapa} inicial={CENTRO_CALI} alMover={moverCentro} alMantener={reportarAqui} margenCreditos={abierta ? 0 : espacioBarra + 62} />

      {/* Pin fijo en el centro: la punta marca el punto exacto. */}
      <View pointerEvents="none" style={estilos.centro}>
        <View style={[estilos.halo, { backgroundColor: paleta.brand, borderColor: paleta.brandStrong }]} />
        <View style={[estilos.pin, sombra]}>
          <View style={[estilos.pinCabeza, { backgroundColor: paleta.brandStrong, borderColor: paleta.surface100 }]}>
            <PawPrint size={22} strokeWidth={2} color={paleta.onBrand} />
          </View>
          <View style={[estilos.pinPunta, { borderTopColor: paleta.brandStrong }]} />
        </View>
        <View style={[estilos.puntoExacto, { backgroundColor: paleta.brandStrong, borderColor: paleta.surface100 }]} />
      </View>
      </View>

      {/* Arriba: la dirección del pin. Al tocarla se vuelve un buscador. */}
      <View style={estilos.arriba} pointerEvents="box-none">
        <View style={estilos.fila} pointerEvents="box-none">
          {consulta === null ? (
            <Pressable
              accessibilityRole="search"
              accessibilityLabel={`Ubicación del reporte: ${direccion ?? 'mueve el mapa hasta el animal'}. Toca para buscar una dirección`}
              onPress={() => { setConsulta(''); setResultados(null); }}
              style={({ pressed }) => [estilos.direccion, sombra, { backgroundColor: paleta.surface100, opacity: pressed ? 0.9 : 1 }]}
            >
              <MapPin size={18} strokeWidth={1.9} color={paleta.brandStrong} />
              <Text numberOfLines={1} style={[estilos.direccionTexto, { color: direccion && !buscando ? paleta.ink : paleta.inkMuted }]}>
                {buscando ? 'Buscando la dirección…' : direccion ?? 'Mueve el mapa hasta el animal'}
              </Text>
              <Search size={18} strokeWidth={1.9} color={paleta.inkMuted} />
            </Pressable>
          ) : (
            <View style={[estilos.direccion, sombra, { backgroundColor: paleta.surface100 }]}>
              <Search size={18} strokeWidth={1.9} color={paleta.brandStrong} />
              <TextInput
                autoFocus
                accessibilityLabel="Buscar una dirección en Cali"
                value={consulta}
                onChangeText={(t) => { setConsulta(t); setResultados(null); }}
                onSubmitEditing={() => void buscar()}
                returnKeyType="search"
                autoCorrect={false}
                placeholder="Calle 5 # 38-20 o un lugar"
                placeholderTextColor={paleta.inkMuted}
                style={[estilos.direccionTexto, estilos.entrada, { color: paleta.ink }]}
              />
              {buscandoLugar ? <ActivityIndicator size="small" color={paleta.brandStrong} /> : (
                <Pressable accessibilityRole="button" accessibilityLabel="Cerrar el buscador" hitSlop={10} onPress={() => { Keyboard.dismiss(); cerrarBuscador(); }}>
                  <X size={18} strokeWidth={2} color={paleta.inkMuted} />
                </Pressable>
              )}
            </View>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ir a mi ubicación"
            onPress={() => { cerrarBuscador(); void irAMiUbicacion(); }}
            style={({ pressed }) => [estilos.redondo, sombra, { backgroundColor: paleta.surface100, opacity: pressed ? 0.8 : 1 }]}
          >
            <LocateFixed size={20} strokeWidth={1.9} color={paleta.ink} />
          </Pressable>
        </View>

        {consulta !== null && (resultados !== null || (consulta.trim().length >= 3 && !buscandoLugar)) && (
          <View style={[estilos.resultados, sombra, { backgroundColor: paleta.surface100 }]}>
            {resultados === null ? (
              <Pressable accessibilityRole="button" onPress={() => void buscar()} style={estilos.resultado}>
                <Search size={18} strokeWidth={1.9} color={paleta.brandStrong} />
                <Text style={[estilos.resultadoTexto, { color: paleta.ink }]} numberOfLines={1}>Buscar «{consulta.trim()}»</Text>
              </Pressable>
            ) : resultados.length === 0 ? (
              <Text style={[estilos.ayuda, estilos.sinResultados, { color: paleta.inkMuted }]}>
                No encontramos esa dirección en Cali. Prueba con el barrio o un lugar conocido cerca.
              </Text>
            ) : (
              resultados.map((r, i) => (
                <Pressable
                  key={`${r.coordenada.latitud},${r.coordenada.longitud}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Reportar en ${r.etiqueta}`}
                  onPress={() => elegirLugar(r)}
                  style={({ pressed }) => [estilos.resultado, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: paleta.border }, pressed && { backgroundColor: paleta.surface200 }]}
                >
                  <MapPin size={18} strokeWidth={1.9} color={paleta.brandStrong} />
                  <Text style={[estilos.resultadoTexto, { color: paleta.ink }]} numberOfLines={2}>{r.etiqueta}</Text>
                </Pressable>
              ))
            )}
          </View>
        )}
      </View>

      {/* Mapa en pantalla completa: solo una pista de cómo reportar. Tocarla
          también abre la tarjeta (mantener presionado no lo hace un lector de pantalla). */}
      {!abierta && (
        <View style={[estilos.abajo, estilos.pistaZona, { bottom: espacioBarra + espaciado.s2 }]} pointerEvents="box-none">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reportar un animal en el punto del pin"
            accessibilityHint="También puedes mantener presionado el mapa donde está el animal"
            onPress={() => reportarAqui()}
            style={({ pressed }) => [estilos.pista, sombra, { backgroundColor: paleta.surface100, opacity: pressed ? 0.85 : 1 }]}
          >
            <Hand size={18} strokeWidth={1.9} color={paleta.brandStrong} />
            <Text style={[estilos.pistaTexto, { color: paleta.ink }]}>Mantén presionado donde está el animal</Text>
          </Pressable>
        </View>
      )}

      {/* Abajo: qué pasó. Sube con el teclado en iPhone. */}
      {abierta && <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[estilos.abajo, { bottom: espacioBarra - espaciado.s2 }]}
        pointerEvents="box-none"
      >
        <View onLayout={(e) => setAltoTarjeta(e.nativeEvent.layout.height)} style={[estilos.tarjeta, sombra, { backgroundColor: paleta.surface100 }]}>
          {enviado ? (
            <View style={estilos.enviado}>
              <CircleCheck size={36} strokeWidth={1.75} color={paleta.brandStrong} />
              <Text style={[estilos.titulo, { color: paleta.ink, textAlign: 'center' }]}>¡Gracias por tu reporte!</Text>
              <Text style={[estilos.ayuda, { color: paleta.inkMuted, textAlign: 'center' }]}>
                Quedó registrado con el número {enviado.numeroReporte}.
              </Text>
              {retirar.isError && <Text accessibilityRole="alert" style={{ color: paleta.danger, fontSize: 13, textAlign: 'center' }}>{textoError(retirar.error)}</Text>}
              <Boton titulo="Hacer otro reporte" variante="secundario" alPresionar={cerrarTarjeta} />
              {/* Retirar sí pide sesión en el backend: solo quien reportó con su cuenta. */}
              {usuario && (
                <Boton titulo="Me equivoqué, retirar el reporte" variante="peligro" cargando={retirar.isPending} alPresionar={() => retirar.mutate(enviado.id)} />
              )}
            </View>
          ) : (
            <>
              <View style={estilos.cabecera}>
                <Text style={[estilos.titulo, { color: paleta.ink, flex: 1 }]}>¿Qué le pasa al animal?</Text>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar y ver el mapa completo"
                  hitSlop={8}
                  onPress={cerrarTarjeta}
                  style={({ pressed }) => [estilos.cerrar, { backgroundColor: paleta.surface200, opacity: pressed ? 0.7 : 1 }]}
                >
                  <X size={18} strokeWidth={2} color={paleta.inkMuted} />
                </Pressable>
              </View>
              <View style={estilos.chips} accessibilityRole="radiogroup">
                {TIPOS.map(({ valor, icono: Icono }) => {
                  const activo = valor === tipo;
                  return (
                    <Pressable
                      key={valor}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: activo }}
                      onPress={() => setTipo(valor)}
                      style={[estilos.chip, { backgroundColor: activo ? paleta.brandStrong : paleta.surface200, borderColor: activo ? paleta.brandStrong : paleta.border }]}
                    >
                      <Icono size={16} strokeWidth={2} color={activo ? paleta.onBrand : paleta.ink} />
                      <Text style={{ color: activo ? paleta.onBrand : paleta.ink, fontSize: 14, fontWeight: '600' }}>{ETIQUETA_TIPO_REPORTE[valor]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <TextInput
                accessibilityLabel="Descripción del animal"
                value={descripcion}
                onChangeText={setDescripcion}
                multiline
                placeholder="Cómo está, tamaño, color, hace cuánto está ahí"
                placeholderTextColor={paleta.inkMuted}
                style={[estilos.area, { borderColor: paleta.border, backgroundColor: paleta.surface200, color: paleta.ink }]}
              />
              <TextInput
                accessibilityLabel="Punto de referencia (opcional)"
                value={referencia}
                onChangeText={setReferencia}
                maxLength={200}
                placeholder="Punto de referencia (opcional): frente a la tienda…"
                placeholderTextColor={paleta.inkMuted}
                style={[estilos.linea, { borderColor: paleta.border, backgroundColor: paleta.surface200, color: paleta.ink }]}
              />
              {usuario ? (
                <View style={estilos.fotos}>
                  {fotos.map((uri, i) => (
                    <Pressable key={uri} accessibilityRole="button" accessibilityLabel={`Quitar la foto ${i + 1}`} onPress={() => setFotos((f) => f.filter((x) => x !== uri))}>
                      <Image source={{ uri }} style={estilos.foto} />
                      <View style={[estilos.quitar, { backgroundColor: paleta.surface100 }]}><X size={12} strokeWidth={2.5} color={paleta.ink} /></View>
                    </Pressable>
                  ))}
                  {fotos.length < MAX_FOTOS && (
                    <Pressable accessibilityRole="button" accessibilityLabel="Agregar fotos del animal" disabled={subiendo} onPress={() => void agregarFotos()}
                      style={[estilos.foto, estilos.agregar, { borderColor: paleta.border, backgroundColor: paleta.surface200 }]}>
                      {subiendo ? <ActivityIndicator color={paleta.brandStrong} /> : <ImagePlus size={22} strokeWidth={1.75} color={paleta.brandStrong} />}
                    </Pressable>
                  )}
                </View>
              ) : (
                // Sin sesión se puede reportar, pero las fotos quedan bloqueadas.
                <View style={estilos.fotosBloqueadas}>
                  <View accessible accessibilityRole="button" accessibilityState={{ disabled: true }} accessibilityLabel="Agregar fotos, bloqueado: solo con sesión iniciada"
                    style={[estilos.foto, estilos.agregar, { borderColor: paleta.border, backgroundColor: paleta.surface200, opacity: 0.55 }]}>
                    <ImagePlus size={20} strokeWidth={1.75} color={paleta.inkMuted} />
                    <View style={[estilos.candado, { backgroundColor: paleta.surface100, borderColor: paleta.border }]}>
                      <Lock size={11} strokeWidth={2.4} color={paleta.inkMuted} />
                    </View>
                  </View>
                  <Text style={[estilos.ayuda, { color: paleta.inkMuted, flex: 1 }]}>
                    Subir fotos es solo para quien inicia sesión.{' '}
                    <Text accessibilityRole="link" onPress={() => router.push('/login')} style={{ color: paleta.brandStrong, fontWeight: '700' }}>Iniciar sesión</Text>
                  </Text>
                </View>
              )}
              {errorFotos !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger, fontSize: 13 }}>{errorFotos}</Text>}
              {tipo === TipoReporte.Maltrato && (
                <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>
                  Este reporte avisa a los refugios; no reemplaza la denuncia ante las autoridades (Ley 1774 de 2016).
                </Text>
              )}
              {enviar.isError && (
                <Text accessibilityRole="alert" style={{ color: paleta.danger, fontSize: 13 }}>
                  {textoError(enviar.error)}
                </Text>
              )}
              <Boton
                titulo={listo ? 'Enviar reporte' : 'Describe lo que viste para enviar'}
                cargando={enviar.isPending}
                deshabilitado={!listo || subiendo}
                alPresionar={() => enviar.mutate()}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>}
    </View>
  );
}

const estilos = StyleSheet.create({
  zonaMapa: { position: 'absolute', top: 0, left: 0, right: 0 },
  centro: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 96, height: 96, borderRadius: 48, opacity: 0.18, borderWidth: 1 },
  // El pin se sube para que su punta, no su centro, quede sobre el punto.
  pin: { position: 'absolute', alignItems: 'center', transform: [{ translateY: -34 }] },
  pinCabeza: { width: 52, height: 52, borderRadius: 26, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  pinPunta: { width: 0, height: 0, marginTop: -2, borderLeftWidth: 8, borderRightWidth: 8, borderTopWidth: 10, borderLeftColor: 'transparent', borderRightColor: 'transparent' },
  puntoExacto: { position: 'absolute', width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  arriba: { position: 'absolute', top: espaciado.s4, left: espaciado.s4, right: espaciado.s4, gap: espaciado.s2, zIndex: 2 },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  entrada: { paddingVertical: 0, minHeight: 44 },
  resultados: { borderRadius: radios.lg, overflow: 'hidden' },
  resultado: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3, minHeight: 52, paddingHorizontal: espaciado.s4, paddingVertical: espaciado.s2 },
  resultadoTexto: { flex: 1, fontSize: 15, fontWeight: '600' },
  sinResultados: { padding: espaciado.s4 },
  direccion: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, paddingHorizontal: espaciado.s4, borderRadius: radios.pill },
  direccionTexto: { flex: 1, fontSize: 15, fontWeight: '600' },
  redondo: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  abajo: { position: 'absolute', left: espaciado.s3, right: espaciado.s3 },
  tarjeta: { borderRadius: radios.lg, padding: espaciado.s4, gap: espaciado.s3 },
  titulo: { fontSize: 17, fontWeight: '700' },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  cerrar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  pistaZona: { alignItems: 'center' },
  pista: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2, minHeight: 46, paddingHorizontal: espaciado.s4, borderRadius: radios.pill },
  pistaTexto: { fontSize: 14, fontWeight: '600' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s2 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 40, paddingHorizontal: espaciado.s3, borderWidth: 1, borderRadius: radios.pill },
  area: { minHeight: 72, maxHeight: 120, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md, fontSize: 15, textAlignVertical: 'top' },
  ayuda: { fontSize: 13, lineHeight: 19 },
  linea: { minHeight: 44, paddingHorizontal: espaciado.s3, borderWidth: 1, borderRadius: radios.md, fontSize: 15 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: espaciado.s2 },
  foto: { width: 56, height: 56, borderRadius: radios.sm },
  agregar: { borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  fotosBloqueadas: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  candado: { position: 'absolute', right: -5, bottom: -5, width: 20, height: 20, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quitar: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  enviado: { alignItems: 'center', gap: espaciado.s2, paddingVertical: espaciado.s2 },
});
