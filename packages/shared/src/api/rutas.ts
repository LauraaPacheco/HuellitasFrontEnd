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
   * Usuarios, refugios, mascotas y demás módulos siguen pendientes; catálogos
   * ya usa su controlador versionado. Cuando Mateo
   * cree cada controlador, la ruta queda /api/v1/<Controlador>; mientras
   * tanto solo las usa el modo demo.
   */
  usuarios: {
    base: '/api/usuarios',
    porId: (id: number) => `/api/usuarios/${id}`,
    yo: '/api/usuarios/yo',
    misDatos: '/api/usuarios/yo/datos-personales',
    perfilAdoptante: '/api/usuarios/yo/perfil-adoptante',
    cambiarRol: (id: number) => `/api/usuarios/${id}/rol`,
    desactivar: (id: number) => `/api/usuarios/${id}/desactivar`,
  },
  refugios: {
    base: '/api/refugios',
    porId: (id: number) => `/api/refugios/${id}`,
    solicitarRegistro: '/api/refugios/solicitar-registro',
    verificar: (id: number) => `/api/refugios/${id}/verificar`,
    rechazar: (id: number) => `/api/refugios/${id}/rechazar`,
    suspender: (id: number) => `/api/refugios/${id}/suspender`,
    requisitos: (id: number) => `/api/refugios/${id}/requisitos`,
    necesidades: '/api/necesidades',
    apadrinamientos: '/api/apadrinamientos',
    calificaciones: '/api/calificaciones',
    calificacionesPorRefugio: (id: number) => `/api/refugios/${id}/calificaciones`,
  },
  mascotas: {
    base: '/api/mascotas',
    porId: (id: number) => `/api/mascotas/${id}`,
    cambiarEstado: (id: number) => `/api/mascotas/${id}/estado`,
    multimedia: (id: number) => `/api/mascotas/${id}/multimedia`,
    historialClinico: (id: number) => `/api/mascotas/${id}/historial-clinico`,
    bitacora: (id: number) => `/api/mascotas/${id}/bitacora`,
    favoritos: '/api/favoritos',
    favoritoPorMascota: (id: number) => `/api/favoritos/${id}`,
    compatibilidad: (id: number) => `/api/match/mascotas/${id}`,
    recomendadas: '/api/match/recomendadas',
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
    base: '/api/adopciones',
    constancia: (id: number) => `/api/adopciones/${id}/constancia`,
  },
  seguimientos: {
    base: '/api/seguimientos',
    mios: '/api/seguimientos/mios',
    porAdopcion: (id: number) => `/api/adopciones/${id}/seguimientos`,
    reporte: (id: number) => `/api/seguimientos/${id}/reporte`,
    revisar: (id: number) => `/api/seguimientos/${id}/revisar`,
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
    base: '/api/notificaciones',
    noLeidas: '/api/notificaciones/no-leidas',
    marcarLeida: (id: number) => `/api/notificaciones/${id}/leida`,
  },
  administracion: {
    denuncias: '/api/denuncias',
    resolverDenuncia: (id: number) => `/api/denuncias/${id}/resolver`,
    moderarOcultar: '/api/moderacion/ocultar',
    moderarRestaurar: '/api/moderacion/restaurar',
    configuracion: '/api/configuracion',
    politica: '/api/configuracion/politica',
    auditoria: '/api/auditoria',
    dashboardRefugio: (id: number) => `/api/indicadores/refugios/${id}`,
    dashboardGeneral: '/api/indicadores/general',
  },
} as const;
