/**
 * Cliente que responde con datos simulados en vez de llamar al backend.
 *
 * Extiende ClienteApi y sobrescribe unicamente peticion(): como get, post,
 * put y delete pasan todos por ahi, con eso basta. Los servicios no se
 * enteran del cambio.
 */

import { ClienteApi, ErrorHttp, type ConfiguracionCliente } from '../api/client';
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

  constructor(config: ConfiguracionCliente) {
    super(config);
  }

  override async peticion<T>(ruta: string, opciones: OpcionesPeticion = {}): Promise<T> {
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

    if (ruta.endsWith('/autenticacion/login') && metodo === 'POST') {
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
      return {
        token: `demo.${encontrado.rol}.${Date.now()}`,
        expiraEn: new Date(Date.now() + 86_400_000).toISOString(),
        usuario: usuarioDemo(encontrado.rol),
      };
    }

    if (ruta.endsWith('/autenticacion/logout')) {
      this.nivelActual = null;
      return undefined;
    }

    if (ruta.endsWith('/autenticacion/registrar')) {
      return usuarioDemo(NivelRol.Adoptante);
    }

    if (ruta.includes('/autenticacion/')) return undefined;

    /* ---------- Usuario de la sesion ---------- */

    if (ruta.endsWith('/usuarios/yo')) {
      if (this.nivelActual === null) {
        throw new ErrorHttp({ titulo: 'Sesión no iniciada', estadoHttp: 401 });
      }
      return usuarioDemo(this.nivelActual);
    }

    /* ---------- Catalogos ---------- */

    if (ruta.endsWith('/catalogos/especies')) return ESPECIES;
    if (ruta.endsWith('/catalogos/razas')) {
      const especieId = parametros?.especieId;
      return especieId ? RAZAS.filter((r) => r.especieId === Number(especieId)) : RAZAS;
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
      if (parametros?.especieId) {
        const especie = ESPECIES.find((e) => e.id === Number(parametros.especieId))?.nombre;
        lista = lista.filter((m) => m.especie === especie);
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
