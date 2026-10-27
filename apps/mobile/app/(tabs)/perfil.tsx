import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ESTADO_USUARIO, NivelRol } from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { BotonTema } from '@/componentes/BotonTema';
import { Insignia } from '@/componentes/Insignia';
import { espaciado, radios, usarPaleta } from '@/temas';

export default function PantallaPerfil() {
  const paleta = usarPaleta();
  const router = useRouter();
  const { usuario, cerrarSesion, cargando } = useSesion();

  if (cargando) return <Text style={{ color: paleta.ink, padding: 24 }}>Cargando sesión…</Text>;

  if (!usuario) {
    return <AvisoSesion mensaje="Inicia sesión para ver y editar tu perfil de adoptante." />;
  }

  const completitud = usuario.perfil?.porcentajeCompletitud ?? 0;

  return (
    <ScrollView
      style={{ backgroundColor: paleta.surface100 }}
      contentContainerStyle={estilos.contenido}
    >
      <View style={estilos.encabezado}>
        <Text style={[estilos.nombre, { color: paleta.ink }]}>{usuario.nombre}</Text>
        <Text style={{ color: paleta.inkMuted }}>{usuario.correo}</Text>
        <Insignia estado={ESTADO_USUARIO[usuario.estado]} />
      </View>

      <Boton titulo="Editar datos personales" variante="secundario" alPresionar={() => router.push('/datos-personales')} />

      <Boton titulo="Seguridad de la cuenta" variante="secundario" alPresionar={() => router.push('/seguridad-cuenta')} />

      {usuario.rol.nivel === NivelRol.Adoptante && <View
        style={[
          estilos.tarjeta,
          { borderColor: paleta.border, backgroundColor: paleta.surface200 },
        ]}
      >
        <Text style={[estilos.titulo, { color: paleta.ink }]}>Perfil de adoptante</Text>
        <Text style={{ color: paleta.inkMuted, fontSize: 14, lineHeight: 21 }}>
          {completitud === 100
            ? 'Tu perfil está completo. Los refugios ven estos datos al revisar tu solicitud.'
            : `Llevas ${completitud}% completo. Con el perfil lleno, postularte toma menos pasos.`}
        </Text>
        <Boton
          titulo={completitud === 100 ? 'Editar perfil' : 'Completar perfil'}
          variante="secundario"
          alPresionar={() => router.push('/perfil-adoptante')}
        />
      </View>}

      <View
        style={[
          estilos.tarjeta,
          { borderColor: paleta.border, backgroundColor: paleta.surface200 },
        ]}
      >
        <Text style={[estilos.titulo, { color: paleta.ink }]}>Apariencia</Text>
        <View style={estilos.filaApariencia}>
          <Text style={{ color: paleta.inkMuted, fontSize: 14, flex: 1 }}>
            Elige cómo se ve la app. Se queda así la próxima vez que
            entres.
          </Text>
          <BotonTema conEtiqueta />
        </View>
      </View>

      <Boton
        titulo="Cerrar sesión"
        variante="secundario"
        alPresionar={() => void cerrarSesion()}
      />
    </ScrollView>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, gap: espaciado.s5 },
  encabezado: { gap: espaciado.s2 },
  nombre: { fontSize: 24, fontWeight: '700' },
  tarjeta: { borderWidth: 1, borderRadius: radios.md, padding: espaciado.s4, gap: espaciado.s3 },
  titulo: { fontSize: 17, fontWeight: '700' },
  filaApariencia: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: espaciado.s3,
  },
});
