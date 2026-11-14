import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Building2, Check, Clock, House, Trees, X, type LucideIcon } from 'lucide-react-native';
import {
  ErrorHttp, TipoVivienda, ETIQUETA_TIPO_VIVIENDA, prepararPerfilAdoptante,
  validarPerfilAdoptante, type PerfilAdoptanteFormulario, type Usuario,
} from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { CargarPerfil } from '@/componentes/CargarPerfil';
import { OpcionesPerfil } from '@/componentes/OpcionesPerfil';
import { Campo } from '@/componentes/Campo';
import { Boton } from '@/componentes/Boton';
import { espaciado, radios, usarPaleta } from '@/temas';

const SI_NO = [
  { valor: true, etiqueta: 'Sí', icono: Check },
  { valor: false, etiqueta: 'No', icono: X },
];
const ICONO_VIVIENDA: Record<TipoVivienda, LucideIcon> = {
  [TipoVivienda.Casa]: House,
  [TipoVivienda.Apartamento]: Building2,
  [TipoVivienda.Finca]: Trees,
};
const VIVIENDAS = [TipoVivienda.Casa, TipoVivienda.Apartamento, TipoVivienda.Finca].map((valor) => ({
  valor,
  etiqueta: ETIQUETA_TIPO_VIVIENDA[valor],
  icono: ICONO_VIVIENDA[valor],
}));

/** Cuantas de las seis preguntas ya tienen respuesta. */
function respondidas(d: PerfilAdoptanteFormulario) {
  return [
    d.tipoVivienda !== null,
    d.espacioDisponible.trim() !== '',
    d.presenciaDeNinos !== null,
    d.otrasMascotas !== null,
    d.tiempoDisponible.trim() !== '',
    d.experienciaPrevia !== null,
  ].filter(Boolean).length;
}

export default function PantallaPerfilAdoptante() {
  return <CargarPerfil soloAdoptante>{(usuario) => <FormularioAdoptante usuario={usuario} />}</CargarPerfil>;
}

/**
 * Perfil de adoptante.
 *
 * Seis preguntas en dos tarjetas (hogar y rutina), con el avance a la
 * vista arriba y el boton de guardar fijo abajo.
 */
