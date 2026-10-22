/**
 * Etiquetas en espanol para cada enumeracion y el color del design system
 * que le corresponde a cada estado.
 *
 * Regla del sistema: ningun estado se comunica solo con color, siempre
 * lleva su texto al lado.
 */

import {
  CanalNotificacion,
  EstadoApadrinamiento,
  EstadoDenuncia,
  EstadoMascota,
  EstadoModeracion,
  EstadoNecesidad,
  EstadoReporte,
  EstadoSeguimiento,
  EstadoSolicitud,
  EstadoUsuario,
  EstadoVerificacion,
  EstadoVisita,
  Modalidad,
  MotivoDenuncia,
  NivelRol,
  Procedencia,
  ResultadoSeguimiento,
  Sexo,
  TipoContenido,
  TipoEvento,
  TipoMultimedia,
  TipoNecesidad,
  TipoRegistroClinico,
  TipoReporte,
  TipoVivienda,
} from './enums';

/** Token de color del design system que pinta el fondo de la insignia. */
export type TonoInsignia = 'neutro' | 'marca' | 'acento' | 'advertencia' | 'peligro';

export interface DescriptorEstado {
  readonly etiqueta: string;
  readonly tono: TonoInsignia;
}

export const ETIQUETA_NIVEL_ROL: Record<NivelRol, string> = {
  [NivelRol.Visitante]: 'Visitante',
  [NivelRol.Administrador]: 'Administrador',
  [NivelRol.Refugio]: 'Refugio',
  [NivelRol.Adoptante]: 'Adoptante',
};

export const ESTADO_USUARIO: Record<EstadoUsuario, DescriptorEstado> = {
  [EstadoUsuario.PendienteVerificacion]: { etiqueta: 'Pendiente de verificación', tono: 'advertencia' },
  [EstadoUsuario.Activo]: { etiqueta: 'Activo', tono: 'marca' },
  [EstadoUsuario.Bloqueado]: { etiqueta: 'Bloqueado', tono: 'peligro' },
  [EstadoUsuario.Desactivado]: { etiqueta: 'Desactivado', tono: 'neutro' },
};

export const ESTADO_VERIFICACION: Record<EstadoVerificacion, DescriptorEstado> = {
  [EstadoVerificacion.Pendiente]: { etiqueta: 'Pendiente', tono: 'advertencia' },
  [EstadoVerificacion.Verificado]: { etiqueta: 'Verificado', tono: 'marca' },
  [EstadoVerificacion.Rechazado]: { etiqueta: 'Rechazado', tono: 'peligro' },
  [EstadoVerificacion.Suspendido]: { etiqueta: 'Suspendido', tono: 'advertencia' },
};

export const ESTADO_MASCOTA: Record<EstadoMascota, DescriptorEstado> = {
  [EstadoMascota.Disponible]: { etiqueta: 'Disponible', tono: 'marca' },
  [EstadoMascota.EnProceso]: { etiqueta: 'En proceso', tono: 'neutro' },
  [EstadoMascota.Adoptada]: { etiqueta: 'Adoptada', tono: 'neutro' },
  [EstadoMascota.NoDisponible]: { etiqueta: 'No disponible', tono: 'neutro' },
};

export const ESTADO_SOLICITUD: Record<EstadoSolicitud, DescriptorEstado> = {
  [EstadoSolicitud.Enviada]: { etiqueta: 'Enviada', tono: 'neutro' },
  [EstadoSolicitud.EnRevision]: { etiqueta: 'En revisión', tono: 'neutro' },
  [EstadoSolicitud.EntrevistaVisita]: { etiqueta: 'Entrevista o visita', tono: 'marca' },
  [EstadoSolicitud.Aprobada]: { etiqueta: 'Aprobada', tono: 'marca' },
  [EstadoSolicitud.Rechazada]: { etiqueta: 'Rechazada', tono: 'peligro' },
  [EstadoSolicitud.Finalizada]: { etiqueta: 'Finalizada', tono: 'marca' },
  [EstadoSolicitud.Cancelada]: { etiqueta: 'Cancelada', tono: 'neutro' },
  [EstadoSolicitud.Cerrada]: { etiqueta: 'Cerrada', tono: 'neutro' },
};

export const ESTADO_REPORTE: Record<EstadoReporte, DescriptorEstado> = {
  [EstadoReporte.Recibido]: { etiqueta: 'Recibido', tono: 'neutro' },
  [EstadoReporte.EnAtencion]: { etiqueta: 'En atención', tono: 'acento' },
  [EstadoReporte.Rescatado]: { etiqueta: 'Rescatado', tono: 'marca' },
  [EstadoReporte.NoEncontrado]: { etiqueta: 'No encontrado', tono: 'neutro' },
  [EstadoReporte.Cerrado]: { etiqueta: 'Cerrado', tono: 'neutro' },
};

export const ESTADO_SEGUIMIENTO: Record<EstadoSeguimiento, DescriptorEstado> = {
  [EstadoSeguimiento.Pendiente]: { etiqueta: 'Pendiente', tono: 'neutro' },
  [EstadoSeguimiento.Enviado]: { etiqueta: 'Enviado', tono: 'marca' },
  [EstadoSeguimiento.Vencido]: { etiqueta: 'Vencido', tono: 'advertencia' },
};

export const ESTADO_VISITA: Record<EstadoVisita, DescriptorEstado> = {
  [EstadoVisita.Propuesta]: { etiqueta: 'Propuesta', tono: 'neutro' },
  [EstadoVisita.Confirmada]: { etiqueta: 'Confirmada', tono: 'marca' },
  [EstadoVisita.Reprogramada]: { etiqueta: 'Reprogramada', tono: 'advertencia' },
  [EstadoVisita.Realizada]: { etiqueta: 'Realizada', tono: 'marca' },
};

