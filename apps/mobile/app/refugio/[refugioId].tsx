import { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  AtSign,
  BadgeCheck,
  CircleCheck,
  HeartHandshake,
  Mail,
  MapPin,
  Phone,
  Star,
  type LucideIcon,
} from 'lucide-react-native';
import { describirRedesSociales, EstadoVerificacion, TipoContenido } from '@huellitas/shared';
import { api } from '@/lib/api';
import { EstadoCargando } from '@/componentes/EstadoCargando';
import { NecesidadesRefugio, OpinionesRefugio } from '@/componentes/ApoyosRefugio';
import { BotonDenunciar } from '@/componentes/BotonDenunciar';
import { EstadoError } from '@/componentes/EstadoError';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, radios, usarPaleta } from '@/temas';

type Pestana = 'informacion' | 'requisitos' | 'ayudar' | 'opiniones';
const ETIQUETAS: Record<Pestana, string> = { informacion: 'Contacto', requisitos: 'Requisitos', ayudar: 'Ayudar', opiniones: 'Opiniones' };

function iniciales(nombre: string) {
  return nombre
    .trim()
    .split(/\s+/)
    .filter((parte) => !/^(de|del|la|las|los|y)$/i.test(parte))
    .slice(0, 2)
    .map((parte) => parte[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Perfil publico de un refugio.
 *
 * Misma composicion que Mi refugio en la web: iniciales, nombre y la
 * insignia de verificado; luego cifras, contacto y requisitos. El telefono
 * se puede tocar para llamar.
 */
export default function PantallaRefugio() {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const [pestana, setPestana] = useState<Pestana>('informacion');
  const id = Number(useLocalSearchParams<{ refugioId: string }>().refugioId);
  const valido = Number.isSafeInteger(id) && id > 0;
  const consulta = useQuery({
    queryKey: ['perfil-publico-refugio', id],
    queryFn: () => api.refugios.obtener(id),
    enabled: valido,
    retry: false,
  });
  const refugio = consulta.data;

  if (consulta.isPending && valido) return <Fondo><EstadoCargando mensaje="Cargando refugio…" /></Fondo>;
  if (consulta.isError) {
    return (
      <Fondo>
        <EstadoError
          titulo="No pudimos cargar el refugio"
          error={consulta.error}
          alReintentar={() => void consulta.refetch()}
          reintentando={consulta.isFetching}
        />
      </Fondo>
    );
  }
  if (!valido || !refugio || refugio.estadoVerificacion !== EstadoVerificacion.Verificado) {
    return (
      <Fondo>
        <EstadoVacio
          ilustracion="confundido"
          titulo="Perfil no disponible"
          descripcion="El refugio no existe o todavía no está verificado."
        />
      </Fondo>
    );
  }

  const requisitos = refugio.requisitos.filter((r) => r.activo).sort((a, b) => a.orden - b.orden);
  const telefono = refugio.telefono?.replace(/[^\d+]/g, '');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: paleta.surface100 }}
      contentContainerStyle={[estilos.contenido, { paddingBottom: margenes.bottom + espaciado.s6 }]}
    >
      <View style={estilos.cabecera}>
        <View style={[estilos.avatar, { backgroundColor: paleta.brandTint }]}>
          <Text style={[estilos.avatarTexto, { color: paleta.brandStrong }]}>{iniciales(refugio.nombre)}</Text>
        </View>
        <View style={estilos.identidad}>
          <Text accessibilityRole="header" style={[estilos.nombre, { color: paleta.ink }]}>{refugio.nombre}</Text>
          <View style={[estilos.verificado, { backgroundColor: paleta.brandTint }]}>
            <BadgeCheck size={14} strokeWidth={2} color={paleta.brandStrong} />
            <Text style={[estilos.verificadoTexto, { color: paleta.brandStrong }]}>Refugio verificado</Text>
          </View>
        </View>
      </View>

      <Text style={[estilos.parrafo, { color: refugio.descripcion ? paleta.ink : paleta.inkMuted }]}>
        {refugio.descripcion?.trim() || 'El refugio todavía no agregó una descripción.'}
      </Text>

      {/* Cifras que dan confianza antes de postularse. */}
      {(refugio.totalAdopciones !== null || refugio.promedioCalificacion !== null) && <View style={[estilos.cifras, { backgroundColor: paleta.surface200 }]}>
        {refugio.totalAdopciones !== null && <Cifra icono={HeartHandshake} valor={String(refugio.totalAdopciones)} etiqueta={refugio.totalAdopciones === 1 ? 'Adopción entregada' : 'Adopciones entregadas'} />}
        <View style={[estilos.divisor, { backgroundColor: paleta.border }]} />
        <Cifra
          icono={Star}
          valor={refugio.promedioCalificacion === null ? '—' : refugio.promedioCalificacion.toFixed(1)}
          etiqueta={refugio.promedioCalificacion === null ? 'Sin calificaciones' : 'Calificación promedio'}
        />
      </View>}

      <View accessibilityRole="tablist" accessibilityLabel="Información del refugio" style={[estilos.selector, { backgroundColor: paleta.surface200, borderColor: paleta.border }]}>
        {(['informacion', 'requisitos', 'ayudar', 'opiniones'] as const).map((valor) => {
          const activa = pestana === valor;
          return (
            <Pressable
              key={valor}
              accessibilityRole="tab"
              accessibilityState={{ selected: activa }}
              onPress={() => setPestana(valor)}
              style={({ pressed }) => [
                estilos.pestana,
                {
                  borderColor: activa ? paleta.brand : 'transparent',
                  backgroundColor: activa ? paleta.brandTint : 'transparent',
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Text style={[estilos.pestanaTexto, { color: activa ? paleta.brandStrong : paleta.ink, fontWeight: activa ? '600' : '400' }]}>
                {ETIQUETAS[valor]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {pestana === 'ayudar' ? (
        <NecesidadesRefugio refugioId={id} />
      ) : pestana === 'opiniones' ? (
        <OpinionesRefugio refugioId={id} />
      ) : pestana === 'informacion' ? (
        <View style={[estilos.caja, { backgroundColor: paleta.surface200 }]}>
          <Contacto icono={MapPin} etiqueta="Dirección" valor={refugio.direccion} />
          <Contacto
            icono={Phone}
            etiqueta="Teléfono"
            valor={refugio.telefono}
            accion={telefono ? { texto: 'Llamar', abrir: () => void Linking.openURL(`tel:${telefono}`) } : undefined}
          />
          <Contacto icono={Mail} etiqueta="Correo de contacto" valor={refugio.correo} />
          <Contacto icono={AtSign} etiqueta="Redes sociales" valor={describirRedesSociales(refugio.redesSociales) || null} />
        </View>
      ) : (
        <View style={estilos.seccion}>
          <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>Revisa las condiciones antes de enviar tu solicitud.</Text>
          {requisitos.length ? (
            requisitos.map((r) => (
              <View key={r.id} style={[estilos.requisito, { borderColor: paleta.border }]}>
                <CircleCheck size={20} strokeWidth={1.75} color={paleta.brandStrong} />
                <Text style={[estilos.requisitoTexto, { color: paleta.ink }]}>{r.descripcion}</Text>
                <View
                  style={[
                    estilos.tipo,
                    r.esObligatorio
                      ? { backgroundColor: paleta.brandTint, borderColor: 'transparent' }
                      : { backgroundColor: 'transparent', borderColor: paleta.border },
                  ]}
                >
                  <Text style={[estilos.tipoTexto, { color: r.esObligatorio ? paleta.brandStrong : paleta.inkMuted }]}>
                    {r.esObligatorio ? 'Obligatorio' : 'Opcional'}
                  </Text>
                </View>
              </View>
            ))
          ) : (
            <View style={[estilos.caja, { backgroundColor: paleta.surface200 }]}>
              <Text style={[estilos.parrafo, { color: paleta.inkMuted }]}>
                El refugio todavía no publicó sus requisitos. Consulta sus condiciones antes de postularte.
              </Text>
            </View>
          )}
        </View>
      )}
      {/* Fuera de las pestañas: se puede denunciar desde cualquiera. */}
      <BotonDenunciar tipo={TipoContenido.Refugio} id={id} que="este refugio" />
    </ScrollView>
  );
}

function Fondo({ children }: { children: React.ReactNode }) {
  const paleta = usarPaleta();
  return <View style={{ flex: 1, backgroundColor: paleta.surface100, justifyContent: 'center' }}>{children}</View>;
}

function Cifra({ icono: Icono, valor, etiqueta }: { icono: LucideIcon; valor: string; etiqueta: string }) {
  const paleta = usarPaleta();
  return (
    <View style={estilos.cifra} accessible accessibilityLabel={`${valor} ${etiqueta}`}>
      <View style={estilos.cifraFila}>
        <Icono size={18} strokeWidth={1.75} color={paleta.brandStrong} />
        <Text style={[estilos.cifraValor, { color: paleta.ink }]}>{valor}</Text>
      </View>
      <Text style={[estilos.cifraEtiqueta, { color: paleta.inkMuted }]}>{etiqueta}</Text>
    </View>
  );
}

function Contacto({
  icono: Icono,
  etiqueta,
  valor,
  accion,
}: {
  icono: LucideIcon;
  etiqueta: string;
  valor?: string | null;
  accion?: { texto: string; abrir: () => void };
}) {
  const paleta = usarPaleta();
  return (
    <View style={estilos.contacto}>
      <View style={[estilos.iconoCirculo, { backgroundColor: paleta.brandTint }]}>
        <Icono size={18} strokeWidth={1.75} color={paleta.brandStrong} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[estilos.contactoEtiqueta, { color: paleta.inkMuted }]}>{etiqueta}</Text>
        <Text selectable style={[estilos.contactoValor, { color: valor ? paleta.ink : paleta.inkMuted, fontWeight: valor ? '600' : '400' }]}>
          {valor || 'Sin información'}
        </Text>
      </View>
      {accion && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${accion.texto}: ${valor}`}
          onPress={accion.abrir}
          hitSlop={6}
          style={({ pressed }) => [estilos.accion, { borderColor: paleta.border, backgroundColor: pressed ? paleta.surface300 : paleta.surface100 }]}
        >
          <Text style={[estilos.accionTexto, { color: paleta.brandStrong }]}>{accion.texto}</Text>
        </Pressable>
      )}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, gap: espaciado.s5 },
  cabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s4 },
  avatar: { width: 64, height: 64, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  avatarTexto: { fontSize: 22, fontWeight: '700' },
  identidad: { flex: 1, minWidth: 0, gap: espaciado.s2 },
  nombre: { fontSize: 24, lineHeight: 30, fontWeight: '700', letterSpacing: -0.3 },
  verificado: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: radios.pill, paddingVertical: 4, paddingHorizontal: 10 },
  verificadoTexto: { fontSize: 12, fontWeight: '600' },
  parrafo: { fontSize: 15, lineHeight: 23 },
  ayuda: { fontSize: 14, lineHeight: 21 },
  cifras: { flexDirection: 'row', alignItems: 'center', borderRadius: radios.md, paddingVertical: espaciado.s3 },
  cifra: { flex: 1, alignItems: 'center', gap: 4, paddingHorizontal: espaciado.s2 },
  cifraFila: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cifraValor: { fontSize: 20, fontWeight: '700' },
  cifraEtiqueta: { fontSize: 12, textAlign: 'center' },
  divisor: { width: 1, alignSelf: 'stretch' },
  selector: { flexDirection: 'row', gap: espaciado.s1, padding: espaciado.s1, borderWidth: 1, borderRadius: radios.md },
  pestana: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: radios.sm, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 2 },
  pestanaTexto: { fontSize: 13 },
  caja: { padding: espaciado.s3, borderRadius: radios.md, gap: espaciado.s4 },
  seccion: { gap: espaciado.s3 },
  contacto: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  iconoCirculo: { width: 40, height: 40, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  contactoEtiqueta: { fontSize: 12 },
  contactoValor: { fontSize: 15, lineHeight: 21 },
  accion: { minHeight: 36, paddingHorizontal: espaciado.s3, borderWidth: 1, borderRadius: radios.pill, justifyContent: 'center' },
  accionTexto: { fontSize: 13, fontWeight: '600' },
  requisito: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3, padding: espaciado.s3, borderWidth: 1, borderRadius: radios.md },
  requisitoTexto: { flex: 1, fontSize: 14, lineHeight: 21 },
  tipo: { borderWidth: 1, borderRadius: radios.pill, paddingVertical: 2, paddingHorizontal: 8 },
  tipoTexto: { fontSize: 11, fontWeight: '600' },
});
