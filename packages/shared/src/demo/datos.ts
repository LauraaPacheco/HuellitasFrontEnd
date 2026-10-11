/**
 * Datos simulados para el modo demo.
 *
 * Sirven para recorrer las dos apps sin backend: desarrollo en paralelo,
 * sustentacion y grabacion del video. Todo es ficticio; ningun refugio,
 * persona ni mascota aqui corresponde a alguien real.
 */

import {
  EstadoMascota,
  EstadoReporte,
  EstadoSolicitud,
  EstadoUsuario,
  EstadoVerificacion,
  NivelRol,
  Procedencia,
  Sexo,
  TipoRegistroClinico,
  TipoReporte,
  TipoVivienda,
} from '../types/enums';
import type { Rol, Usuario } from '../types/usuarios';
import type { Refugio } from '../types/refugios';
import type { Mascota, MascotaResumen } from '../types/mascotas';
import type { SolicitudAdopcion, SolicitudResumen } from '../types/adopcion';
import type { ReporteResumen } from '../types/reportes';
import type { EtapaLineaTiempo } from '../types/trazabilidad';

/** Credenciales de prueba. La contrasena es la misma para los tres. */
export const CONTRASENA_DEMO = 'Demo1234';

export const USUARIOS_DEMO = [
  { correo: 'adoptante@huellitas.co', rol: NivelRol.Adoptante },
  { correo: 'refugio@huellitas.co', rol: NivelRol.Refugio },
  { correo: 'admin@huellitas.co', rol: NivelRol.Administrador },
] as const;

function hace(dias: number): string {
  return new Date(Date.now() - dias * 86_400_000).toISOString();
}

function base(id: number, diasCreacion = 90) {
  return {
    id,
    activo: true,
    fechaCreacion: hace(diasCreacion),
    fechaModificacion: null,
  };
}

/* ---------------------------------------------------------------- Roles */

const ROLES: Record<NivelRol, Rol> = {
  [NivelRol.Visitante]: { ...base(1), nombre: 'Visitante', nivel: NivelRol.Visitante, permisos: [] },
  [NivelRol.Administrador]: {
    ...base(2),
    nombre: 'Administrador',
    nivel: NivelRol.Administrador,
    permisos: ['*'],
  },
  [NivelRol.Refugio]: {
    ...base(3),
    nombre: 'Refugio',
    nivel: NivelRol.Refugio,
    permisos: ['mascotas:escribir', 'solicitudes:gestionar', 'reportes:atender'],
  },
  [NivelRol.Adoptante]: {
    ...base(4),
    nombre: 'Adoptante',
    nivel: NivelRol.Adoptante,
    permisos: ['solicitudes:crear', 'reportes:crear'],
  },
};

/* ------------------------------------------------------------- Usuarios */

export function usuarioDemo(nivel: NivelRol): Usuario {
  const comun = {
    ...base(10 + nivel),
    rolId: ROLES[nivel].id,
    rol: ROLES[nivel],
    estado: EstadoUsuario.Activo,
    fechaRegistro: hace(120),
    telefono: '3001234567',
  };

  if (nivel === NivelRol.Adoptante) {
    return {
      ...comun,
      refugioId: null,
      nombre: 'Mariana Ríos',
      correo: 'adoptante@huellitas.co',
      perfil: {
        ...base(1),
        usuarioId: comun.id,
        tipoVivienda: TipoVivienda.Casa,
        espacioDisponible: 'Casa con patio',
        presenciaDeNinos: false,
        otrasMascotas: false,
        tiempoDisponible: '4 horas al día',
        experienciaPrevia: true,
        porcentajeCompletitud: 100,
      },
    };
  }

  if (nivel === NivelRol.Refugio) {
    return {
      ...comun,
      refugioId: 1,
      nombre: 'Laura Mejía',
      correo: 'refugio@huellitas.co',
      perfil: null,
    };
  }

  return {
    ...comun,
    refugioId: null,
    nombre: 'Administrador Huellitas',
    correo: 'admin@huellitas.co',
    perfil: null,
  };
}

