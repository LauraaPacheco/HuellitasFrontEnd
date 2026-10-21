import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ErrorHttp, TipoVivienda, ETIQUETA_TIPO_VIVIENDA, prepararPerfilAdoptante,
  validarPerfilAdoptante, type PerfilAdoptanteFormulario, type Usuario,
} from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { CargarPerfil } from '@/componentes/CargarPerfil';
import { OpcionesPerfil } from '@/componentes/OpcionesPerfil';
import { Campo } from '@/componentes/Campo';
import { Boton } from '@/componentes/Boton';
import { espaciado, usarPaleta } from '@/temas';

const SI_NO = [{ valor: true, etiqueta: 'Sí' }, { valor: false, etiqueta: 'No' }];
const VIVIENDAS = [TipoVivienda.Casa, TipoVivienda.Apartamento, TipoVivienda.Finca]
  .map(valor => ({ valor, etiqueta: ETIQUETA_TIPO_VIVIENDA[valor] }));

export default function PantallaPerfilAdoptante() {
  return <CargarPerfil soloAdoptante>{usuario => <FormularioAdoptante usuario={usuario} />}</CargarPerfil>;
}

function FormularioAdoptante({ usuario }: { usuario: Usuario }) {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const router = useRouter();
  const { guardarPerfilAdoptante, usuario: actual } = useSesion();
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
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errores = validar ? validarPerfilAdoptante(datos) : {};
  function cambiar<K extends keyof PerfilAdoptanteFormulario>(campo: K, valor: PerfilAdoptanteFormulario[K]) {
    setDatos(previo => ({ ...previo, [campo]: valor })); setGuardado(false);
  }
  async function guardar() {
    if (guardando) return;
    setValidar(true); setError(null); setGuardado(false);
    if (Object.keys(validarPerfilAdoptante(datos)).length) return;
    setGuardando(true);
    try {
      await guardarPerfilAdoptante(prepararPerfilAdoptante(datos));
      setGuardado(true);
    } catch (causa) {
      setError(causa instanceof ErrorHttp ? causa.detalle ?? causa.message : 'No pudimos guardar tu perfil. Inténtalo de nuevo.');
    } finally { setGuardando(false); }
  }
  return (
    <ScrollView style={{ flex: 1, backgroundColor: paleta.surface100 }}
      contentContainerStyle={{ padding: espaciado.s5, paddingBottom: margenes.bottom + espaciado.s6, gap: espaciado.s5 }}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={{ color: paleta.inkMuted, lineHeight: 22 }}>Cuéntanos sobre tu hogar y tu disponibilidad. Los refugios consultan estos datos al revisar tu solicitud de adopción.</Text>
      <OpcionesPerfil etiqueta="Tipo de vivienda" opciones={VIVIENDAS} valor={datos.tipoVivienda}
        alCambiar={valor => cambiar('tipoVivienda', valor)} error={errores.tipoVivienda} deshabilitado={guardando} />
      <Campo etiqueta="Espacio disponible" valor={datos.espacioDisponible} multilinea
        marcador="Por ejemplo: apartamento con balcón protegido"
        alCambiar={valor => cambiar('espacioDisponible', valor)} error={errores.espacioDisponible} deshabilitado={guardando} />
      <OpcionesPerfil etiqueta="¿Hay niños en tu hogar?" opciones={SI_NO} valor={datos.presenciaDeNinos}
        alCambiar={valor => cambiar('presenciaDeNinos', valor)} error={errores.presenciaDeNinos} deshabilitado={guardando} />
      <OpcionesPerfil etiqueta="¿Tienes otras mascotas?" opciones={SI_NO} valor={datos.otrasMascotas}
        alCambiar={valor => cambiar('otrasMascotas', valor)} error={errores.otrasMascotas} deshabilitado={guardando} />
      <Campo etiqueta="Tiempo disponible" valor={datos.tiempoDisponible} multilinea
        marcador="Cuánto tiempo puedes dedicar al cuidado y acompañamiento"
        alCambiar={valor => cambiar('tiempoDisponible', valor)} error={errores.tiempoDisponible} deshabilitado={guardando} />
      <OpcionesPerfil etiqueta="¿Has cuidado mascotas antes?" opciones={SI_NO} valor={datos.experienciaPrevia}
        alCambiar={valor => cambiar('experienciaPrevia', valor)} error={errores.experienciaPrevia} deshabilitado={guardando} />
      {error && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
      {guardado && <Text accessibilityRole="alert" style={{ color: paleta.brandStrong }}>Perfil guardado. Completitud: {actual?.perfil?.porcentajeCompletitud ?? 0}%.</Text>}
      <Boton titulo="Guardar perfil" cargando={guardando} alPresionar={() => void guardar()} />
      <Boton titulo="Volver al perfil" variante="secundario" deshabilitado={guardando} alPresionar={() => router.replace('/(tabs)/perfil')} />
    </ScrollView>
  );
}
