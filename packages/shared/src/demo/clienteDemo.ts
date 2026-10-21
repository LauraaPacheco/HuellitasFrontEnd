/**
 * Cliente que responde con datos simulados en vez de llamar al backend.
 *
 * Extiende ClienteApi y sobrescribe unicamente peticion(): como get, post,
 * put y delete pasan todos por ahi, con eso basta. Los servicios no se
 * enteran del cambio.
 */

import { ClienteApi, ErrorHttp, type ConfiguracionCliente } from '../api/client';
import type { Usuario, PerfilAdoptanteDto, EditarPerfilDto } from '../types/usuarios';
import { validarDatosPersonales, validarPerfilAdoptante } from '../utils/perfil';
import { NivelRol } from '../types/enums';
import type { Paginado } from '../types/comun';
import {
  COLORES,
  CONTRASENA_DEMO,
  ESPECIES,
  RAZAS,
  REFUGIOS,
  REPORTES,
  TAMANOS,
  TEMPERAMENTOS,
  USUARIOS_DEMO,
  lineaTiempo,
  mascotaCompleta,
  mascotasResumen,
  solicitudCompleta,
  solicitudesResumen,
  usuarioDemo,
} from './datos';

/** Simula la latencia de una red real, para que la UI muestre sus estados de carga. */
const RETARDO_MS = 320;

function esperar<T>(valor: T): Promise<T> {
  return new Promise((resolver) => setTimeout(() => resolver(valor), RETARDO_MS));
}

function paginar<T>(items: readonly T[], pagina = 1, tamano = 20): Paginado<T> {
  const inicio = (pagina - 1) * tamano;
  return {
    items: items.slice(inicio, inicio + tamano),
    pagina,
    tamanoPagina: tamano,
    total: items.length,
    totalPaginas: Math.max(1, Math.ceil(items.length / tamano)),
  };
}

interface OpcionesPeticion {
  readonly metodo?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  readonly cuerpo?: unknown;
  readonly parametros?: Record<string, unknown>;
  readonly senal?: AbortSignal;
}

export class ClienteDemo extends ClienteApi {
  /** Nivel del usuario con sesion iniciada; null si nadie entro. */
  private nivelActual: NivelRol | null = null;
  private readonly usuariosEditados = new Map<NivelRol, Usuario>();
  private readonly almacenDemo: ConfiguracionCliente['almacen'];

  private usuarioActual(): Usuario {
    if (this.nivelActual === null) throw new ErrorHttp({ titulo: 'Sesión no iniciada', estadoHttp: 401 });
    return this.usuariosEditados.get(this.nivelActual) ?? usuarioDemo(this.nivelActual);
  }

  constructor(config: ConfiguracionCliente) {
    super(config);
    this.almacenDemo = config.almacen;
  }

