import { useState } from 'react';
import {
  ESTADO_MASCOTA,
  EstadoMascota,
  formatearFecha,
  tiempoRelativo,
  type FiltroMascota,
} from '@huellitas/shared';
import { usarEspecies, usarMascotas } from '@/casos/mascotas';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Insignia } from '@/componentes/ui/Insignia';
import '@/estilos/tabla.css';

/** Pasados estos días, la ficha se marca como desactualizada. */
const DIAS_PARA_ALERTA = 90;

const FILTRO_INICIAL: FiltroMascota = { pagina: 1, tamanoPagina: 20 };

/**
 * HU-MAS-01: el refugio ve y administra sus mascotas publicadas.
 *
 * La pantalla no sabe que existe HTTP: pide casos de uso. Toda la caché y
 * su invalidación viven en @/casos/mascotas.
 */
export function PaginaMascotas() {
  const [filtro, setFiltro] = useState<FiltroMascota>(FILTRO_INICIAL);
  const { data, isLoading, isError } = usarMascotas(filtro);
  const { data: especies } = usarEspecies();

  const hayFiltro =
    filtro.texto !== undefined ||
    filtro.estado !== undefined ||
    filtro.especieId !== undefined;

  const cambiar = (parcial: Partial<FiltroMascota>) =>
    setFiltro((previo) => ({ ...previo, pagina: 1, ...parcial }));

  return (
    <>
      <Encabezado
        titulo="Mascotas"
        resumen={data ? `${data.total} publicadas` : undefined}
        acciones={
          <Boton variante="primario">Publicar mascota</Boton>
        }
      />

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 'var(--space-2)',
          marginBottom: 'var(--space-5)',
        }}
      >
        <label className="visualmente-oculto" htmlFor="buscar-mascota">
          Buscar por nombre
        </label>
        <input
          id="buscar-mascota"
          className="filtro-select"
          style={{ flexGrow: 1, minWidth: 220 }}
          type="search"
          placeholder="Buscar por nombre"
          value={filtro.texto ?? ''}
          onChange={(evento) =>
            cambiar({ texto: evento.target.value.trim() || undefined })
          }
        />

        <label className="visualmente-oculto" htmlFor="filtro-especie">
          Filtrar por especie
        </label>
        <select
          id="filtro-especie"
          className="filtro-select"
          value={filtro.especieId ?? ''}
          onChange={(evento) =>
            cambiar({
              especieId: evento.target.value ? Number(evento.target.value) : undefined,
            })
          }
        >
          <option value="">Todas las especies</option>
          {especies?.map((especie) => (
            <option key={especie.id} value={especie.id}>
              {especie.nombre}
            </option>
          ))}
        </select>

        <label className="visualmente-oculto" htmlFor="filtro-estado-mascota">
          Filtrar por estado
        </label>
        <select
          id="filtro-estado-mascota"
          className="filtro-select"
          value={filtro.estado ?? ''}
          onChange={(evento) =>
            cambiar({
              estado: evento.target.value
                ? (Number(evento.target.value) as EstadoMascota)
                : undefined,
            })
          }
        >
          <option value="">Todos los estados</option>
          {Object.entries(ESTADO_MASCOTA).map(([valor, descriptor]) => (
            <option key={valor} value={valor}>
              {descriptor.etiqueta}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p style={{ color: 'var(--ink-muted)' }}>Cargando mascotas…</p>}

      {isError && (
        <EstadoVacio
          titulo="No pudimos cargar las mascotas"
          descripcion="Revisa tu conexión y vuelve a intentarlo."
        />
      )}

      {data && data.items.length === 0 && !hayFiltro && (
        <EstadoVacio
          ilustracion="durmiendo"
          titulo="Todavía no has publicado mascotas"
          descripcion="Publica la primera y aparecerá en el catálogo de la app."
          accion={<Boton variante="primario">Publicar mascota</Boton>}
        />
      )}

      {data && data.items.length === 0 && hayFiltro && (
        <EstadoVacio
          ilustracion="confundido"
          titulo="Ninguna mascota con esos filtros"
          descripcion="Prueba con otra búsqueda o míralas todas."
          accion={<Boton onClick={() => setFiltro(FILTRO_INICIAL)}>Ver todas</Boton>}
        />
      )}

      {data && data.items.length > 0 && (
        <table className="tabla">
          <thead>
            <tr>
              <th scope="col">Mascota</th>
              <th scope="col">Especie</th>
              <th scope="col">Refugio</th>
              <th scope="col">Actualizada</th>
              <th scope="col">Estado</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((mascota) => {
              const dias = Math.floor(
                (Date.now() - Date.parse(mascota.fechaUltimaActualizacion)) / 86_400_000,
              );
              const vencida = dias >= DIAS_PARA_ALERTA;

              return (
                <tr key={mascota.id}>
                  <td>
                    <span className="tabla__nombre">{mascota.nombre}</span>
                    <span className="tabla__detalle">
                      {mascota.raza ?? 'Sin raza definida'} · {mascota.tamano}
                    </span>
                  </td>
                  <td className="tabla__detalle">{mascota.especie}</td>
                  <td className="tabla__detalle">{mascota.refugioNombre}</td>
                  {/*
                    La encuesta dejó la información desactualizada como el
                    problema número uno (P4), así que no basta con mostrar
                    la fecha: hay que marcar cuándo ya pasó demasiado.
                  */}
                  <td className={vencida ? 'tabla__alerta' : 'tabla__detalle'}>
                    <span title={formatearFecha(mascota.fechaUltimaActualizacion)}>
                      {tiempoRelativo(mascota.fechaUltimaActualizacion)}
                    </span>
                  </td>
                  <td>
                    <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </>
  );
}
