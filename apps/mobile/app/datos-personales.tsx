import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ErrorHttp, validarDatosPersonales, type Usuario } from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { CargarPerfil } from '@/componentes/CargarPerfil';
import { Campo } from '@/componentes/Campo';
import { Boton } from '@/componentes/Boton';
import { espaciado, usarPaleta } from '@/temas';

export default function PantallaDatosPersonales() {
  return <CargarPerfil>{usuario => <FormularioDatos usuario={usuario} />}</CargarPerfil>;
}

function FormularioDatos({ usuario }: { usuario: Usuario }) {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const router = useRouter();
  const { guardarDatosPersonales } = useSesion();
  const [nombre, setNombre] = useState(usuario.nombre);
  const [telefono, setTelefono] = useState(usuario.telefono ?? '');
  const [validar, setValidar] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errores = validar ? validarDatosPersonales({ nombre, telefono }) : {};

  async function guardar() {
    if (guardando) return;
    setValidar(true); setError(null); setGuardado(false);
    if (Object.keys(validarDatosPersonales({ nombre, telefono })).length) return;
    setGuardando(true);
    try {
      await guardarDatosPersonales({ nombre: nombre.trim(), telefono: telefono.replace(/\s|-/g, '') });
      setGuardado(true);
    } catch (causa) {
      setError(causa instanceof ErrorHttp ? causa.detalle ?? causa.message : 'No pudimos guardar tus datos. Inténtalo de nuevo.');
    } finally { setGuardando(false); }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: paleta.surface100 }}
      contentContainerStyle={{ padding: espaciado.s5, paddingBottom: margenes.bottom + espaciado.s6, gap: espaciado.s4 }}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <Text style={{ color: paleta.inkMuted, lineHeight: 22 }}>Mantén tus datos de contacto actualizados para que los refugios puedan comunicarse contigo.</Text>
      <Campo etiqueta="Nombre completo" valor={nombre} alCambiar={valor => { setNombre(valor); setGuardado(false); }}
        autoComplete="name" error={errores.nombre} deshabilitado={guardando} />
      <Campo etiqueta="Teléfono" valor={telefono} alCambiar={valor => { setTelefono(valor); setGuardado(false); }}
        tipoTeclado="phone-pad" autoComplete="tel" ayuda="10 dígitos" error={errores.telefono} deshabilitado={guardando} />
      <View style={{ gap: espaciado.s1 }}>
        <Text style={{ color: paleta.ink, fontWeight: '600' }}>Correo de la cuenta</Text>
        <Text style={{ color: paleta.ink }}>{usuario.correo}</Text>
        <Text style={{ color: paleta.inkMuted, fontSize: 13 }}>El correo se muestra como referencia y no se modifica desde este formulario.</Text>
      </View>
      {error && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
      {guardado && <Text accessibilityRole="alert" style={{ color: paleta.brandStrong }}>Tus datos personales se guardaron.</Text>}
      <Boton titulo="Guardar cambios" cargando={guardando} alPresionar={() => void guardar()} />
      <Boton titulo="Volver al perfil" variante="secundario" deshabilitado={guardando} alPresionar={() => router.replace('/principal/perfil')} />
    </ScrollView>
  );
}
