import { MODO_DEMO } from '@/lib/api';
import './multimedia.css';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import './mascotas.css';
import {
  ESTADO_MASCOTA,
  NivelRol,
  EstadoMascota,
  Sexo,
  formatearFecha,
  tiempoRelativo,
  type FiltroMascota,
} from '@huellitas/shared';
import { usarEspecies, usarRazas, usarTamanos } from '@/casos/catalogos';
import { usarMascotas } from '@/casos/mascotas';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { Insignia } from '@/componentes/ui/Insignia';
import { SelectorCatalogo } from '@/componentes/ui/SelectorCatalogo';
import '@/estilos/tabla.css';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';

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
  const { data, isLoading, isFetching, isError, error, refetch } = usarMascotas({ ...filtro, ...(MODO_DEMO && esRefugio && usuario?.refugioId ? { refugioId: usuario.refugioId } : {}) }, esRefugio);
  const { data: especies, isFetching: cargandoEspecies, isError: errorEspecies, refetch: recargarEspecies } = usarEspecies();
  const { data: razas, isFetching: cargandoRazas, isError: errorRazas, refetch: recargarRazas } = usarRazas(filtro.especieId);

  const tamanos = usarTamanos();
  const hayFiltro =
    filtro.texto !== undefined ||
    filtro.estado !== undefined ||
    filtro.especieId !== undefined ||
    filtro.razaId !== undefined || filtro.tamanoId !== undefined || filtro.sexo !== undefined;

  // Cuantos filtros de los desplegables estan puestos (sin contar la
  // busqueda, que siempre esta a la vista). Va en el boton de celular.
  const filtrosActivos = [filtro.estado, filtro.especieId, filtro.razaId, filtro.tamanoId, filtro.sexo]
    .filter((valor) => valor !== undefined).length;
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false);
  const limpiarFiltros = () => setFiltro((previo) => ({ ...FILTRO_INICIAL, texto: previo.texto }));

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
      {(MODO_DEMO || !esRefugio) && <div className="filtros filtros--plegables">
        {MODO_DEMO && (
          <div className="filtros__busqueda">
            <label className="visualmente-oculto" htmlFor="buscar-mascota">
              Buscar por nombre
            </label>
            <Search className="filtros__lupa" size={18} strokeWidth={1.75} aria-hidden="true" />
            <input
              id="buscar-mascota"
              className="filtro-select"
              type="search"
              placeholder="Buscar por nombre"
              value={filtro.texto ?? ''}
              onChange={(evento) =>
                cambiar({ texto: evento.target.value.trim() || undefined })
              }
            />
          </div>
        )}

        {/* Solo en celular: abre y cierra el panel con los desplegables. */}
        <button
          type="button"
          className={`filtros__alternar${filtrosActivos ? ' filtros__alternar--activo' : ''}`}
          aria-expanded={filtrosAbiertos}
          aria-controls="filtros-mascotas"
          onClick={() => setFiltrosAbiertos((abierto) => !abierto)}
        >
          <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
          Filtros
          {filtrosActivos > 0 && (
            <span className="filtros__cuenta" aria-label={`${filtrosActivos} activos`}>{filtrosActivos}</span>
          )}
        </button>

        <div id="filtros-mascotas" className={`filtros__panel${filtrosAbiertos ? ' filtros__panel--abierto' : ''}`}>
        <SelectorCatalogo
          id="filtro-especie"
          etiqueta="Especie"
          opciones={especies}
          cargando={cargandoEspecies}
          errorCarga={errorEspecies}
          alReintentar={() => void recargarEspecies()}
          valor={filtro.especieId}
          textoVacio="Todas"
          // Al cambiar de especie la raza deja de tener sentido: un
          // filtro de "Siames" sobre perros no devolveria nada y pareceria
          // que no hay mascotas.
          alCambiar={(especieId) => cambiar({ especieId, razaId: undefined })}
        />

        {!MODO_DEMO && <><SelectorCatalogo id="filtro-tamano" etiqueta="Tamaño" opciones={tamanos.data} valor={filtro.tamanoId} alCambiar={tamanoId=>cambiar({tamanoId})} cargando={tamanos.isFetching} errorCarga={tamanos.isError} alReintentar={()=>void tamanos.refetch()} textoVacio="Todos" /><div className="campo"><label className="campo__etiqueta" htmlFor="filtro-sexo">Sexo</label><select id="filtro-sexo" className="filtro-select" value={filtro.sexo ?? ''} onChange={e=>cambiar({sexo:e.target.value === '' ? undefined : Number(e.target.value) as Sexo})}><option value="">Todos</option><option value={Sexo.Macho}>Macho</option><option value={Sexo.Hembra}>Hembra</option></select></div></>}
        {MODO_DEMO && <>
        <SelectorCatalogo
          id="filtro-raza"
          etiqueta="Raza"
          opciones={razas}
          cargando={cargandoRazas}
          errorCarga={errorRazas}
          alReintentar={() => void recargarRazas()}
          bloqueadoPor={
            filtro.especieId === undefined ? 'Elige especie' : undefined
          }
          valor={filtro.razaId}
          textoVacio="Todas"
          alCambiar={(razaId) => cambiar({ razaId })}
        />

        <div className="campo">
        <label className="campo__etiqueta" htmlFor="filtro-estado-mascota">
          Estado
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
          <option value="">Todos</option>
          {Object.entries(ESTADO_MASCOTA).map(([valor, descriptor]) => (
            <option key={valor} value={valor}>
              {descriptor.etiqueta}
            </option>
          ))}
        </select>
        </div>
        </>}
        {filtrosActivos > 0 && (
          <button type="button" className="filtros__limpiar" onClick={limpiarFiltros}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
            Limpiar
          </button>
        )}
        </div>
      </div>}

      {isLoading && <EstadoCargando mensaje="Cargando mascotas…" />}

      {isError && (
        <EstadoError
          titulo="No pudimos cargar las mascotas"
          error={error}
          alReintentar={() => void refetch()}
          reintentando={isFetching}
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
        <div className="mascotas-tabla"><table className="tabla tabla--tarjetas">
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
                (Date.now() - Date.parse(mascota.fechaUltimaActualizacion ?? '')) / 86_400_000,
              );
              const vencida = dias >= DIAS_PARA_ALERTA;

              return (
                <tr key={mascota.id}>
                  <td className="tabla__c-titulo">
                    <div className="mascota-miniatura">{mascota.fotoPrincipal && <img src={mascota.fotoPrincipal} alt={`Foto principal de ${mascota.nombre}`} loading="lazy" />}<div><span className="tabla__nombre">{mascota.nombre}</span>
                    <span className="tabla__detalle">
                      {[mascota.raza ?? 'Sin raza definida', mascota.tamano].filter(Boolean).join(' · ')}
                    </span></div></div>
                  </td>
                  <td className="tabla__detalle tabla__c-dato" data-etiqueta="Especie">{mascota.especie}</td>
                  <td className="tabla__detalle tabla__c-dato tabla__c-dato--fin" data-etiqueta="Refugio">{mascota.refugioNombre ?? (esRefugio ? 'Mi refugio' : 'Consultar ficha')}</td>
                  {/*
                    La encuesta dejó la información desactualizada como el
                    problema número uno (P4), así que no basta con mostrar
                    la fecha: hay que marcar cuándo ya pasó demasiado.
                  */}
                  <td className={`${vencida ? 'tabla__alerta' : 'tabla__detalle'} tabla__c-dato`}>
                    <span title={formatearFecha(mascota.fechaUltimaActualizacion)}>
                      {mascota.fechaUltimaActualizacion ? tiempoRelativo(mascota.fechaUltimaActualizacion) : 'Sin fecha de actualización'}
                    </span>
                  </td>
                  <td className="tabla__c-estado">
                    <Insignia estado={ESTADO_MASCOTA[mascota.estado]} />
                  </td>
                  {esRefugio && <td className="tabla__c-accion"><Link className="boton boton--primario mascota-enlace" to={`/mascotas/${mascota.id}/editar`}>{mascota.estado === EstadoMascota.Borrador ? 'Continuar publicación' : 'Gestionar'}<span className="visualmente-oculto"> a {mascota.nombre}</span></Link></td>}
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
