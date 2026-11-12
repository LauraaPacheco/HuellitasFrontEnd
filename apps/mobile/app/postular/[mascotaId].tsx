import { useRef, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, Check, CircleAlert, Hash, ListChecks, MessageCircle, PawPrint, SearchCheck, type LucideIcon } from 'lucide-react-native';
import { ErrorHttp, EstadoMascota, EstadoUsuario, NivelRol, formatearFecha, type ConfirmacionPostulacion } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { Casilla } from '@/componentes/Casilla';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * Postularse para adoptar.
 *
 * Arriba la mascota, luego lo que hace falta (cuenta activa y perfil
 * completo) como una lista que se va marcando, y el formulario. El envio
 * queda fijo abajo. Al enviar, la pantalla cambia a la confirmacion con el
 * codigo y lo que sigue.
 */
export default function PantallaPostulacion() {
  const { mascotaId: parametro } = useLocalSearchParams<{ mascotaId: string }>();
  const mascotaId = Number(parametro);
  const router = useRouter();
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const cache = useQueryClient();
  const { usuario } = useSesion();
  const [motivacion, setMotivacion] = useState('');
  const [acepta, setAcepta] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const [confirmacion, setConfirmacion] = useState<ConfirmacionPostulacion>();
  const ocupado = useRef(false);
  const valido = Number.isSafeInteger(mascotaId) && mascotaId > 0;
  const ficha = useQuery({ queryKey: ['mascota', mascotaId], queryFn: () => api.mascotas.obtenerFicha(mascotaId), enabled: valido, retry: false });
  const perfil = useQuery({
    queryKey: ['perfil-postulacion', usuario?.id],
    queryFn: () => api.usuarios.yo(usuario!),
    enabled: usuario?.rol.nivel === NivelRol.Adoptante,
    retry: false,
  });
  const cuenta = perfil.data;
  const mascota = ficha.data;
  const disponible = mascota?.estado === EstadoMascota.Disponible || mascota?.estado === EstadoMascota.EnProceso;
  const cuentaActiva = cuenta?.estado === EstadoUsuario.Activo;
  const completitud = cuenta?.perfil?.porcentajeCompletitud ?? 0;
  const perfilCompleto = completitud === 100;
  const habilitado = !!cuenta && cuentaActiva && perfilCompleto && disponible;

  async function enviar() {
    if (ocupado.current || confirmacion || !habilitado) return;
    if (!motivacion.trim() || !acepta) {
      setError('Cuéntanos por qué quieres adoptar y acepta el compromiso.');
      return;
    }
    ocupado.current = true;
    setEnviando(true);
    setError('');
    try {
      const resultado = await api.adopcion.postular({ mascotaId, respuestasFormulario: { motivacion: motivacion.trim() }, aceptaCompromisos: acepta });
      setConfirmacion(resultado);
      void cache.invalidateQueries({ queryKey: ['mascota', mascotaId] });
      void cache.invalidateQueries({ queryKey: ['mascotas'] });
      void cache.invalidateQueries({ queryKey: ['mis-solicitudes'] });
    } catch (e) {
      setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos confirmar el envío. Revisa tu conexión antes de reintentar.');
    } finally {
      ocupado.current = false;
      setEnviando(false);
    }
  }

  if (confirmacion) return <SolicitudEnviada confirmacion={confirmacion} foto={mascota?.fotos[0]} />;
  if (!usuario) return <AvisoSesion titulo="Postúlate para adoptar" mensaje="Crea tu cuenta para enviar tu solicitud y seguir en qué va." />;
  if (usuario.rol.nivel !== NivelRol.Adoptante) {
    return <EstadoVacio ilustracion="bloqueo" titulo="Solo para adoptantes" descripcion="Solo una cuenta de adoptante puede enviar solicitudes." />;
  }
  if (!valido) return <EstadoVacio ilustracion="confundido" titulo="Esta mascota no existe" descripcion="El enlace de la mascota no es válido." />;
  if (ficha.isPending || perfil.isPending) return <EstadoCargando mensaje="Preparando tu solicitud…" />;
  if (ficha.isError || perfil.isError || !mascota) {
    return (
      <EstadoError
        titulo="No pudimos preparar tu solicitud"
        error={ficha.error ?? perfil.error}
        alReintentar={() => { void ficha.refetch(); void perfil.refetch(); }}
        reintentando={ficha.isFetching || perfil.isFetching}
      />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: paleta.surface100 }}>
      <ScrollView contentContainerStyle={estilos.contenido} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <MascotaResumen nombre={mascota.nombre} foto={mascota.fotos[0]} detalle={mascota.refugioNombre ? `Refugio ${mascota.refugioNombre.replace(/^refugio\s+/i, '')}` : undefined} />

        {!disponible ? (
          <Aviso icono={CircleAlert} texto={`${mascota.nombre} ya no está recibiendo postulaciones.`} />
        ) : (
          <>
            <Seccion titulo="Antes de postularte" icono={ListChecks}>
              <Requisito listo={cuentaActiva} titulo="Cuenta activa" detalle={cuentaActiva ? 'Tu correo está confirmado.' : 'Confirma tu correo para poder postularte.'} />
              <Requisito
                listo={perfilCompleto}
                titulo="Perfil de adoptante completo"
                detalle={perfilCompleto ? 'El refugio verá tu hogar y tu experiencia.' : `Vas en ${completitud} %. Complétalo para continuar.`}
                accion={perfilCompleto ? undefined : <Boton titulo="Completar mi perfil" variante="secundario" alPresionar={() => router.push('/perfil-adoptante')} />}
              />
            </Seccion>

            {habilitado && (
              <Seccion titulo="Tu solicitud" icono={MessageCircle}>
                <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>El refugio revisará tu perfil y esta información antes de decidir.</Text>
                <Campo
                  etiqueta={`¿Por qué quieres adoptar a ${mascota.nombre}?`}
                  multilinea
                  valor={motivacion}
                  marcador="Cuéntale al refugio sobre ti y por qué crees que serían buena compañía"
                  alCambiar={setMotivacion}
                  deshabilitado={enviando}
                />
                <Casilla
                  marcada={acepta}
                  alCambiar={setAcepta}
                  deshabilitado={enviando}
                  texto="Me comprometo al cuidado responsable y a conversar con el refugio sobre sus requisitos."
                />
              </Seccion>
            )}
          </>
        )}
      </ScrollView>

      {habilitado && (
        <View style={[estilos.pie, { paddingBottom: margenes.bottom + espaciado.s3, backgroundColor: paleta.surface100, borderTopColor: paleta.border }]}>
          {error !== '' && <Text accessibilityRole="alert" style={[estilos.error, { color: paleta.danger }]}>{error}</Text>}
          <Boton titulo="Enviar solicitud" cargando={enviando} deshabilitado={!acepta || !motivacion.trim()} alPresionar={() => void enviar()} />
        </View>
      )}
    </View>
  );
}