/* ------------------------------------------------------------- Refugios */

export const REFUGIOS: readonly Refugio[] = [
  {
    ...base(1, 400),
    nombre: 'Refugio Patitas Felices',
    nit: '901234567-8',
    direccion: 'Carrera 94 # 14-120, Comuna 17',
    telefono: '3101112233',
    correo: 'contacto@patitasfelices.demo',
    encargado: 'Laura Mejía',
    redesSociales: '@patitasfelices',
    descripcion:
      'Refugio con 8 años de trabajo en el sur de Cali. Rescatamos, esterilizamos y buscamos hogar responsable.',
    estadoVerificacion: EstadoVerificacion.Verificado,
    fechaVerificacion: hace(380),
    motivoRechazo: null,
    promedioCalificacion: 4.6,
    totalAdopciones: 34,
    requisitos: [
      { ...base(1), refugioId: 1, descripcion: 'Ser mayor de edad', esObligatorio: true, orden: 1 },
      { ...base(2), refugioId: 1, descripcion: 'Vivienda con patio o balcón cerrado', esObligatorio: true, orden: 2 },
      { ...base(3), refugioId: 1, descripcion: 'Aceptar visita domiciliaria', esObligatorio: true, orden: 3 },
      { ...base(4), refugioId: 1, descripcion: 'Compromiso de seguimiento por 6 meses', esObligatorio: true, orden: 4 },
    ],
  },
  {
    ...base(2, 300),
    nombre: 'Hogar Amigo Cali',
    nit: '901234568-1',
    direccion: 'Calle 5 # 66-30, Comuna 19',
    telefono: '3104445566',
    correo: 'hola@hogaramigo.demo',
    encargado: 'Andrés Lozano',
    redesSociales: '@hogaramigocali',
    descripcion: 'Colectivo ciudadano que atiende rescates en el occidente de la ciudad.',
    estadoVerificacion: EstadoVerificacion.Pendiente,
    fechaVerificacion: null,
    motivoRechazo: null,
    promedioCalificacion: null,
    totalAdopciones: 0,
    requisitos: [],
  },
  {
    ...base(3, 250),
    nombre: 'Patas del Sur',
    nit: '900876543-2',
    direccion: 'Carrera 100 # 16-200, Comuna 22',
    telefono: '3157778899',
    correo: 'info@patasdelsur.demo',
    encargado: 'Carolina Ospina',
    redesSociales: '@patasdelsur',
    descripcion: 'Fundación dedicada al rescate de gatos y a jornadas de esterilización.',
    estadoVerificacion: EstadoVerificacion.Verificado,
    fechaVerificacion: hace(200),
    motivoRechazo: null,
    promedioCalificacion: 4.2,
    totalAdopciones: 18,
    requisitos: [
      { ...base(5), refugioId: 3, descripcion: 'Mallas de seguridad en ventanas', esObligatorio: true, orden: 1 },
      { ...base(6), refugioId: 3, descripcion: 'Ser mayor de edad', esObligatorio: true, orden: 2 },
    ],
  },
];

/* ------------------------------------------------------------- Catalogos */

export const ESPECIES = [
  { id: 1, nombre: 'Perro', activo: true },
  { id: 2, nombre: 'Gato', activo: true },
  { id: 3, nombre: 'Otro', activo: true },
];

export const RAZAS = [
  { id: 1, especieId: 1, nombre: 'Sin raza definida', activo: true },
  { id: 2, especieId: 1, nombre: 'Criollo', activo: true },
  { id: 3, especieId: 1, nombre: 'Labrador', activo: true },
  { id: 4, especieId: 1, nombre: 'Pastor alemán', activo: true },
  { id: 5, especieId: 2, nombre: 'Criollo', activo: true },
  { id: 6, especieId: 2, nombre: 'Siamés', activo: true },
];

