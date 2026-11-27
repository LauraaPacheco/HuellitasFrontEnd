import type { NotificacionUsuario } from '../types/trazabilidad';

export type TipoAviso =
  | 'enviada' | 'revision' | 'visita' | 'aprobada' | 'rechazada' | 'finalizada' | 'cerrada'
  | 'seguimiento' | 'seguimientoVencido' | 'nuevaSolicitud' | 'refugio' | 'general';

/** Tono visual del aviso, el mismo vocabulario que las insignias. */
export type TonoAviso = 'marca' | 'acento' | 'advertencia' | 'peligro' | 'neutro';

/** A qué parte de la app lleva tocar el aviso. Cada app lo traduce a su ruta. */
export type DestinoAviso = 'solicitudes' | 'bandeja' | 'refugios' | null;

/** Un trozo de la frase del aviso; los resaltados van en negrita, como en una bandeja de correo. */
export interface TrozoAviso {
  readonly texto: string;
  readonly resaltado?: boolean;
}

export interface AvisoDescrito {
  readonly tipo: TipoAviso;
  readonly titulo: string;
  /** El mensaje sin lo que ya dice el título, para no repetirlo. */
  readonly detalle: string;
  /** El aviso contado como frase, con las palabras clave resaltadas. */
  readonly frase: readonly TrozoAviso[];
  /** Dato aparte que no cabe en la frase (el motivo de un rechazo, por ejemplo). */
  readonly nota: string | null;
  /** De qué trata, para la línea de contexto: "hace 2 h · Solicitud de adopción". */
  readonly categoria: string;
  readonly tono: TonoAviso;
  readonly destino: DestinoAviso;
  /** Texto del botón de acción, solo en los avisos que piden hacer algo. */
  readonly accion: string | null;
}

const quitarTildes = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const b = (texto: string): TrozoAviso => ({ texto, resaltado: true });
const t = (texto: string): TrozoAviso => ({ texto });

/**
 * El backend manda solo un texto libre (NotificacionDTO.Mensaje). Para
 * mostrar cada aviso con su icono, una frase con lo importante resaltado y
 * una acción, se reconoce por las frases que usan AdopcionService y
 * SeguimientoService; lo que no se reconozca se muestra tal cual.
 */