  override async peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
    // Al reabrir la app, recupera también el contexto del cliente demo.
    if (this.nivelActual === null && !ruta.includes('/Auth/')) {
      const token = await this.almacenDemo.obtener();
      const id = /^demo\.access\.(\d+)\./.exec(token ?? '')?.[1];
      const cuenta = USUARIOS_DEMO.find(u => usuarioDemo(u.rol).id === Number(id));
      if (cuenta) this.nivelActual = cuenta.rol;
    }
    const { metodo = 'GET', cuerpo, parametros } = opciones;
    const respuesta = this.resolver(ruta, metodo, cuerpo, parametros);
    return esperar(respuesta) as Promise<T>;
  }

  private resolver(
    ruta: string,
    metodo: string,
    cuerpo: unknown,
    parametros: Record<string, unknown> | undefined,
  ): unknown {
    const pagina = Number(parametros?.pagina ?? 1);
    const tamano = Number(parametros?.tamanoPagina ?? 20);

    /* ---------- Autenticacion ---------- */

    // El demo responde con las MISMAS formas que el backend real, para que
    // la traduccion de ../api/sesion.ts se ejercite igual en los dos modos.

    if (ruta.endsWith('/Auth/login') && metodo === 'POST') {
      const datos = cuerpo as { correo?: string; contrasena?: string };
      const encontrado = USUARIOS_DEMO.find(
        (u) => u.correo.toLowerCase() === datos.correo?.trim().toLowerCase(),
      );

      if (!encontrado || datos.contrasena !== CONTRASENA_DEMO) {
        throw new ErrorHttp({
          titulo: 'El correo o la contraseña no coinciden',
          estadoHttp: 401,
        });
      }

      this.nivelActual = encontrado.rol;
      const usuario = this.usuarioActual();
      return {
        accessToken: `demo.access.${usuario.id}.${Date.now()}`,
        refreshToken: `demo.refresh.${Date.now()}`,
        expiraEnSegundos: 900,
        nombre: usuario.nombre,
        rol: usuario.rol.nombre,
      };
    }

    if (ruta.endsWith('/Auth/refresh') && metodo === 'POST') {
      if (this.nivelActual === null) {
        throw new ErrorHttp({ titulo: 'Sesión no iniciada', estadoHttp: 401 });
      }
      const usuario = this.usuarioActual();
      return {
        accessToken: `demo.access.${usuario.id}.${Date.now()}`,
        refreshToken: `demo.refresh.${Date.now()}`,
        expiraEnSegundos: 900,
        nombre: usuario.nombre,
        rol: usuario.rol.nombre,
      };
    }

    if (ruta.endsWith('/Auth/logout')) {
      this.nivelActual = null;
      return undefined;
    }

    if (ruta.endsWith('/v1/Usuarios') && metodo === 'POST') {
      return { mensaje: 'Usuario registrado. Revisa tu correo.', usuarioId: 99 };
    }

    // Para poder ver las dos caras de la pantalla de confirmacion sin
    // backend: cualquier token sirve menos el literal 'vencido'.
    if (ruta.endsWith('/Usuarios/confirmar')) {
      const token = String(parametros?.token ?? '');
      if (!token || token === 'vencido') {
        throw new ErrorHttp({
          titulo: 'El enlace ya no sirve',
          estadoHttp: 400,
          detalle: 'El enlace de confirmación venció o ya fue usado.',
        });
      }
      return undefined;
    }

    if (ruta.endsWith('/Usuarios/reenviar-verificacion')) return undefined;

    // olvide-contrasena y restablecer: responden bien sin hacer nada,
    // en demo no hay correo que mandar.
    if (ruta.includes('/Auth/')) return undefined;

    /* ---------- Registro de refugio ---------- */

    if (ruta.endsWith('/refugios/solicitar-registro') && metodo === 'POST') {
      const datos = (cuerpo ?? {}) as { nombre?: string };
      return { ...REFUGIOS[0], nombre: datos.nombre ?? 'Refugio en revisión' };
    }

    /* ---------- Usuario de la sesion ---------- */

    if (ruta.endsWith('/usuarios/yo/datos-personales') && metodo === 'GET') {
      return this.usuarioActual();
    }

    if (ruta.endsWith('/usuarios/yo/perfil-adoptante') && metodo === 'PUT') {
      const usuario = this.usuarioActual();
      if (usuario.rol.nivel !== NivelRol.Adoptante) {
        throw new ErrorHttp({ titulo: 'Solo los adoptantes pueden editar este perfil', estadoHttp: 403 });
      }
      const datos = cuerpo as PerfilAdoptanteDto;
      const errores = validarPerfilAdoptante(datos);
      if (Object.keys(errores).length) throw new ErrorHttp({ titulo: 'Revisa tu perfil de adoptante', estadoHttp: 400 });
      const ahora = new Date().toISOString();
      const perfil = {
        id: usuario.perfil?.id ?? usuario.id,
        usuarioId: usuario.id,
        activo: true,
        fechaCreacion: usuario.perfil?.fechaCreacion ?? ahora,
        fechaModificacion: ahora,
        ...datos,
        espacioDisponible: datos.espacioDisponible.trim(),
        tiempoDisponible: datos.tiempoDisponible.trim(),
        porcentajeCompletitud: 100,
      };
      this.usuariosEditados.set(this.nivelActual!, { ...usuario, perfil, fechaModificacion: ahora });
      return perfil;
    }

    if (ruta.endsWith('/usuarios/yo')) {
      const usuario = this.usuarioActual();
      if (metodo === 'GET') return usuario;
      if (metodo === 'PUT') {
        const datos = cuerpo as EditarPerfilDto;
        const nuevos = { nombre: datos.nombre ?? usuario.nombre, telefono: datos.telefono ?? usuario.telefono ?? '' };
        if (Object.keys(validarDatosPersonales(nuevos)).length) throw new ErrorHttp({ titulo: 'Revisa tus datos personales', estadoHttp: 400 });
        const actualizado = {
          ...usuario,
          nombre: nuevos.nombre.trim(),
          telefono: nuevos.telefono.replace(/\s|-/g, ''),
          fechaModificacion: new Date().toISOString(),
        };
        this.usuariosEditados.set(this.nivelActual!, actualizado);
        return actualizado;
      }
    }

    /* ---------- Catalogos ---------- */

    if (ruta.endsWith('/catalogos/especies')) return ESPECIES;
    if (ruta.endsWith('/catalogos/razas')) {
      const especieId = parametros?.especieId;
      return especieId !== undefined ? RAZAS.filter((r) => r.especieId === Number(especieId)) : RAZAS;
    }
    if (ruta.endsWith('/catalogos/tamanos')) return TAMANOS;
    if (ruta.endsWith('/catalogos/colores')) return COLORES;
    if (ruta.endsWith('/catalogos/temperamentos')) return TEMPERAMENTOS;

    /* ---------- Mascotas ---------- */

    if (ruta.endsWith('/match/recomendadas')) {
      return mascotasResumen().slice(0, 3);
    }

    const coincideMascota = /\/api\/mascotas\/(\d+)$/.exec(ruta);
    if (coincideMascota) {
      const mascota = mascotaCompleta(Number(coincideMascota[1]));
      if (!mascota) {
        throw new ErrorHttp({ titulo: 'No encontramos esa mascota', estadoHttp: 404 });
      }
      return mascota;
    }

    if (ruta.endsWith('/api/mascotas')) {
      let lista = mascotasResumen();
      const texto = String(parametros?.texto ?? '').toLowerCase();
      if (texto) {
        lista = lista.filter(
          (m) =>
            m.nombre.toLowerCase().includes(texto) ||
            (m.raza ?? '').toLowerCase().includes(texto) ||
            m.especie.toLowerCase().includes(texto),
        );
      }
      if (parametros?.especieId !== undefined) {
        const especie = ESPECIES.find((e) => e.id === Number(parametros.especieId))?.nombre;
        lista = lista.filter((m) => m.especie === especie);
      }
      // El resumen trae la raza por nombre, no por id, asi que hay que
      // traducir el id igual que con la especie.
      if (parametros?.razaId !== undefined) {
        const raza = RAZAS.find((r) => r.id === Number(parametros.razaId))?.nombre;
        const especie = RAZAS.find((r) => r.id === Number(parametros.razaId))?.especieId;
        const nombreEspecie = ESPECIES.find((e) => e.id === especie)?.nombre;
        lista = lista.filter((m) => m.raza === raza && m.especie === nombreEspecie);
      }
      // !== undefined y no una comprobacion de verdad: EstadoMascota
      // empieza en Disponible = 0, asi que `if (parametros.estado)` se
      // saltaba el filtro justo para el estado mas comun.
      if (parametros?.estado !== undefined) {
        lista = lista.filter((m) => m.estado === Number(parametros.estado));
      }
      return paginar(lista, pagina, tamano);
    }

    if (ruta.endsWith('/api/favoritos')) return [];

    /* ---------- Solicitudes ---------- */

    const coincideLinea = /\/solicitudes\/(\d+)\/linea-tiempo$/.exec(ruta);
    if (coincideLinea) return lineaTiempo(Number(coincideLinea[1]));

    if (ruta.endsWith('/solicitudes/mias')) {
      // El adoptante demo tiene una sola solicitud en curso.
      return solicitudesResumen().filter((s) => s.id === 1);
    }

    if (ruta.endsWith('/solicitudes/validar')) {
      return { puedeContinuar: true, faltantes: [] };
    }

    const coincideSolicitud = /\/api\/solicitudes\/(\d+)$/.exec(ruta);
    if (coincideSolicitud) {
      const solicitud = solicitudCompleta(Number(coincideSolicitud[1]));
      if (!solicitud) {
        throw new ErrorHttp({ titulo: 'No encontramos esa solicitud', estadoHttp: 404 });
      }
      return solicitud;
    }

    if (ruta.endsWith('/api/solicitudes')) {
      if (metodo === 'POST') return solicitudCompleta(1);
      let lista = solicitudesResumen();
      if (parametros?.estado !== undefined && parametros.estado !== '') {
        lista = lista.filter((s) => s.estado === Number(parametros.estado));
      }
      return paginar(lista, pagina, tamano);
    }

    /* ---------- Reportes ---------- */

    if (ruta.endsWith('/reportes/canales-denuncia')) {
      return [
        'Policía Nacional — línea 123',
        'Secretaría de Salud Pública de Cali',
        'Fiscalía General de la Nación',
      ];
    }

    if (ruta.endsWith('/reportes/mios')) return REPORTES.slice(0, 2);
    if (ruta.endsWith('/reportes/mapa')) return REPORTES;

    if (ruta.endsWith('/api/reportes')) {
      if (metodo === 'POST') {
        const numero = `REP-0${190 + Math.floor(Math.random() * 9)}`;
        return { ...REPORTES[0], id: 99, numeroReporte: numero };
      }
      return paginar(REPORTES, pagina, tamano);
    }

    /* ---------- Refugios ---------- */

    const coincideRefugio = /\/api\/refugios\/(\d+)$/.exec(ruta);
    if (coincideRefugio) {
      const refugio = REFUGIOS.find((r) => r.id === Number(coincideRefugio[1]));
      if (!refugio) {
        throw new ErrorHttp({ titulo: 'No encontramos ese refugio', estadoHttp: 404 });
      }
      return refugio;
    }

    if (ruta.endsWith('/api/refugios')) return paginar(REFUGIOS, pagina, tamano);

    /* ---------- Notificaciones y seguimientos ---------- */

    if (ruta.includes('/notificaciones')) return [];
    if (ruta.includes('/seguimientos')) return [];

    /* ---------- Escrituras sin efecto ---------- */

    if (metodo !== 'GET') return undefined;

    throw new ErrorHttp({
      titulo: 'Esta pantalla todavía no tiene datos de demostración',
      detalle: `La ruta ${ruta} se resolverá cuando el backend esté conectado.`,
      estadoHttp: 501,
    });
  }
}
