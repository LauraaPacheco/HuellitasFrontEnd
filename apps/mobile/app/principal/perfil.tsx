import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ChevronRight, CircleCheck, LogOut, Moon, ShieldCheck, Sun, UserRound, type LucideIcon } from 'lucide-react-native';
import { ESTADO_USUARIO, NivelRol, tokens } from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { Insignia } from '@/componentes/Insignia';
import { usarTema } from '@/temas';

export default function PantallaPerfil() {
  const { paleta, tema, alternarTema } = usarTema();
  const router = useRouter();
  const { usuario, cerrarSesion, cargando } = useSesion();
  const [saliendo, setSaliendo] = useState(false);
  const [error, setError] = useState('');
  if (cargando) return <Text style={{ color: paleta.ink, padding: 24 }}>Cargando sesión…</Text>;
  if (!usuario) return <AvisoSesion mensaje="Inicia sesión para ver y editar tu perfil de adoptante." />;
  const completitud = Math.max(0, Math.min(100, usuario.perfil?.porcentajeCompletitud ?? 0));
  const iniciales = usuario.nombre.trim().split(/\s+/).slice(0, 2).map(p => p[0]).join('').toUpperCase();
  async function salir() {
    if (saliendo) return;
    setSaliendo(true); setError('');
    try { await cerrarSesion(); } catch { setError('No pudimos cerrar la sesión. Intenta de nuevo.'); } finally { setSaliendo(false); }
  }
  return <ScrollView style={{ backgroundColor: paleta.surface100 }} contentContainerStyle={estilos.contenido}>
    <View style={estilos.identidad}>
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[estilos.avatar, { backgroundColor: paleta.brandStrong }]}><Text style={{ color: paleta.onBrand, fontSize: 20, fontWeight: '700' }}>{iniciales}</Text></View>
      <View style={estilos.datos}>
        <Text style={[estilos.nombre, { color: paleta.ink }]}>{usuario.nombre}</Text>
        <Text style={{ color: paleta.inkMuted, fontSize: 14 }}>{usuario.correo}</Text>
        <View style={estilos.estado}><Insignia estado={ESTADO_USUARIO[usuario.estado]} /><Text style={{ color: paleta.inkMuted, fontSize: 12 }}>{usuario.rol.nombre}</Text></View>
      </View>
    </View>
    {usuario.rol.nivel === NivelRol.Adoptante && <View style={[estilos.tarjeta, { backgroundColor: paleta.surface200 }]}>
      <Text style={[estilos.titulo, { color: paleta.ink }]}>Perfil de adoptante</Text>
      <Text style={{ color: paleta.inkMuted, fontSize: 14, lineHeight: 21 }}>{completitud === 100 ? 'Los refugios podrán conocer tu hogar y tu experiencia.' : 'Cuéntanos sobre tu hogar para preparar tu próxima postulación.'}</Text>
      <View accessibilityRole="progressbar" accessibilityLabel="Completitud del perfil" accessibilityValue={{ min: 0, max: 100, now: completitud }} style={[estilos.pista, { backgroundColor: paleta.surface300 }]}><View style={{ width: `${completitud}%`, height: 5, backgroundColor: paleta.brandStrong, borderRadius: 4 }} /></View>
      <View style={estilos.estado}>{completitud === 100 && <CircleCheck size={16} color={paleta.brandStrong} />}<Text style={{ color: paleta.inkMuted, fontSize: 13 }}>{completitud}% completo</Text></View>
      <Boton titulo={completitud === 100 ? 'Ver mi perfil de adoptante' : 'Completar mi perfil'} alPresionar={() => router.push('/perfil-adoptante')} />
    </View>}
    <View><Text style={[estilos.seccion, { color: paleta.inkMuted }]}>CUENTA</Text><View style={[estilos.grupo, { backgroundColor: paleta.surface200 }]}>
      <Fila icono={UserRound} titulo="Datos personales" detalle="Nombre y teléfono" alPresionar={() => router.push('/datos-personales')} borde />
      <Fila icono={ShieldCheck} titulo="Seguridad" detalle="Contraseña, correo y cuenta" alPresionar={() => router.push('/seguridad-cuenta')} />
    </View></View>
    <View><Text style={[estilos.seccion, { color: paleta.inkMuted }]}>PREFERENCIAS</Text><View style={[estilos.grupo, { backgroundColor: paleta.surface200 }]}><Fila icono={tema === 'oscuro' ? Moon : Sun} titulo="Apariencia" valor={tokens.nombreTema(tema)} alPresionar={alternarTema} /></View></View>
    <View style={[estilos.grupo, { backgroundColor: paleta.surface200 }]}><Fila icono={LogOut} titulo={saliendo ? 'Cerrando sesión…' : 'Cerrar sesión'} alPresionar={() => void salir()} deshabilitado={saliendo} /></View>
    {error !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
  </ScrollView>;
}
function Fila({ icono: Icono, titulo, detalle, valor, borde, alPresionar, deshabilitado = false }: { icono: LucideIcon; titulo: string; detalle?: string; valor?: string; borde?: boolean; alPresionar: () => void; deshabilitado?: boolean }) {
  const { paleta } = usarTema();
  return <Pressable accessibilityRole="button" accessibilityLabel={valor ? `${titulo}: ${valor}` : titulo} accessibilityState={{ disabled: deshabilitado }} disabled={deshabilitado} onPress={alPresionar} style={({ pressed }) => [estilos.fila, { borderBottomWidth: borde ? 1 : 0, borderBottomColor: paleta.border, backgroundColor: pressed ? paleta.surface300 : 'transparent', opacity: deshabilitado ? 0.6 : 1 }]}>
    <Icono size={21} strokeWidth={1.8} color={paleta.brandStrong} />
    <View style={estilos.datos}><Text style={{ color: paleta.ink, fontSize: 15, fontWeight: '500' }}>{titulo}</Text>{detalle && <Text style={{ color: paleta.inkMuted, fontSize: 12, marginTop: 4 }}>{detalle}</Text>}</View>
    {valor && <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>{valor}</Text>}<ChevronRight size={17} color={paleta.inkMuted} />
  </Pressable>;
}
const estilos = StyleSheet.create({
  contenido: { padding: 20, paddingBottom: 32, gap: 24 }, identidad: { flexDirection: 'row', alignItems: 'center', gap: 14 }, avatar: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }, datos: { flex: 1, minWidth: 0 }, nombre: { fontSize: 20, fontWeight: '700', marginBottom: 5 }, estado: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 8 }, tarjeta: { borderRadius: 20, padding: 20, gap: 12 }, titulo: { fontSize: 18, fontWeight: '700' }, pista: { height: 5, borderRadius: 4, overflow: 'hidden', marginTop: 3 }, seccion: { fontSize: 12, fontWeight: '600', marginBottom: 10, letterSpacing: 1 }, grupo: { borderRadius: 18, paddingHorizontal: 16, overflow: 'hidden' }, fila: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 17, minHeight: 58 },
});
