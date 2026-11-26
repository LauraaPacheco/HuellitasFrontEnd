import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { CircleCheck, Flag, X } from 'lucide-react-native';
import { ErrorHttp, ETIQUETA_MOTIVO_DENUNCIA, ETIQUETA_TIPO_CONTENIDO, MotivoDenuncia, TipoContenido } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { espaciado, radios, usarPaleta } from '@/temas';

const MOTIVOS = [MotivoDenuncia.PosibleEstafa, MotivoDenuncia.InformacionFalsa, MotivoDenuncia.ContenidoInapropiado, MotivoDenuncia.Otro];

interface Props {
  readonly tipo: TipoContenido;
  readonly id: number;
  /** "esta mascota", "este refugio"… para el texto del enlace. */
  readonly que: string;
  /** Más discreto (dentro de una tarjeta de opinión). */
  readonly compacto?: boolean;
}

/**
 * HU-ADM-02: denunciar una publicación sospechosa (mascota, refugio u
 * opinión). Pide sesión; la denuncia llega a la bandeja del administrador.
 */
export function BotonDenunciar({ tipo, id, que, compacto = false }: Props) {
  const paleta = usarPaleta();
  const router = useRouter();
  const margenes = useSafeAreaInsets();
  const { usuario } = useSesion();
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState<MotivoDenuncia | null>(null);
  const [descripcion, setDescripcion] = useState('');
  const enviar = useMutation({ mutationFn: () => api.administracion.denunciar({ tipoContenido: tipo, idContenido: id, motivo: motivo!, descripcion }) });

  function cerrar() { setAbierto(false); setMotivo(null); setDescripcion(''); enviar.reset(); }

  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`Denunciar ${que}`} hitSlop={8} onPress={() => setAbierto(true)}
        style={({ pressed }) => [estilos.enlace, compacto && estilos.enlaceCompacto, { opacity: pressed ? 0.6 : 1 }]}>
        <Flag size={compacto ? 13 : 15} strokeWidth={1.9} color={paleta.inkMuted} />
        <Text style={{ color: paleta.inkMuted, fontSize: compacto ? 13 : 14, fontWeight: '600' }}>Denunciar{compacto ? '' : ` ${que}`}</Text>
      </Pressable>

      <Modal visible={abierto} transparent animationType="slide" onRequestClose={cerrar}>
        <Pressable style={estilos.fondo} accessibilityLabel="Cerrar" onPress={cerrar} />
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={estilos.hojaContenedor} pointerEvents="box-none">
          <View style={[estilos.hoja, { backgroundColor: paleta.surface100, paddingBottom: margenes.bottom + espaciado.s4 }]}>
            <View style={estilos.cabecera}>
              <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>Denunciar {que}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Cerrar" hitSlop={8} onPress={cerrar} style={[estilos.cerrar, { backgroundColor: paleta.surface200 }]}>
                <X size={18} strokeWidth={2} color={paleta.inkMuted} />
              </Pressable>
            </View>

            {!usuario ? (
              <>
                <Text style={{ color: paleta.inkMuted, lineHeight: 21 }}>Inicia sesión para denunciar. Así el equipo puede revisar el caso contigo si hace falta.</Text>
                <Boton titulo="Iniciar sesión" alPresionar={() => { cerrar(); router.push('/login'); }} />
              </>
            ) : enviar.isSuccess ? (
              <View style={estilos.listo}>
                <CircleCheck size={36} strokeWidth={1.75} color={paleta.brandStrong} />
                <Text style={[estilos.titulo, { color: paleta.ink, textAlign: 'center' }]}>Gracias por avisarnos</Text>
                <Text style={{ color: paleta.inkMuted, textAlign: 'center', lineHeight: 21 }}>El equipo de Huellitas revisará {que}.</Text>
                <Boton titulo="Listo" alPresionar={cerrar} />
              </View>
            ) : (
              <>
                <Text style={{ color: paleta.inkMuted, lineHeight: 21 }}>¿Qué pasa con {que}? ({ETIQUETA_TIPO_CONTENIDO[tipo]} #{id})</Text>
                <View accessibilityRole="radiogroup" style={estilos.motivos}>
                  {MOTIVOS.map((m) => {
                    const activo = m === motivo;
                    return (
                      <Pressable key={m} accessibilityRole="radio" accessibilityState={{ checked: activo }} onPress={() => setMotivo(m)}
                        style={[estilos.motivo, { borderColor: activo ? paleta.brandStrong : paleta.border, backgroundColor: activo ? paleta.brandTint : paleta.surface200 }]}>
                        <View style={[estilos.radio, { borderColor: activo ? paleta.brandStrong : paleta.inkMuted }]}>
                          {activo && <View style={[estilos.radioPunto, { backgroundColor: paleta.brandStrong }]} />}
                        </View>
                        <Text style={{ color: paleta.ink, fontSize: 15, fontWeight: activo ? '600' : '400' }}>{ETIQUETA_MOTIVO_DENUNCIA[m]}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <TextInput accessibilityLabel="Cuéntanos más (opcional)" value={descripcion} onChangeText={setDescripcion} multiline maxLength={500}
                  placeholder="Cuéntanos más (opcional)" placeholderTextColor={paleta.inkMuted}
                  style={[estilos.area, { borderColor: paleta.border, backgroundColor: paleta.surface200, color: paleta.ink }]} />
                {enviar.isError && (
                  <Text accessibilityRole="alert" style={{ color: paleta.danger }}>
                    {enviar.error instanceof ErrorHttp ? enviar.error.detalle ?? enviar.error.message : 'No pudimos enviar la denuncia.'}
                  </Text>
                )}
                <Boton titulo="Enviar denuncia" cargando={enviar.isPending} deshabilitado={motivo === null} alPresionar={() => enviar.mutate()} />
              </>
            )}
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const estilos = StyleSheet.create({
  enlace: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: espaciado.s2 },
  enlaceCompacto: { alignSelf: 'flex-start', paddingVertical: 2 },
  fondo: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)' },
  hojaContenedor: { flex: 1, justifyContent: 'flex-end' },
  hoja: { borderTopLeftRadius: radios.lg, borderTopRightRadius: radios.lg, padding: espaciado.s5, gap: espaciado.s3 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s2 },
  titulo: { flex: 1, fontSize: 18, fontWeight: '700' },
  cerrar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  motivos: { gap: espaciado.s2 },
  motivo: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3, minHeight: 48, paddingHorizontal: espaciado.s4, borderWidth: 1, borderRadius: radios.md },
  radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioPunto: { width: 10, height: 10, borderRadius: 5 },
  area: { minHeight: 80, maxHeight: 140, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md, fontSize: 15, textAlignVertical: 'top' },
  listo: { alignItems: 'center', gap: espaciado.s2, paddingVertical: espaciado.s2 },
});