export const TAMANOS = [
  { id: 1, nombre: 'Pequeño', activo: true },
  { id: 2, nombre: 'Mediano', activo: true },
  { id: 3, nombre: 'Grande', activo: true },
];

export const COLORES = [
  { id: 1, nombre: 'Negro', activo: true },
  { id: 2, nombre: 'Blanco', activo: true },
  { id: 3, nombre: 'Café', activo: true },
  { id: 4, nombre: 'Atigrado', activo: true },
  { id: 5, nombre: 'Tricolor', activo: true },
];

export const TEMPERAMENTOS = [
  { id: 1, nombre: 'Tranquilo', activo: true },
  { id: 2, nombre: 'Juguetón', activo: true },
  { id: 3, nombre: 'Enérgico', activo: true },
  { id: 4, nombre: 'Sociable', activo: true },
  { id: 5, nombre: 'Bueno con niños', activo: true },
  { id: 6, nombre: 'Bueno con otras mascotas', activo: true },
];

/* ------------------------------------------------------------- Mascotas */

interface SemillaMascota {
  readonly id: number;
  readonly nombre: string;
  readonly especieId: number;
  readonly razaId: number | null;
  readonly tamanoId: number;
  readonly colorId: number;
  readonly sexo: Sexo;
  readonly edad: number;
  readonly estado: EstadoMascota;
  readonly refugioId: number;
  readonly esterilizada: boolean;
  readonly procedencia: Procedencia;
  readonly diasSinActualizar: number;
  readonly descripcion: string;
  readonly temperamentos: readonly number[];
}

const SEMILLAS: readonly SemillaMascota[] = [
  { id: 1, nombre: 'Canela', especieId: 1, razaId: 2, tamanoId: 2, colorId: 3, sexo: Sexo.Hembra, edad: 2, estado: EstadoMascota.Disponible, refugioId: 1, esterilizada: true, procedencia: Procedencia.Rescate, diasSinActualizar: 2, descripcion: 'Llegó al refugio después de un rescate en la vía al mar. Es tranquila, aprendió a caminar con correa y se lleva bien con otros perros.', temperamentos: [1, 4, 6] },
  { id: 2, nombre: 'Miso', especieId: 2, razaId: 5, tamanoId: 1, colorId: 4, sexo: Sexo.Macho, edad: 1, estado: EstadoMascota.EnProceso, refugioId: 3, esterilizada: true, procedencia: Procedencia.EntregaVoluntaria, diasSinActualizar: 5, descripcion: 'Gatico curioso que llegó con ocho meses. Necesita una casa con mallas en las ventanas.', temperamentos: [2, 4] },
  { id: 3, nombre: 'Rocco', especieId: 1, razaId: 4, tamanoId: 3, colorId: 1, sexo: Sexo.Macho, edad: 4, estado: EstadoMascota.Disponible, refugioId: 1, esterilizada: true, procedencia: Procedencia.ReporteCiudadano, diasSinActualizar: 1, descripcion: 'Lo reportó un ciudadano en la comuna 18. Es grande y con mucha energía: necesita espacio y paseos diarios.', temperamentos: [3, 4] },
  { id: 4, nombre: 'Luna', especieId: 2, razaId: 6, tamanoId: 1, colorId: 2, sexo: Sexo.Hembra, edad: 3, estado: EstadoMascota.Disponible, refugioId: 3, esterilizada: true, procedencia: Procedencia.Rescate, diasSinActualizar: 12, descripcion: 'Gata siamesa muy apegada. Prefiere hogares sin otros gatos.', temperamentos: [1] },
  { id: 5, nombre: 'Tomás', especieId: 1, razaId: 1, tamanoId: 1, colorId: 5, sexo: Sexo.Macho, edad: 6, estado: EstadoMascota.Disponible, refugioId: 1, esterilizada: true, procedencia: Procedencia.EntregaVoluntaria, diasSinActualizar: 45, descripcion: 'Perro adulto, ideal para una familia tranquila. Lleva dos años esperando hogar.', temperamentos: [1, 5] },
  { id: 6, nombre: 'Nube', especieId: 2, razaId: 5, tamanoId: 1, colorId: 2, sexo: Sexo.Hembra, edad: 1, estado: EstadoMascota.Disponible, refugioId: 3, esterilizada: false, procedencia: Procedencia.Rescate, diasSinActualizar: 3, descripcion: 'Rescatada de una obra en construcción. Todavía es cachorra y está en proceso de socialización.', temperamentos: [2, 3] },
  { id: 7, nombre: 'Bruno', especieId: 1, razaId: 3, tamanoId: 3, colorId: 3, sexo: Sexo.Macho, edad: 5, estado: EstadoMascota.Adoptada, refugioId: 1, esterilizada: true, procedencia: Procedencia.Rescate, diasSinActualizar: 20, descripcion: 'Encontró hogar en agosto. Su familia envía los seguimientos al día.', temperamentos: [1, 5, 6] },
  { id: 8, nombre: 'Pecas', especieId: 1, razaId: 2, tamanoId: 2, colorId: 5, sexo: Sexo.Hembra, edad: 3, estado: EstadoMascota.Disponible, refugioId: 1, esterilizada: true, procedencia: Procedencia.ReporteCiudadano, diasSinActualizar: 8, descripcion: 'Muy sociable con niños. Le encanta el agua y los juegos de buscar.', temperamentos: [2, 4, 5] },
];

