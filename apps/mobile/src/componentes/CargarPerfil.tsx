import type { ReactNode } from 'react';
import { Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { NivelRol, type Usuario } from '@huellitas/shared';
import { useSesion } from '@/lib/sesion';
import { api } from '@/lib/api';
import { usarPaleta, espaciado } from '@/temas';
import { AvisoSesion } from './AvisoSesion';
import { Boton } from './Boton';

export function CargarPerfil({ children, soloAdoptante = false }: {
  children: (usuario: Usuario) => ReactNode;
  soloAdoptante?: boolean;
}) {
  const { usuario, cargando } = useSesion();
  const paleta = usarPaleta();
  const permitido = !soloAdoptante || usuario?.rol.nivel === NivelRol.Adoptante;
  const consulta = useQuery({
    queryKey: ['mi-perfil', usuario?.correo],
    queryFn: () => api.usuarios.yo(),
    enabled: !!usuario && permitido,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  if (cargando) return <Text style={{ color: paleta.ink, padding: 24 }}>Cargando sesión…</Text>;
  if (!usuario) return <AvisoSesion mensaje="Inicia sesión para consultar y editar tus datos." />;
  if (!permitido) return <Text accessibilityRole="alert" style={{ color: paleta.ink, padding: 24 }}>Este perfil es exclusivo de adoptantes.</Text>;
  if (consulta.isPending) return <Text style={{ color: paleta.ink, padding: 24 }}>Cargando tus datos…</Text>;
  if (consulta.isError || !consulta.data) return (
    <View style={{ padding: espaciado.s5, gap: espaciado.s4 }}>
      <Text accessibilityRole="alert" style={{ color: paleta.danger }}>No pudimos consultar tus datos. Revisa tu conexión y vuelve a intentarlo.</Text>
      <Boton titulo="Reintentar" alPresionar={() => void consulta.refetch()} />
    </View>
  );
  return <>{children(consulta.data)}</>;
}
