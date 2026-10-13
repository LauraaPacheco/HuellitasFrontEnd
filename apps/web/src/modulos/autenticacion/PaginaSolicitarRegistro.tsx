import { useState, type FormEvent } from 'react';
import {
  ErrorHttp,
  esCorreoValido,
  esNitValido,
  esTelefonoValido,
  type SolicitudRefugioDto,
} from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Campo } from '@/componentes/ui/Campo';
import { MarcoAuth } from './MarcoAuth';

const VACIO: SolicitudRefugioDto = {
  nombre: '',
  nit: '',
  direccion: '',
  telefono: '',
  correo: '',
  encargado: '',
  redesSociales: '',
  descripcion: '',
};

/**
 * HU-REF-01: un refugio pide entrar a la plataforma. No crea la cuenta: deja
 * la solicitud en revisión y el administrador la verifica (HU-ADM-01).
 */
export function PaginaSolicitarRegistro() {
  const [datos, setDatos] = useState<SolicitudRefugioDto>(VACIO);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const cambiar =
    (campo: keyof SolicitudRefugioDto) =>
    (valor: string) =>
      setDatos((previo) => ({ ...previo, [campo]: valor }));

  function validar(): string | null {
    if (!datos.nombre.trim()) return 'Escribe el nombre del refugio.';
    if (!esNitValido(datos.nit)) return 'El NIT no tiene un formato válido.';
    if (!datos.direccion.trim()) return 'Escribe la dirección del refugio.';
    if (!esTelefonoValido(datos.telefono)) return 'El teléfono debe tener 10 dígitos.';
    if (!esCorreoValido(datos.correo)) return 'Escribe un correo válido.';
    if (!datos.encargado.trim()) return 'Escribe el nombre del encargado.';
    return null;
  }

  async function alEnviar(evento: FormEvent) {
    evento.preventDefault();
    const problema = validar();
    setError(problema);
    if (problema) return;

    setEnviando(true);
    try {
      await api.refugios.solicitarRegistro(datos);
      setEnviado(true);
    } catch (causa) {
      setError(
        causa instanceof ErrorHttp
          ? (causa.detalle ?? causa.message)
          : 'No pudimos enviar la solicitud. Inténtalo más tarde.',
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <MarcoAuth titulo="Solicitud enviada">
        <p style={{ margin: 0, color: 'var(--ink-muted)', lineHeight: '23px' }}>
          Recibimos la solicitud de <strong>{datos.nombre}</strong>. El
          administrador revisa el NIT y los soportes, y te avisa a{' '}
          <strong>{datos.correo}</strong> cuando quede verificado.
        </p>
        <p style={{ margin: 0, color: 'var(--ink-muted)', fontSize: 14 }}>
          Hasta que no esté verificado, el refugio no puede publicar mascotas.
        </p>
      </MarcoAuth>
    );
  }

  return (
    <MarcoAuth
      titulo="Registrar un refugio"
      descripcion="Déjanos los datos del refugio. Un administrador los revisa antes de darte acceso al panel."
    >
      <form onSubmit={alEnviar} noValidate style={{ display: 'grid', gap: 'var(--space-4)' }}>
        <Campo
          id="nombre"
          etiqueta="Nombre del refugio"
          valor={datos.nombre}
          alCambiar={cambiar('nombre')}
          marcador="Fundación Patitas"
        />
        <Campo
          id="nit"
          etiqueta="NIT"
          valor={datos.nit}
          alCambiar={cambiar('nit')}
          marcador="900123456-7"
          ayuda="Con dígito de verificación"
        />
        <Campo
          id="direccion"
          etiqueta="Dirección"
          valor={datos.direccion}
          alCambiar={cambiar('direccion')}
          marcador="Calle 5 #38-25, Cali"
        />
        <Campo
          id="telefono"
          etiqueta="Teléfono"
          tipo="tel"
          autoComplete="tel"
          valor={datos.telefono}
          alCambiar={cambiar('telefono')}
          marcador="10 dígitos"
        />
        <Campo
          id="correo"
          etiqueta="Correo de contacto"
          tipo="email"
          autoComplete="email"
          valor={datos.correo}
          alCambiar={cambiar('correo')}
          marcador="refugio@ejemplo.com"
          ayuda="Aquí te avisamos cuando quede verificado"
        />
        <Campo
          id="encargado"
          etiqueta="Persona encargada"
          autoComplete="name"
          valor={datos.encargado}
          alCambiar={cambiar('encargado')}
        />
        <Campo
          id="redes"
          etiqueta="Redes sociales (opcional)"
          valor={datos.redesSociales ?? ''}
          alCambiar={cambiar('redesSociales')}
          marcador="@fundacionpatitas"
          ayuda="Ayuda al administrador a verificar que el refugio existe"
        />
        <Campo
          id="descripcion"
          etiqueta="Cuéntanos del refugio (opcional)"
          valor={datos.descripcion ?? ''}
          alCambiar={cambiar('descripcion')}
          marcador="Cuántos animales atienden, desde cuándo"
        />

        {error && (
          <p className="marco-auth__error" role="alert">
            {error}
          </p>
        )}

        <Boton tipo="submit" variante="primario" ancho cargando={enviando}>
          Enviar solicitud
        </Boton>
      </form>
    </MarcoAuth>
  );
}
