/**
 * Rutas de la API. Un solo lugar donde cambiarlas si el backend
 * renombra un endpoint.
 */
export const RUTAS = {
  /**
   * Estas son las rutas que el backend YA expone, con su version en la
   * URL: el controlador declara api/v{version}/[controller].
   */
  autenticacion: {
    registrar: '/api/v1/Usuarios',
    registrarRefugio: '/api/v1/Usuarios/registro-refugio',
    confirmarCorreo: '/api/v1/Usuarios/confirmar',
    reenviarVerificacion: '/api/v1/Usuarios/reenviar-verificacion',
    login: '/api/v1/Auth/login',
    refrescar: '/api/v1/Auth/refresh',
    logout: '/api/v1/Auth/logout',
    // Recuperación implementada en UsuariosController.
    olvideContrasena: '/api/v1/Usuarios/recuperar',
    restablecer: '/api/v1/Usuarios/restablecer',
  },
  /**
   * Refugios y los módulos de adopción siguen pendientes; perfiles, mascotas y catálogos
   * ya usa su controlador versionado. Cuando Mateo
   * cree cada controlador, la ruta queda /api/v1/<Controlador>; mientras
   * tanto solo las usa el modo demo.
   */
  usuarios: {
    base: '/api/usuarios',
    porId: (id: number) => `/api/usuarios/${id}`,
    yo: '/api/v1/Usuarios/perfil',
    misDatos: '/api/v1/Usuarios/perfil',
    perfilAdoptante: '/api/v1/Usuarios/perfil-adoptante',
    cambiarRol: (id: number) => `/api/usuarios/${id}/rol`,
    desactivar: (id: number) => `/api/usuarios/${id}/desactivar`,
  },
  // Contrato del demo. ServicioRefugios adapta el backend real versionado.
  refugios: {
    base: '/api/refugios',
    porId: (id: number) => `/api/refugios/${id}`,
    solicitarRegistro: '/api/refugios/solicitar-registro',
    verificar: (id: number) => `/api/refugios/${id}/verificar`,
    rechazar: (id: number) => `/api/refugios/${id}/rechazar`,
    suspender: (id: number) => `/api/refugios/${id}/suspender`,
    requisitos: (id: number) => `/api/refugios/${id}/requisitos`,
    calificaciones: (id: number) => `/api/v1/Refugios/${id}/calificaciones`,
    calificacion: (id: number, calificacionId: number) => `/api/v1/Refugios/${id}/calificaciones/${calificacionId}`,
  },
  mascotas: {
    base: '/api/v1/Mascotas',
    inventario: '/api/v1/Mascotas/refugio/inventario',
    porId: (id: number) => `/api/v1/Mascotas/${id}`,
    cambiarEstado: (id: number) => `/api/v1/Mascotas/${id}/estado`,
    multimedia: (id: number) => `/api/v1/Mascotas/${id}/multimedia`,
    historialClinico: (id: number) => `/api/v1/Mascotas/${id}/historial`,
    compartir: (id: number) => `/api/v1/Mascotas/${id}/compartir`,
    recomendaciones: '/api/v1/Mascotas/recomendaciones',
    favoritos: '/api/v1/Favoritos',
    favoritoPorMascota: (id: number) => `/api/v1/Favoritos/${id}`,
  },
  catalogos: {
    especies: '/api/v1/Catalogos/especies',
    razas: '/api/v1/Catalogos/razas',
    tamanos: '/api/v1/Catalogos/tamanos',
    colores: '/api/v1/Catalogos/colores',
    temperamentos: '/api/v1/Catalogos/temperamentos',
  },
  solicitudes: {
    base: '/api/solicitudes',
    porId: (id: number) => `/api/solicitudes/${id}`,
    mias: '/api/solicitudes/mias',
    validar: '/api/solicitudes/validar',
    aprobar: (id: number) => `/api/solicitudes/${id}/aprobar`,
    rechazar: (id: number) => `/api/solicitudes/${id}/rechazar`,
    cancelar: (id: number) => `/api/solicitudes/${id}/cancelar`,
    finalizar: (id: number) => `/api/solicitudes/${id}/finalizar`,
    soportes: (id: number) => `/api/solicitudes/${id}/soportes`,
    lineaTiempo: (id: number) => `/api/solicitudes/${id}/linea-tiempo`,
    visitas: '/api/visitas',
  },
  adopciones: {
    /** Backend real (85757de). */
    postular: '/api/v1/Adopciones',
    finalizar: (id: number) => `/api/v1/Adopciones/${id}/finalizar`,
    agendarVisita: (id: number) => `/api/v1/Adopciones/${id}/agendar-visita`,
    confirmarVisita: (id: number) => `/api/v1/Adopciones/${id}/confirmar-visita`,
    soportes: (id: number) => `/api/v1/Adopciones/${id}/soportes`,
    constanciaPdf: (id: number) => `/api/v1/Adopciones/${id}/constancia`,
    misSolicitudes: '/api/v1/Adopciones/mis-solicitudes',
    bandeja: '/api/v1/Adopciones/refugio/bandeja',
    aprobar: (id: number) => `/api/v1/Adopciones/${id}/aprobar`,
    rechazar: (id: number) => `/api/v1/Adopciones/${id}/rechazar`,
    base: '/api/adopciones',
    constancia: (id: number) => `/api/adopciones/${id}/constancia`,
  },
  necesidades: {
    base: '/api/v1/Necesidades',
    porId: (id: number) => `/api/v1/Necesidades/${id}`,
    porRefugio: (refugioId: number) => `/api/v1/Necesidades/refugio/${refugioId}`,
    cubrir: (id: number) => `/api/v1/Necesidades/${id}/cubrir`,
  },
  apadrinamientos: {
    base: '/api/v1/Apadrinamientos',
    mios: '/api/v1/Apadrinamientos/mis-apadrinamientos',
    refugio: '/api/v1/Apadrinamientos/refugio',
    gestionar: (id: number) => `/api/v1/Apadrinamientos/${id}/gestionar`,
    cancelar: (id: number) => `/api/v1/Apadrinamientos/${id}/cancelar`,
  },
  trazabilidad: {
    solicitud: (id: number) => `/api/v1/Trazabilidad/solicitudes/${id}`,
    mascota: (id: number) => `/api/v1/Trazabilidad/mascotas/${id}`,
    auditoria: '/api/v1/Trazabilidad/auditoria',
  },
  seguimientos: {
    plan: (adopcionId: number) => `/api/v1/Seguimientos/adopcion/${adopcionId}/plan`,
    reporte: (id: number) => `/api/v1/Seguimientos/${id}/reporte`,
    evaluar: (id: number) => `/api/v1/Seguimientos/${id}/evaluar`,
  },
  reportes: {
    base: '/api/reportes',
    porId: (id: number) => `/api/reportes/${id}`,
    mios: '/api/reportes/mios',
    mapa: '/api/reportes/mapa',
    tomar: (id: number) => `/api/reportes/${id}/tomar`,
    cambiarEstado: (id: number) => `/api/reportes/${id}/estado`,
    crearFicha: (id: number) => `/api/reportes/${id}/crear-ficha`,
    canalesDenuncia: '/api/reportes/canales-denuncia',
  },
  notificaciones: {
    base: '/api/v1/Notificaciones',
    leer: (id: number) => `/api/v1/Notificaciones/${id}/leer`,
  },
  administracion: {
    denuncias: '/api/denuncias',
    resolverDenuncia: (id: number) => `/api/denuncias/${id}/resolver`,
    moderarOcultar: '/api/moderacion/ocultar',
    moderarRestaurar: '/api/moderacion/restaurar',
    configuracion: '/api/configuracion',
    politica: '/api/configuracion/politica',
    dashboardRefugio: (id: number) => `/api/indicadores/refugios/${id}`,
    dashboardGeneral: '/api/indicadores/general',
  },
} as const;