export const ESTADO_DENUNCIA: Record<EstadoDenuncia, DescriptorEstado> = {
  [EstadoDenuncia.Recibida]: { etiqueta: 'Recibida', tono: 'acento' },
  [EstadoDenuncia.EnRevision]: { etiqueta: 'En revisión', tono: 'neutro' },
  [EstadoDenuncia.Resuelta]: { etiqueta: 'Resuelta', tono: 'marca' },
};

export const ESTADO_APADRINAMIENTO: Record<EstadoApadrinamiento, DescriptorEstado> = {
  [EstadoApadrinamiento.Solicitado]: { etiqueta: 'Solicitado', tono: 'neutro' },
  [EstadoApadrinamiento.Activo]: { etiqueta: 'Activo', tono: 'marca' },
  [EstadoApadrinamiento.Finalizado]: { etiqueta: 'Finalizado', tono: 'neutro' },
};

export const ESTADO_NECESIDAD: Record<EstadoNecesidad, DescriptorEstado> = {
  [EstadoNecesidad.Publicada]: { etiqueta: 'Publicada', tono: 'acento' },
  [EstadoNecesidad.Cubierta]: { etiqueta: 'Cubierta', tono: 'marca' },
};

export const ESTADO_MODERACION: Record<EstadoModeracion, DescriptorEstado> = {
  [EstadoModeracion.Publicada]: { etiqueta: 'Publicada', tono: 'marca' },
  [EstadoModeracion.Oculta]: { etiqueta: 'Oculta', tono: 'advertencia' },
};

export const ETIQUETA_SEXO: Record<Sexo, string> = {
  [Sexo.Macho]: 'Macho',
  [Sexo.Hembra]: 'Hembra',
};

export const ETIQUETA_TIPO_VIVIENDA: Record<TipoVivienda, string> = {
  [TipoVivienda.Casa]: 'Casa',
  [TipoVivienda.Apartamento]: 'Apartamento',
  [TipoVivienda.Finca]: 'Finca',
};

export const ETIQUETA_PROCEDENCIA: Record<Procedencia, string> = {
  [Procedencia.Rescate]: 'Rescate',
  [Procedencia.EntregaVoluntaria]: 'Entrega voluntaria',
  [Procedencia.ReporteCiudadano]: 'Reporte ciudadano',
};

export const ETIQUETA_TIPO_REPORTE: Record<TipoReporte, string> = {
  [TipoReporte.EnCalle]: 'En calle',
  [TipoReporte.Herido]: 'Herido',
  [TipoReporte.Maltrato]: 'Maltrato',
  [TipoReporte.Otro]: 'Otro',
};

export const ETIQUETA_TIPO_REGISTRO_CLINICO: Record<TipoRegistroClinico, string> = {
  [TipoRegistroClinico.Vacuna]: 'Vacuna',
  [TipoRegistroClinico.Desparasitacion]: 'Desparasitación',
  [TipoRegistroClinico.Esterilizacion]: 'Esterilización',
  [TipoRegistroClinico.Diagnostico]: 'Diagnóstico',
  [TipoRegistroClinico.Tratamiento]: 'Tratamiento',
};

export const ETIQUETA_TIPO_NECESIDAD: Record<TipoNecesidad, string> = {
  [TipoNecesidad.Alimento]: 'Alimento',
  [TipoNecesidad.Medicinas]: 'Medicinas',
  [TipoNecesidad.Insumos]: 'Insumos',
  [TipoNecesidad.Otro]: 'Otro',
};

export const ETIQUETA_TIPO_MULTIMEDIA: Record<TipoMultimedia, string> = {
  [TipoMultimedia.Foto]: 'Foto',
  [TipoMultimedia.Video]: 'Video',
};

export const ETIQUETA_MODALIDAD: Record<Modalidad, string> = {
  [Modalidad.Presencial]: 'Presencial',
  [Modalidad.Virtual]: 'Virtual',
};

export const ETIQUETA_RESULTADO_SEGUIMIENTO: Record<ResultadoSeguimiento, string> = {
  [ResultadoSeguimiento.Conforme]: 'Conforme',
  [ResultadoSeguimiento.RequiereAtencion]: 'Requiere atención',
};

export const ETIQUETA_CANAL: Record<CanalNotificacion, string> = {
  [CanalNotificacion.InApp]: 'En la aplicación',
  [CanalNotificacion.Push]: 'Notificación push',
  [CanalNotificacion.Correo]: 'Correo',
};

export const ETIQUETA_TIPO_EVENTO: Record<TipoEvento, string> = {
  [TipoEvento.Ingreso]: 'Ingreso',
  [TipoEvento.CambioEstado]: 'Cambio de estado',
  [TipoEvento.AtencionClinica]: 'Atención clínica',
  [TipoEvento.Adopcion]: 'Adopción',
  [TipoEvento.Seguimiento]: 'Seguimiento',
};

export const ETIQUETA_MOTIVO_DENUNCIA: Record<MotivoDenuncia, string> = {
  [MotivoDenuncia.PosibleEstafa]: 'Posible estafa',
  [MotivoDenuncia.InformacionFalsa]: 'Información falsa',
  [MotivoDenuncia.ContenidoInapropiado]: 'Contenido inapropiado',
  [MotivoDenuncia.Otro]: 'Otro',
};

export const ETIQUETA_TIPO_CONTENIDO: Record<TipoContenido, string> = {
  [TipoContenido.Mascota]: 'Mascota',
  [TipoContenido.Refugio]: 'Refugio',
  [TipoContenido.Calificacion]: 'Calificación',
  [TipoContenido.Reporte]: 'Reporte ciudadano',
};
