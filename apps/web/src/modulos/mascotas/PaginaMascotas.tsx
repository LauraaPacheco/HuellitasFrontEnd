import './multimedia.css';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import './mascotas.css';
import {
  ESTADO_MASCOTA,
  NivelRol,
  EstadoMascota,
  formatearFecha,
  tiempoRelativo,
  type FiltroMascota,
} from '@huellitas/shared';
import { usarEspecies, usarRazas } from '@/casos/catalogos';
import { usarMascotas } from '@/casos/mascotas';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Insignia } from '@/componentes/ui/Insignia';
import { SelectorCatalogo } from '@/componentes/ui/SelectorCatalogo';
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
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  const esRefugio = usuario?.rol.nivel === NivelRol.Refugio;
  const publicar = esRefugio ? <Link className="boton boton--primario mascota-enlace" to="/mascotas/nueva">Publicar mascota</Link> : undefined;
  const [filtro, setFiltro] = useState<FiltroMascota>(FILTRO_INICIAL);
  const { data, isLoading, isFetching, isError } = usarMascotas({ ...filtro, ...(esRefugio && usuario?.refugioId ? { refugioId: usuario.refugioId } : {}) });
  const { data: especies, isFetching: cargandoEspecies, isError: errorEspecies, refetch: recargarEspecies } = usarEspecies();
  const { data: razas, isFetching: cargandoRazas, isError: errorRazas, refetch: recargarRazas } = usarRazas(filtro.especieId);

  const hayFiltro =
    filtro.texto !== undefined ||
    filtro.estado !== undefined ||
    filtro.especieId !== undefined ||
    filtro.razaId !== undefined;

  const cambiar = (parcial: Partial<FiltroMascota>) =>
    setFiltro((previo) => ({ ...previo, pagina: 1, ...parcial }));

  return (
    <>
      <Encabezado
        titulo="Mascotas"
        resumen={data ? `${data.total} fichas` : undefined}
        acciones={publicar}
      />

      {ubicacion.state?.mensaje && <p role="status" className="mascotas-mensaje">{ubicacion.state.mensaje}</p>}
      <div className="filtros">
        <label className="visualmente-oculto" htmlFor="buscar-mascota">
          Buscar por nombre
        </label>
        <input
          id="buscar-mascota"
          className="filtro-select filtros__busqueda"
          type="search"
          placeholder="Buscar por nombre"
          value={filtro.texto ?? ''}
          onChange={(evento) =>
            cambiar({ texto: evento.target.value.trim() || undefined })
          }
        />

        <SelectorCatalogo
          id="filtro-especie"
          etiqueta="Filtrar por especie"
          etiquetaOculta
          opciones={especies}
          cargando={cargandoEspecies}
          errorCarga={errorEspecies}
          alReintentar={() => void recargarEspecies()}
          valor={filtro.especieId}
          textoVacio="Todas las especies"
          // Al cambiar de especie la raza deja de tener sentido: un
          // filtro de "Siames" sobre perros no devolveria nada y pareceria
          // que no hay mascotas.
          alCambiar={(especieId) => cambiar({ especieId, razaId: undefined })}
        />

        <SelectorCatalogo
          id="filtro-raza"
          etiqueta="Filtrar por raza"
          etiquetaOculta
          opciones={razas}
          cargando={cargandoRazas}
          errorCarga={errorRazas}
          alReintentar={() => void recargarRazas()}
          bloqueadoPor={
            filtro.especieId === undefined ? 'Elige una especie' : undefined
          }
          valor={filtro.razaId}
          textoVacio="Todas las razas"
          alCambiar={(razaId) => cambiar({ razaId })}
        />

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
          accion={publicar}
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
        <div className="mascotas-tabla"><table className="tabla">
          <thead>
            <tr>
              <th scope="col">Mascota</th>
              <th scope="col">Especie</th>
              <th scope="col">Refugio</th>
              <th scope="col">Actualizada</th>
              <th scope="col">Estado</th>
              {esRefugio && <th scope="col">Acción</th>}
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
                    <div className="mascota-miniatura">{mascota.fotoPrincipal && <img src={mascota.fotoPrincipal} alt={`Foto principal de ${mascota.nombre}`} loading="lazy" />}<div><span className="tabla__nombre">{mascota.nombre}</span>
                    <span className="tabla__detalle">
                      {mascota.raza ?? 'Sin raza definida'} · {mascota.tamano}
                    </span></div></div>
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
                  {esRefugio && <td><Link className="boton boton--primario mascota-enlace" to={`/mascotas/${mascota.id}/editar`}>{mascota.estado === EstadoMascota.Borrador ? 'Continuar publicación' : 'Gestionar'}<span className="visualmente-oculto"> a {mascota.nombre}</span></Link></td>}
                </tr>
              );
            })}
          </tbody>
        </table></div>
      )}
      {data && data.totalPaginas > 1 && <nav className="mascota-acciones" aria-label="Paginación de mascotas">
        <Boton disabled={data.pagina <= 1 || isFetching} onClick={() => setFiltro(prev => ({ ...prev, pagina: (prev.pagina ?? 1) - 1 }))}>Anterior</Boton>
        <span>Página {data.pagina} de {data.totalPaginas}</span>
        <Boton disabled={data.pagina >= data.totalPaginas || isFetching} onClick={() => setFiltro(prev => ({ ...prev, pagina: (prev.pagina ?? 1) + 1 }))}>Siguiente</Boton>
      </nav>}
    </>
  );
}