function nombreCatalogo(lista: readonly { id: number; nombre: string }[], id: number | null): string | null {
  if (id === null) return null;
  return lista.find((elemento) => elemento.id === id)?.nombre ?? null;
}

export function mascotasResumen(): readonly MascotaResumen[] {
  return SEMILLAS.map((semilla) => {
    const refugio = REFUGIOS.find((r) => r.id === semilla.refugioId);
    return {
      id: semilla.id,
      nombre: semilla.nombre,
      especie: nombreCatalogo(ESPECIES, semilla.especieId) ?? 'Otro',
      raza: nombreCatalogo(RAZAS, semilla.razaId),
      tamano: nombreCatalogo(TAMANOS, semilla.tamanoId) ?? 'Mediano',
      sexo: semilla.sexo,
      edadAproximada: semilla.edad,
      estado: semilla.estado,
      fotoPrincipal: null,
      refugioId: semilla.refugioId,
      refugioNombre: refugio?.nombre ?? 'Refugio',
      refugioVerificado: refugio?.estadoVerificacion === EstadoVerificacion.Verificado,
      fechaUltimaActualizacion: hace(semilla.diasSinActualizar),
      puntajeCompatibilidad: null,
    };
  });
}

export function mascotaCompleta(id: number): Mascota | null {
  const semilla = SEMILLAS.find((s) => s.id === id);
  if (!semilla) return null;

  return {
    ...base(semilla.id, 180),
    refugioId: semilla.refugioId,
    especieId: semilla.especieId,
    razaId: semilla.razaId,
    tamanoId: semilla.tamanoId,
    colorId: semilla.colorId,
    nombre: semilla.nombre,
    sexo: semilla.sexo,
    edadAproximada: semilla.edad,
    descripcion: semilla.descripcion,
    esterilizada: semilla.esterilizada,
    estado: semilla.estado,
    procedencia: semilla.procedencia,
    fechaIngreso: hace(180).slice(0, 10),
    fechaUltimaActualizacion: hace(semilla.diasSinActualizar),
    motivoBaja: null,
    temperamentos: TEMPERAMENTOS.filter((t) => semilla.temperamentos.includes(t.id)),
    multimedia: [],
    historialClinico: semilla.esterilizada
      ? [
          { ...base(semilla.id * 10 + 1), mascotaId: semilla.id, tipo: TipoRegistroClinico.Vacuna, fecha: hace(200).slice(0, 10), descripcion: 'Antirrábica', soporteVeterinario: null },
          { ...base(semilla.id * 10 + 2), mascotaId: semilla.id, tipo: TipoRegistroClinico.Desparasitacion, fecha: hace(150).slice(0, 10), descripcion: null, soporteVeterinario: null },
          { ...base(semilla.id * 10 + 3), mascotaId: semilla.id, tipo: TipoRegistroClinico.Esterilizacion, fecha: hace(120).slice(0, 10), descripcion: null, soporteVeterinario: null },
        ]
      : [
          { ...base(semilla.id * 10 + 1), mascotaId: semilla.id, tipo: TipoRegistroClinico.Vacuna, fecha: hace(60).slice(0, 10), descripcion: 'Primera dosis', soporteVeterinario: null },
        ],
  };
}