/** Confirmacion: que se envio, el codigo para conservar y lo que sigue. */
function SolicitudEnviada({ confirmacion, foto }: { confirmacion: ConfirmacionPostulacion; foto?: string }) {
  const paleta = usarPaleta();
  const router = useRouter();
  const margenes = useSafeAreaInsets();
  const { solicitud } = confirmacion;

  return (
    <View style={{ flex: 1, backgroundColor: paleta.surface100 }}>
      <ScrollView contentContainerStyle={estilos.contenido}>
        <View style={estilos.exito}>
          <View style={[estilos.exitoIcono, { backgroundColor: paleta.brandTint }]}>
            <Check size={34} strokeWidth={2.5} color={paleta.brandStrong} />
          </View>
          <Text accessibilityRole="header" style={[estilos.exitoTitulo, { color: paleta.ink }]}>¡Solicitud enviada!</Text>
          <Text style={[estilos.exitoTexto, { color: paleta.inkMuted }]}>
            {confirmacion.mensaje || `El refugio ya puede ver tu postulación para adoptar a ${solicitud.mascotaNombre}.`}
          </Text>
        </View>

        <View style={[estilos.caja, { backgroundColor: paleta.surface200 }]}>
          <MascotaResumen nombre={solicitud.mascotaNombre} foto={foto} detalle={`Enviada el ${formatearFecha(solicitud.fechaEnvio)}`} plano />
          <View style={[estilos.codigo, { borderColor: paleta.border, backgroundColor: paleta.surface100 }]}>
            <Hash size={16} strokeWidth={1.75} color={paleta.brandStrong} />
            <View style={{ flex: 1 }}>
              <Text style={[estilos.codigoEtiqueta, { color: paleta.inkMuted }]}>Código de tu solicitud</Text>
              <Text selectable style={[estilos.codigoValor, { color: paleta.ink }]}>{solicitud.codigo}</Text>
            </View>
          </View>
        </View>

        <Seccion titulo="¿Qué sigue?" icono={ListChecks}>
          <Paso numero={1} icono={SearchCheck} titulo="El refugio revisa tu perfil" detalle="Mira tu hogar, tu experiencia y lo que le contaste." />
          <Paso numero={2} icono={CalendarCheck} titulo="Te contacta para conocerse" detalle="Puede proponer una entrevista o una visita." />
          <Paso numero={3} icono={PawPrint} titulo="Sigue el estado en Solicitudes" detalle="Ahí ves cada cambio y adjuntas lo que te pidan." />
        </Seccion>

        <Text style={[estilos.nota, { color: paleta.inkMuted }]}>Enviar la solicitud no significa que la adopción esté aprobada.</Text>
      </ScrollView>

      <View style={[estilos.pie, { paddingBottom: margenes.bottom + espaciado.s3, backgroundColor: paleta.surface100, borderTopColor: paleta.border }]}>
        <Boton titulo="Ver mis solicitudes" alPresionar={() => router.replace('/principal/solicitudes')} />
        <Boton titulo="Seguir viendo mascotas" variante="secundario" alPresionar={() => router.replace('/principal/catalogo')} />
      </View>
    </View>
  );
}

