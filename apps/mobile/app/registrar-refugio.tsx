import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation } from '@tanstack/react-query';
import { House } from 'lucide-react-native';
import { ErrorHttp, validarRefugio, type SolicitudRefugioDto } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/lib/sesion';
import { AvisoSesion } from '@/componentes/AvisoSesion';
import { Boton } from '@/componentes/Boton';
import { Campo } from '@/componentes/Campo';
import { EstadoVacio } from '@/componentes/EstadoVacio';
import { espaciado, radios, usarPaleta } from '@/temas';

/**
 * HU-REF-01 con POST /api/v1/Refugios/solicitar: quien ya tiene cuenta
 * registra su refugio sin crear otra. La solicitud queda Pendiente hasta que
 * el administrador la verifique, y la cuenta pasa a rol Refugio: desde ahí
 * se gestiona en el panel web, así que se cierra la sesión de la app.
 */
export default function PantallaRegistrarRefugio() {
  const paleta = usarPaleta();
  const margenes = useSafeAreaInsets();
  const router = useRouter();
  const { usuario, cerrarSesion } = useSesion();
  const [datos, setDatos] = useState<SolicitudRefugioDto>(() => ({
    nombre: '', nit: '', direccion: '', telefono: usuario?.telefono ?? '', correo: usuario?.correo ?? '', encargado: usuario?.nombre ?? '', descripcion: '',
  }));
  const [error, setError] = useState('');
  const enviar = useMutation({
    mutationFn: () => api.refugios.solicitarConMiCuenta(datos),
    onError: (e) => setError(e instanceof ErrorHttp ? e.detalle ?? e.message : 'No pudimos enviar la solicitud. Inténtalo de nuevo.'),
  });
  const cambiar = (clave: keyof SolicitudRefugioDto) => (valor: string) => { setDatos((d) => ({ ...d, [clave]: valor })); setError(''); };

  if (!usuario) return <AvisoSesion titulo="Registra tu refugio" mensaje="Inicia sesión para registrar tu refugio con tu cuenta." />;
  if (usuario.refugioId) {
    return <EstadoVacio ilustracion="trio" titulo="Tu cuenta ya tiene un refugio" descripcion="Gestiónalo desde el panel web de Huellitas." />;
  }
  if (enviar.isSuccess) {
    return (
      <EstadoVacio
        ilustracion="trio"
        titulo="¡Solicitud enviada!"
        descripcion="Un administrador revisará tu refugio. Tu cuenta ahora es de refugio: entra al panel web de Huellitas con el mismo correo y contraseña para gestionarlo."
        accion={<Boton titulo="Entendido, cerrar sesión" alPresionar={() => { void cerrarSesion().finally(() => router.replace('/principal')); }} />}
      />
    );
  }

  function intentar() {
    const problema = validarRefugio(datos);
    if (problema) { setError(problema); return; }
    enviar.mutate();
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: paleta.surface100 }}
      contentContainerStyle={{ padding: espaciado.s5, paddingBottom: margenes.bottom + espaciado.s6, gap: espaciado.s4 }}
      keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
      <View style={{ flexDirection: 'row', gap: espaciado.s3, padding: espaciado.s4, borderRadius: radios.md, backgroundColor: paleta.brandTint }}>
        <House size={22} strokeWidth={1.75} color={paleta.brandStrong} />
        <Text style={{ flex: 1, color: paleta.ink, lineHeight: 21 }}>
          Usa tu cuenta para registrar tu refugio. Al enviarla, tu cuenta pasa a ser de refugio y la gestionas desde el panel web. Un administrador la verificará.
        </Text>
      </View>
      <Campo etiqueta="Nombre del refugio" valor={datos.nombre} alCambiar={cambiar('nombre')} deshabilitado={enviar.isPending} />
      <Campo etiqueta="NIT o documento" valor={datos.nit} alCambiar={cambiar('nit')} tipoTeclado="numbers-and-punctuation" ayuda="Ejemplo: 900123456-7" deshabilitado={enviar.isPending} />
      <Campo etiqueta="Dirección" valor={datos.direccion} alCambiar={cambiar('direccion')} deshabilitado={enviar.isPending} />
      <Campo etiqueta="Teléfono" valor={datos.telefono} alCambiar={cambiar('telefono')} tipoTeclado="phone-pad" autoComplete="tel" ayuda="10 dígitos" deshabilitado={enviar.isPending} />
      <Campo etiqueta="Correo del refugio" valor={datos.correo} alCambiar={cambiar('correo')} tipoTeclado="email-address" autoCapitalize="none" autoComplete="email" deshabilitado={enviar.isPending} />
      <Campo etiqueta="Encargado" valor={datos.encargado} alCambiar={cambiar('encargado')} autoComplete="name" deshabilitado={enviar.isPending} />
      <Campo etiqueta="Descripción (opcional)" valor={datos.descripcion ?? ''} alCambiar={cambiar('descripcion')} multilinea marcador="A qué se dedican, cuántos animales cuidan…" deshabilitado={enviar.isPending} />
      {error !== '' && <Text accessibilityRole="alert" style={{ color: paleta.danger }}>{error}</Text>}
      <Boton titulo="Enviar solicitud" cargando={enviar.isPending} alPresionar={intentar} />
    </ScrollView>
  );
}
