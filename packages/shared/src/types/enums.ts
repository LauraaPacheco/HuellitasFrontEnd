/**
 * Enumeraciones del dominio.
 *
 * Los valores numericos coinciden con los TINYINT de la base de datos
 * (ver Huellitas_Tablas.sql). No reordenar: cambiar un numero rompe
 * los datos ya guardados.
 */

/** Nivel del rol. El 0 describe al usuario sin sesion iniciada. */
export enum NivelRol {
  Visitante = 0,
  Administrador = 1,
  Refugio = 2,
  Adoptante = 3,
}

/** Estado de la cuenta de usuario (HU-USU-01, HU-USU-02). */
export enum EstadoUsuario {
  PendienteVerificacion = 0,
  Activo = 1,
  Bloqueado = 2,
  Desactivado = 3,
}

export enum TipoToken {
  VerificacionCorreo = 0,
  RecuperacionContrasena = 1,
}

export enum TipoVivienda {
  Casa = 0,
  Apartamento = 1,
  Finca = 2,
}

/** Estado de verificacion del refugio (HU-REF-01). */
export enum EstadoVerificacion {
  Pendiente = 0,
  Verificado = 1,
  Rechazado = 2,
  Suspendido = 3,
}

export enum TipoNecesidad {
  Alimento = 0,
  Medicinas = 1,
  Insumos = 2,
  Otro = 3,
}

export enum EstadoNecesidad {
  Publicada = 0,
  Cubierta = 1,
}

export enum EstadoApadrinamiento {
  Solicitado = 0,
  Activo = 1,
  Finalizado = 2,
}

/** Moderacion de un comentario: distinto de la eliminacion logica. */
export enum EstadoModeracion {
  Publicada = 0,
  Oculta = 1,
}

export enum Sexo {
  Macho = 0,
  Hembra = 1,
}

/** Estado de la mascota en el catalogo (HU-MAS-01). */
export enum EstadoMascota {
  Disponible = 0,
  EnProceso = 1,
  Adoptada = 2,
  NoDisponible = 3,
}

export enum Procedencia {
  Rescate = 0,
  EntregaVoluntaria = 1,
  ReporteCiudadano = 2,
}

export enum TipoMultimedia {
  Foto = 0,
  Video = 1,
}

export enum TipoRegistroClinico {
  Vacuna = 0,
  Desparasitacion = 1,
  Esterilizacion = 2,
  Diagnostico = 3,
  Tratamiento = 4,
}

/** Flujo de la solicitud de adopcion (HU-ADO-02). */
export enum EstadoSolicitud {
  Enviada = 0,
  EnRevision = 1,
  EntrevistaVisita = 2,
  Aprobada = 3,
  Rechazada = 4,
  Finalizada = 5,
  Cancelada = 6,
  /** La cerro el sistema porque otra solicitud de la misma mascota se finalizo. */
  Cerrada = 7,
}

export enum Modalidad {
  Presencial = 0,
  Virtual = 1,
}

export enum EstadoVisita {
  Propuesta = 0,
  Confirmada = 1,
  Reprogramada = 2,
  Realizada = 3,
}

export enum EstadoSeguimiento {
  Pendiente = 0,
  Enviado = 1,
  Vencido = 2,
}

export enum ResultadoSeguimiento {
  Conforme = 0,
  RequiereAtencion = 1,
}

export enum CanalNotificacion {
  InApp = 0,
  Push = 1,
  Correo = 2,
}

export enum TipoEvento {
  Ingreso = 0,
  CambioEstado = 1,
  AtencionClinica = 2,
  Adopcion = 3,
  Seguimiento = 4,
}

export enum TipoReporte {
  EnCalle = 0,
  Herido = 1,
  Maltrato = 2,
  Otro = 3,
}

export enum EstadoReporte {
  Recibido = 0,
  EnAtencion = 1,
  Rescatado = 2,
  NoEncontrado = 3,
  Cerrado = 4,
}

export enum MotivoDenuncia {
  PosibleEstafa = 0,
  InformacionFalsa = 1,
  ContenidoInapropiado = 2,
  Otro = 3,
}

export enum EstadoDenuncia {
  Recibida = 0,
  EnRevision = 1,
  Resuelta = 2,
}

export enum TipoContenido {
  Mascota = 0,
  Refugio = 1,
  Calificacion = 2,
  Reporte = 3,
}