function MascotaResumen({ nombre, foto, detalle, plano = false }: { nombre: string; foto?: string; detalle?: string; plano?: boolean }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.mascota, !plano && { backgroundColor: paleta.surface200, padding: espaciado.s3, borderRadius: radios.lg }]}>
      {foto ? (
        <Image source={{ uri: foto }} style={estilos.mascotaFoto} accessibilityLabel={`Foto de ${nombre}`} />
      ) : (
        <View style={[estilos.mascotaFoto, estilos.centro, { backgroundColor: paleta.brandTint }]}>
          <PawPrint size={24} strokeWidth={1.75} color={paleta.brandStrong} />
        </View>
      )}
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[estilos.mascotaEtiqueta, { color: paleta.inkMuted }]}>{plano ? 'Tu solicitud para' : 'Quieres adoptar a'}</Text>
        <Text numberOfLines={1} style={[estilos.mascotaNombre, { color: paleta.ink }]}>{nombre}</Text>
        {detalle && <Text numberOfLines={1} style={[estilos.mascotaDetalle, { color: paleta.inkMuted }]}>{detalle}</Text>}
      </View>
    </View>
  );
}

function Seccion({ titulo, icono: Icono, children }: { titulo: string; icono: LucideIcon; children: React.ReactNode }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.seccion, { backgroundColor: paleta.surface200, borderColor: paleta.border }]}>
      <View style={estilos.seccionCabecera}>
        <View style={[estilos.circulo, { backgroundColor: paleta.brandTint }]}>
          <Icono size={18} strokeWidth={1.75} color={paleta.brandStrong} />
        </View>
        <Text accessibilityRole="header" style={[estilos.seccionTitulo, { color: paleta.ink }]}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