/* ---------------------------------------------------------- Solicitudes */

interface SemillaSolicitud {
  readonly id: number;
  readonly codigo: string;
  readonly adoptante: string;
  readonly perfilCompleto: boolean;
  readonly mascotaId: number;
  readonly diasDesdeEnvio: number;
  readonly diasSinRespuesta: number;
  readonly estado: EstadoSolicitud;
}

const SOLICITUDES: readonly SemillaSolicitud[] = [
  { id: 1, codigo: 'SOL-0412', adoptante: 'Mariana Ríos', perfilCompleto: true, mascotaId: 1, diasDesdeEnvio: 6, diasSinRespuesta: 6, estado: EstadoSolicitud.EnRevision },
  { id: 2, codigo: 'SOL-0413', adoptante: 'Julián Vélez', perfilCompleto: true, mascotaId: 2, diasDesdeEnvio: 1, diasSinRespuesta: 1, estado: EstadoSolicitud.EntrevistaVisita },
  { id: 3, codigo: 'SOL-0414', adoptante: 'Daniela Ocampo', perfilCompleto: false, mascotaId: 1, diasDesdeEnvio: 9, diasSinRespuesta: 9, estado: EstadoSolicitud.Enviada },
  { id: 4, codigo: 'SOL-0409', adoptante: 'Santiago Bermúdez', perfilCompleto: true, mascotaId: 7, diasDesdeEnvio: 40, diasSinRespuesta: 0, estado: EstadoSolicitud.Finalizada },
  { id: 5, codigo: 'SOL-0410', adoptante: 'Paula Zapata', perfilCompleto: true, mascotaId: 5, diasDesdeEnvio: 15, diasSinRespuesta: 0, estado: EstadoSolicitud.Rechazada },
];

export function solicitudesResumen(): readonly SolicitudResumen[] {
  return SOLICITUDES.map((s) => {
    const mascota = SEMILLAS.find((m) => m.id === s.mascotaId);
    return {
      id: s.id,
      codigo: s.codigo,
      usuarioId: 13,
      nombreAdoptante: s.adoptante,
      perfilCompleto: s.perfilCompleto,
      mascotaId: s.mascotaId,
      nombreMascota: mascota?.nombre ?? 'Mascota',
      fechaEnvio: hace(s.diasDesdeEnvio),
      estado: s.estado,
      diasSinRespuesta: s.diasSinRespuesta,
    };
  });
}

export function solicitudCompleta(id: number): SolicitudAdopcion | null {
  const s = SOLICITUDES.find((x) => x.id === id);
  if (!s) return null;
  const resumen = mascotasResumen().find((m) => m.id === s.mascotaId);
  if (!resumen) return null;

  return {
    ...base(s.id, s.diasDesdeEnvio),
    codigo: s.codigo,
    usuarioId: 13,
    mascotaId: s.mascotaId,
    mascota: resumen,
    fechaEnvio: hace(s.diasDesdeEnvio),
    estado: s.estado,
    respuestasFormulario: {
      '¿Por qué quieres adoptar?':
        'Vivo sola en una casa con patio y tengo tiempo para acompañarla. Crecí con perros y quiero darle hogar a uno que lo necesite.',
      '¿Quién la cuidará si viajas?': 'Mi hermana, que vive a dos cuadras.',
    },
    observaciones: s.estado === EstadoSolicitud.EnRevision ? 'Pendiente de agendar la visita domiciliaria.' : null,
    motivoRechazo:
      s.estado === EstadoSolicitud.Rechazada
        ? 'El espacio reportado no es adecuado para una mascota de este tamaño.'
        : null,
    soportes: [],
    visita: null,
    adopcion: null,
  };
}