export function describirNotificacion(n: Pick<NotificacionUsuario, 'mensaje'>): AvisoDescrito {
  const original = n.mensaje.trim();
  const m = quitarTildes(original);
  const aviso = (datos: Omit<AvisoDescrito, 'detalle' | 'nota' | 'accion'> & { detalle?: string; nota?: string | null; accion?: string | null }): AvisoDescrito =>
    ({ detalle: datos.frase.map((x) => x.texto).join(''), nota: null, accion: null, ...datos });
  const numero = /#\s*(\d+)/.exec(original)?.[1];
  const seguimiento = numero ? `seguimiento #${numero}` : 'seguimiento';

  if (m.includes('agendo una visita')) {
    const fecha = /(\d{4}-\d{2}-\d{2})/.exec(original)?.[1];
    const legible = fecha ? new Date(`${fecha}T12:00:00`).toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' }) : null;
    return aviso({ tipo: 'visita', titulo: 'Visita agendada', tono: 'marca', destino: 'solicitudes', categoria: 'Solicitud de adopción', accion: 'Ver visita',
      frase: legible ? [b('El refugio'), t(' agendó una '), b('visita'), t(' para el '), b(legible)] : [b('El refugio'), t(' agendó una '), b('visita'), t(' para tu solicitud')] });
  }
  if (m.includes('fue aprobada')) {
    return aviso({ tipo: 'aprobada', titulo: '¡Solicitud aprobada!', tono: 'marca', destino: 'solicitudes', categoria: 'Solicitud de adopción', accion: 'Ver solicitud',
      frase: [b('El refugio'), t(' '), b('aprobó'), t(' tu solicitud de adopción. Coordinará contigo los siguientes pasos')] });
  }
  if (m.includes('fue rechazada')) {
    const motivo = /motivo:\s*(.+)$/i.exec(original)?.[1]?.trim() ?? null;
    return aviso({ tipo: 'rechazada', titulo: 'Solicitud no aprobada', tono: 'peligro', destino: 'solicitudes', categoria: 'Solicitud de adopción',
      frase: [b('El refugio'), t(' '), b('no aprobó'), t(' tu solicitud de adopción')], nota: motivo ? `Motivo: ${motivo}` : null });
  }
  if (m.includes('revisando tu solicitud')) {
    return aviso({ tipo: 'revision', titulo: 'Solicitud en revisión', tono: 'neutro', destino: 'solicitudes', categoria: 'Solicitud de adopción',
      frase: [b('El refugio'), t(' está '), b('revisando'), t(' tu solicitud')] });
  }
  if (m.includes('ha sido enviada')) {
    return aviso({ tipo: 'enviada', titulo: 'Solicitud enviada', tono: 'neutro', destino: 'solicitudes', categoria: 'Solicitud de adopción',
      frase: [t('Enviaste tu '), b('solicitud de adopción'), t('. El refugio revisará tu perfil')] });
  }
  if (m.includes('fue finalizada')) {
    const mascota = /adopci[oó]n de (.+?) fue/i.exec(original)?.[1];
    return aviso({ tipo: 'finalizada', titulo: '¡Adopción finalizada!', tono: 'acento', destino: 'solicitudes', categoria: 'Adopción',
      frase: mascota ? [t('¡Felicidades! La adopción de '), b(mascota), t(' quedó '), b('finalizada')] : [t('¡Felicidades! Tu adopción quedó '), b('finalizada')] });
  }
  if (m.includes('se cerro')) {
    const mascota = /adopci[oó]n de (.+?) se cerr/i.exec(original)?.[1];
    return aviso({ tipo: 'cerrada', titulo: 'Proceso cerrado', tono: 'neutro', destino: 'solicitudes', categoria: 'Solicitud de adopción',
      frase: mascota ? [t('El proceso de adopción de '), b(mascota), t(' se '), b('cerró')] : [t('Tu proceso de adopción se '), b('cerró')],
      nota: 'La mascota encontró hogar con otra familia.' });
  }
  if (m.includes('seguimiento') && m.includes('vencido')) {
    return aviso({ tipo: 'seguimientoVencido', titulo: 'Seguimiento pendiente', tono: 'advertencia', destino: 'solicitudes', categoria: 'Seguimiento', accion: 'Enviar seguimiento',
      frase: [t('Tienes pendiente el '), b(seguimiento), t(' de tu adopción')] });
  }
  if (m.includes('evaluo el seguimiento')) {
    return aviso({ tipo: 'seguimiento', titulo: 'Seguimiento revisado', tono: 'marca', destino: 'solicitudes', categoria: 'Seguimiento',
      frase: [b('El refugio'), t(' revisó el '), b(seguimiento), t(' de tu adopción')] });
  }
  if (m.includes('nueva solicitud')) {
    const mascota = /para ([^.]+)\.?$/i.exec(original)?.[1];
    return aviso({ tipo: 'nuevaSolicitud', titulo: 'Nueva solicitud', tono: 'acento', destino: 'bandeja', categoria: 'Solicitudes', accion: 'Revisar',
      frase: mascota ? [t('Recibiste una '), b('nueva solicitud'), t(' para '), b(mascota)] : [t('Recibiste una '), b('nueva solicitud'), t(' de adopción')] });
  }
  if (m.includes('refugio nuevo') || m.includes('verificacion')) {
    return aviso({ tipo: 'refugio', titulo: 'Refugio por verificar', tono: 'advertencia', destino: 'refugios', categoria: 'Refugios', accion: 'Revisar',
      frase: [t('Hay un '), b('refugio nuevo'), t(' esperando verificación')] });
  }
  return aviso({ tipo: 'general', titulo: 'Aviso', tono: 'neutro', destino: null, categoria: 'Aviso', frase: [t(original.replace(/\.$/, ''))] });
}

export type GrupoAvisos = 'Hoy' | 'Ayer' | 'Esta semana' | 'Antes';

/** Agrupa por día en hora local, conservando el orden (más reciente primero). */
export function agruparPorDia<T extends Pick<NotificacionUsuario, 'fecha'>>(items: readonly T[], ahora = new Date()): { grupo: GrupoAvisos; items: T[] }[] {
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate()).getTime();
  const dia = 86_400_000;
  const grupoDe = (iso: string): GrupoAvisos => {
    const t = new Date(iso).getTime();
    if (t >= inicioHoy) return 'Hoy';
    if (t >= inicioHoy - dia) return 'Ayer';
    if (t >= inicioHoy - 6 * dia) return 'Esta semana';
    return 'Antes';
  };
  const grupos: { grupo: GrupoAvisos; items: T[] }[] = [];
  for (const item of [...items].sort((a, b) => b.fecha.localeCompare(a.fecha))) {
    const g = grupoDe(item.fecha);
    const ultimo = grupos[grupos.length - 1];
    if (ultimo?.grupo === g) ultimo.items.push(item); else grupos.push({ grupo: g, items: [item] });
  }
  return grupos;
}

/** "9:41 a. m." si es de hoy o ayer; si no, "12 nov". */
export function horaAviso(iso: string, grupo: GrupoAvisos): string {
  const f = new Date(iso);
  return grupo === 'Hoy' || grupo === 'Ayer'
    ? f.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })
    : f.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }).replace('.', '');
}
