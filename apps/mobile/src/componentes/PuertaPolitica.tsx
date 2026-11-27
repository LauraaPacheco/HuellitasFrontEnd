import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck } from 'lucide-react-native';
import { ErrorHttp } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { Boton } from '@/componentes/Boton';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * HU-ADM-03: si se publicó una política nueva, el login lo avisa y la app
 * no se puede seguir usando hasta aceptarla (o cerrar sesión).
 */
export function PuertaPolitica() {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const { usuario, aceptarPolitica, cerrarSesion } = useSesion();
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');
  const pendiente = usuario?.politicaPendiente ?? null;
  const politica = useQuery({ queryKey: ['politica', 'activa'], queryFn: () => api.administracion.politicaActiva(), enabled: !!pendiente, retry: false });
  if (!pendiente) return null;

  async function aceptar() {
    setEnviando(true); setError('');
    try { await aceptarPolitica(); }
    catch (e) { setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos registrar tu aceptación. Inténtalo de nuevo.'); }
    finally { setEnviando(false); }
  }

  return (
    // Android: el botón atrás cierra la sesión en vez de saltarse el aviso.
    <Modal visible animationType="slide" onRequestClose={() => void cerrarSesion()}>
      <View style={[estilos.pantalla, { backgroundColor: paleta.surface100, paddingTop: margenes.top + espaciado.s4, paddingBottom: margenes.bottom + espaciado.s4 }]}>
        <View style={[estilos.icono, { backgroundColor: paleta.brandTint }]}>
          <ShieldCheck size={26} strokeWidth={1.75} color={paleta.brandStrong} />
        </View>
        <Text accessibilityRole="header" style={[estilos.titulo, { color: paleta.ink }]}>Actualizamos la política de datos</Text>
        <Text style={{ color: paleta.inkMuted, lineHeight: 21 }}>
          Para seguir usando Huellitas, lee y acepta la nueva versión{pendiente.version ? ` (${pendiente.version})` : ''}.
        </Text>
        <ScrollView style={[estilos.texto, { backgroundColor: paleta.surface200 }]} contentContainerStyle={{ padding: espaciado.s4 }}>
          <Text style={{ color: paleta.ink, lineHeight: 22 }}>
            {politica.isPending ? 'Cargando la política…' : politica.data?.contenido ?? 'No pudimos cargar el texto de la política.'}
          </Text>
        </ScrollView>
        {error !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
        <Boton titulo="Acepto la política" cargando={enviando} deshabilitado={politica.isPending} alPresionar={() => void aceptar()} />
        <Boton titulo="Cerrar sesión" variante="secundario" deshabilitado={enviando} alPresionar={() => void cerrarSesion()} />
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  pantalla: { flex: 1, paddingHorizontal: espaciado.s5, gap: espaciado.s3 },
  icono: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  titulo: { fontSize: 22, fontWeight: '700' },
  texto: { flex: 1, borderRadius: radios.md },
});