function Requisito({ listo, titulo, detalle, accion }: { listo: boolean; titulo: string; detalle: string; accion?: React.ReactNode }) {
  const paleta = usarPaleta();
  return (
    <View style={{ gap: espaciado.s2 }}>
      <View style={estilos.fila} accessible accessibilityLabel={`${titulo}: ${listo ? 'listo' : 'pendiente'}. ${detalle}`}>
        <View style={[estilos.marca, listo ? { backgroundColor: paleta.brandStrong } : { borderWidth: 2, borderColor: paleta.inkMuted }]}>
          {listo && <Check size={14} strokeWidth={3} color={paleta.onBrand} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[estilos.filaTitulo, { color: paleta.ink }]}>{titulo}</Text>
          <Text style={[estilos.filaDetalle, { color: paleta.inkMuted }]}>{detalle}</Text>
        </View>
      </View>
      {accion}
    </View>
  );
}

function Paso({ numero, icono: Icono, titulo, detalle }: { numero: number; icono: LucideIcon; titulo: string; detalle: string }) {
  const paleta = usarPaleta();
  return (
    <View style={estilos.fila} accessible accessibilityLabel={`Paso ${numero}: ${titulo}. ${detalle}`}>
      <View style={[estilos.circulo, { backgroundColor: paleta.surface100, borderWidth: 1, borderColor: paleta.border }]}>
        <Icono size={18} strokeWidth={1.75} color={paleta.brandStrong} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[estilos.filaTitulo, { color: paleta.ink }]}>{titulo}</Text>
        <Text style={[estilos.filaDetalle, { color: paleta.inkMuted }]}>{detalle}</Text>
      </View>
    </View>
  );
}

function Aviso({ icono: Icono, texto }: { icono: LucideIcon; texto: string }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.caja, estilos.fila, { backgroundColor: paleta.surface200 }]}>
      <Icono size={20} strokeWidth={1.75} color={paleta.inkMuted} />
      <Text style={[estilos.filaDetalle, { color: paleta.ink, flex: 1, marginTop: 0, fontSize: 15 }]}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, paddingBottom: espaciado.s6, gap: espaciado.s4 },
  centro: { alignItems: 'center', justifyContent: 'center' },
  ayuda: { fontSize: 14, lineHeight: 21 },
  mascota: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  mascotaFoto: { width: 64, height: 64, borderRadius: radios.md },
  mascotaEtiqueta: { fontSize: 12 },
  mascotaNombre: { fontSize: 20, fontWeight: '700' },
  mascotaDetalle: { fontSize: 13, marginTop: 2 },
  seccion: { padding: espaciado.s4, borderRadius: radios.lg, borderWidth: 1, gap: espaciado.s4 },
  seccionCabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  seccionTitulo: { fontSize: 17, fontWeight: '600' },
  circulo: { width: 36, height: 36, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  fila: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  filaTitulo: { fontSize: 15, fontWeight: '600' },
  filaDetalle: { fontSize: 13, lineHeight: 19, marginTop: 2 },
  marca: { width: 24, height: 24, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  caja: { padding: espaciado.s3, borderRadius: radios.md, gap: espaciado.s3 },
  exito: { alignItems: 'center', gap: espaciado.s2, paddingVertical: espaciado.s3 },
  exitoIcono: { width: 72, height: 72, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center', marginBottom: espaciado.s2 },
  exitoTitulo: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  exitoTexto: { fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 340 },
  codigo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md },
  codigoEtiqueta: { fontSize: 12 },
  codigoValor: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  nota: { fontSize: 12, textAlign: 'center' },
  pie: { paddingHorizontal: espaciado.s4, paddingTop: espaciado.s3, gap: espaciado.s2, borderTopWidth: 1 },
  error: { fontSize: 13, fontWeight: '600' },
});