function FormularioAdoptante({ usuario }: { usuario: Usuario }) {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const router = useRouter();
  const { guardarPerfilAdoptante } = useSesion();
  const [datos, setDatos] = useState<PerfilAdoptanteFormulario>(() => ({
    tipoVivienda: usuario.perfil?.tipoVivienda ?? null,
    espacioDisponible: usuario.perfil?.espacioDisponible ?? '',
    tiempoDisponible: usuario.perfil?.tiempoDisponible ?? '',
    presenciaDeNinos: usuario.perfil?.presenciaDeNinos ?? null,
    otrasMascotas: usuario.perfil?.otrasMascotas ?? null,
    experienciaPrevia: usuario.perfil?.experienciaPrevia ?? null,
  }));
  const [validar, setValidar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errores = validar ? validarPerfilAdoptante(datos) : {};
  const total = 6;
  const listas = respondidas(datos);
  const avance = Math.round((listas / total) * 100);

  function cambiar<K extends keyof PerfilAdoptanteFormulario>(campo: K, valor: PerfilAdoptanteFormulario[K]) {
    setDatos((previo) => ({ ...previo, [campo]: valor }));
  }

  async function guardar() {
    if (guardando) return;
    setValidar(true);
    setError(null);
    if (Object.keys(validarPerfilAdoptante(datos)).length) {
      setError('Revisa las preguntas marcadas en rojo.');
      return;
    }
    setGuardando(true);
    try {
      await guardarPerfilAdoptante(prepararPerfilAdoptante(datos));
      // De vuelta a la pestaña Perfil, que ya muestra el avance nuevo.
      router.replace('/principal/perfil');
    } catch (causa) {
      setError(causa instanceof ErrorHttp ? causa.detalle ?? causa.message : 'No pudimos guardar tu perfil. Inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: paleta.surface100 }}>
      <ScrollView
        contentContainerStyle={estilos.contenido}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
      >
        <View style={estilos.intro}>
          <Text style={[estilos.ayuda, { color: paleta.inkMuted }]}>
            Cuéntanos sobre tu hogar y tu disponibilidad. Los refugios consultan estos datos al revisar tu solicitud.
          </Text>
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Avance del perfil"
            accessibilityValue={{ min: 0, max: total, now: listas }}
            style={[estilos.avance, { backgroundColor: paleta.surface200 }]}
          >
            <View style={estilos.avanceFila}>
              <Text style={[estilos.avanceTexto, { color: paleta.ink }]}>
                {listas === total ? 'Todo respondido' : `${listas} de ${total} respondidas`}
              </Text>
              <Text style={[estilos.avanceTexto, { color: paleta.brandStrong }]}>{avance}%</Text>
            </View>
            <View style={[estilos.pista, { backgroundColor: paleta.surface300 }]}>
              <View style={[estilos.relleno, { width: `${avance}%`, backgroundColor: paleta.brandStrong }]} />
            </View>
          </View>
        </View>

        <Tarjeta titulo="Tu hogar" icono={House}>
          <OpcionesPerfil apiladas etiqueta="Tipo de vivienda" opciones={VIVIENDAS} valor={datos.tipoVivienda}
            alCambiar={(valor) => cambiar('tipoVivienda', valor)} error={errores.tipoVivienda} deshabilitado={guardando} />
          <Campo etiqueta="Espacio disponible" valor={datos.espacioDisponible} multilinea
            marcador="Por ejemplo: apartamento con balcón protegido"
            alCambiar={(valor) => cambiar('espacioDisponible', valor)} error={errores.espacioDisponible} deshabilitado={guardando} />
          <OpcionesPerfil etiqueta="¿Hay niños en tu hogar?" opciones={SI_NO} valor={datos.presenciaDeNinos}
            alCambiar={(valor) => cambiar('presenciaDeNinos', valor)} error={errores.presenciaDeNinos} deshabilitado={guardando} />
        </Tarjeta>

        <Tarjeta titulo="Tu rutina" icono={Clock}>
          <OpcionesPerfil etiqueta="¿Tienes otras mascotas?" opciones={SI_NO} valor={datos.otrasMascotas}
            alCambiar={(valor) => cambiar('otrasMascotas', valor)} error={errores.otrasMascotas} deshabilitado={guardando} />
          <OpcionesPerfil etiqueta="¿Has cuidado mascotas antes?" opciones={SI_NO} valor={datos.experienciaPrevia}
            alCambiar={(valor) => cambiar('experienciaPrevia', valor)} error={errores.experienciaPrevia} deshabilitado={guardando} />
          <Campo etiqueta="Tiempo disponible" valor={datos.tiempoDisponible} multilinea
            marcador="Cuánto tiempo puedes dedicar al cuidado y acompañamiento"
            alCambiar={(valor) => cambiar('tiempoDisponible', valor)} error={errores.tiempoDisponible} deshabilitado={guardando} />
        </Tarjeta>
      </ScrollView>

      {/* Guardar siempre a mano, como la accion de la ficha de la mascota. */}
      <View style={[estilos.pie, { paddingBottom: margenes.bottom + espaciado.s3, backgroundColor: paleta.surface100, borderTopColor: paleta.border }]}>
        {error && <Text accessibilityRole="alert" style={[estilos.mensaje, { color: paleta.danger }]}>{error}</Text>}
        <Boton titulo="Guardar perfil" cargando={guardando} alPresionar={() => void guardar()} />
      </View>
    </View>
  );
}

function Tarjeta({ titulo, icono: Icono, children }: { titulo: string; icono: LucideIcon; children: React.ReactNode }) {
  const paleta = usarPaleta();
  return (
    <View style={[estilos.tarjeta, { backgroundColor: paleta.surface200, borderColor: paleta.border }]}>
      <View style={estilos.tarjetaCabecera}>
        <View style={[estilos.tarjetaIcono, { backgroundColor: paleta.brandTint }]}>
          <Icono size={18} strokeWidth={1.75} color={paleta.brandStrong} />
        </View>
        <Text accessibilityRole="header" style={[estilos.tarjetaTitulo, { color: paleta.ink }]}>{titulo}</Text>
      </View>
      {children}
    </View>
  );
}

const estilos = StyleSheet.create({
  contenido: { padding: espaciado.s4, paddingBottom: espaciado.s6, gap: espaciado.s4 },
  intro: { gap: espaciado.s3 },
  ayuda: { fontSize: 15, lineHeight: 23 },
  avance: { padding: espaciado.s3, borderRadius: radios.md, gap: espaciado.s2 },
  avanceFila: { flexDirection: 'row', justifyContent: 'space-between' },
  avanceTexto: { fontSize: 13, fontWeight: '600' },
  pista: { height: 6, borderRadius: 3, overflow: 'hidden' },
  relleno: { height: 6, borderRadius: 3 },
  tarjeta: { padding: espaciado.s4, borderRadius: radios.lg, borderWidth: 1, gap: espaciado.s4 },
  tarjetaCabecera: { flexDirection: 'row', alignItems: 'center', gap: espaciado.s3 },
  tarjetaIcono: { width: 36, height: 36, borderRadius: radios.pill, alignItems: 'center', justifyContent: 'center' },
  tarjetaTitulo: { fontSize: 17, fontWeight: '600' },
  pie: { paddingHorizontal: espaciado.s4, paddingTop: espaciado.s3, gap: espaciado.s2, borderTopWidth: 1 },
  mensaje: { fontSize: 13, fontWeight: '600' },
});