export function lineaTiempo(id: number): readonly EtapaLineaTiempo[] {
  const s = SOLICITUDES.find((x) => x.id === id);
  const estado = s?.estado ?? EstadoSolicitud.Enviada;
  const alcanzado = (etapa: EstadoSolicitud) => estado >= etapa && estado <= EstadoSolicitud.Finalizada;

  return [
    { etiqueta: 'Enviada', estado: 'completada', fecha: hace(s?.diasDesdeEnvio ?? 6), detalle: null },
    {
      etiqueta: 'En revisión',
      estado: alcanzado(EstadoSolicitud.EnRevision) ? (estado === EstadoSolicitud.EnRevision ? 'actual' : 'completada') : 'pendiente',
      fecha: alcanzado(EstadoSolicitud.EnRevision) ? hace((s?.diasDesdeEnvio ?? 6) - 1) : null,
      detalle: null,
    },
    {
      etiqueta: 'Entrevista o visita',
      estado: estado === EstadoSolicitud.EntrevistaVisita ? 'actual' : alcanzado(EstadoSolicitud.Aprobada) ? 'completada' : 'pendiente',
      fecha: estado === EstadoSolicitud.EntrevistaVisita ? hace(0) : null,
      detalle: estado === EstadoSolicitud.EntrevistaVisita ? 'Agendada de forma virtual' : null,
    },
    {
      etiqueta: 'Decisión del refugio',
      estado: estado === EstadoSolicitud.Finalizada || estado === EstadoSolicitud.Rechazada ? 'completada' : 'pendiente',
      fecha: estado === EstadoSolicitud.Finalizada || estado === EstadoSolicitud.Rechazada ? hace(2) : null,
      detalle: null,
    },
    {
      etiqueta: 'Entrega y seguimiento',
      estado: estado === EstadoSolicitud.Finalizada ? 'completada' : 'pendiente',
      fecha: estado === EstadoSolicitud.Finalizada ? hace(1) : null,
      detalle: null,
    },
  ];
}

/* ------------------------------------------------------------- Reportes */

export const REPORTES: readonly ReporteResumen[] = [
  { id: 1, numeroReporte: 'REP-0188', tipo: TipoReporte.Herido, estado: EstadoReporte.EnAtencion, fechaReporte: hace(0), zona: 'Comuna 18', fotoPrincipal: null, refugioAsignado: 'Refugio Patitas Felices', esPrioritario: true },
  { id: 2, numeroReporte: 'REP-0187', tipo: TipoReporte.EnCalle, estado: EstadoReporte.Recibido, fechaReporte: hace(1), zona: 'Comuna 22', fotoPrincipal: null, refugioAsignado: null, esPrioritario: false },
  { id: 3, numeroReporte: 'REP-0186', tipo: TipoReporte.Maltrato, estado: EstadoReporte.Recibido, fechaReporte: hace(2), zona: 'Comuna 3', fotoPrincipal: null, refugioAsignado: null, esPrioritario: true },
  { id: 4, numeroReporte: 'REP-0180', tipo: TipoReporte.EnCalle, estado: EstadoReporte.Rescatado, fechaReporte: hace(14), zona: 'Comuna 17', fotoPrincipal: null, refugioAsignado: 'Refugio Patitas Felices', esPrioritario: false },
];
