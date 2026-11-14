import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Cake,
  Eye,
  EyeOff,
  HeartHandshake,
  House,
  ImageOff,
  Mars,
  PawPrint,
  ShieldCheck,
  Tag,
  Venus,
  type LucideIcon,
} from 'lucide-react';
import { ErrorHttp, EstadoMascota, ESTADO_MASCOTA, ETIQUETA_SEXO, Procedencia, Sexo, type CrearMascotaDto, type FichaMascotaPublica } from '@huellitas/shared';
import { Pencil } from 'lucide-react';
import { usarEspecies, usarRazas } from '@/casos/catalogos';
import { FormularioMascota } from './FormularioMascota';
import { SubirFotos } from './SubirFotos';
import { FotosPorUrl } from './FotosPorUrl';
import { api } from '@/lib/api';
import { clavesMascotas } from '@/casos/mascotas';
import { Encabezado } from '@/componentes/layout/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { EstadoError } from '@/componentes/ui/EstadoError';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import '@/modulos/cuenta/cuenta.css';
import './mascotas.css';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);

const volver = (
  <Link to="/mascotas" className="boton boton--secundario">
    ← Volver a mascotas
  </Link>
);

/**
 * Gestionar una mascota publicada (backend real).
 *
 * Misma composicion que Mi cuenta: a la izquierda las fotos, a la derecha
 * quien es y su disponibilidad. "Editar" cambia la vista por el formulario
 * con sus datos y fotos (PUT /api/v1/Mascotas/{id}).
 */
export function FichaGestion({ id }: { id: number }) {
  const valido = Number.isSafeInteger(id) && id > 0;
  const [editando, setEditando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const ficha = useQuery({
    queryKey: ['ficha-real', id],
    queryFn: () => api.mascotas.obtenerFicha(id),
    enabled: valido,
    retry: false,
  });

  return (
    <>
      <Encabezado
        titulo={ficha.data ? (editando ? `Editar a ${ficha.data.nombre}` : ficha.data.nombre) : 'Gestionar mascota'}
        resumen={ficha.data ? (editando ? 'Actualiza sus datos y sus fotos. Los cambios se ven en el catálogo al guardar.' : 'Consulta su ficha, edítala o decide si sigue visible en el catálogo.') : undefined}
        acciones={<>{ficha.data && !editando && <Boton variante="primario" onClick={() => { setMensaje(''); setEditando(true); window.scrollTo({ top: 0 }); }}><Pencil size={16} strokeWidth={1.75} aria-hidden="true" /> Editar mascota</Boton>}{volver}</>}
      />
      {mensaje && !editando && <p role="status" className="mascotas-mensaje">{mensaje}</p>}
      {!valido ? (
        <EstadoVacio
          ilustracion="confundido"
          titulo="No encontramos esa mascota"
          descripcion="Vuelve al listado y selecciona una mascota válida."
          accion={volver}
        />
      ) : ficha.isPending ? (
        <EstadoCargando mensaje="Cargando ficha…" />
      ) : ficha.isError ? (
        <EstadoError
          titulo="No pudimos consultar la ficha"
          error={ficha.error}
          alReintentar={() => void ficha.refetch()}
          reintentando={ficha.isFetching}
          accionExtra={volver}
        />
      ) : editando ? (
        <EditarFicha ficha={ficha.data} alTerminar={guardado => { setEditando(false); if (guardado) setMensaje('Los cambios se guardaron.'); window.scrollTo({ top: 0 }); }} />
      ) : (
        <div className="cuenta ficha">
          {/* Izquierda las fotos y la disponibilidad; derecha quien es. */}
          <div className="cuenta__columna">
            <GaleriaFicha nombre={ficha.data.nombre} fotos={ficha.data.fotos} />
            <DisponibilidadFicha ficha={ficha.data} />
          </div>
          <DatosFicha ficha={ficha.data} />
        </div>
      )}
    </>
  );
}

function GaleriaFicha({ nombre, fotos }: { nombre: string; fotos: readonly string[] }) {
  const [actual, setActual] = useState(0);
  const foto = fotos[Math.min(actual, fotos.length - 1)];

  return (
    <section className="cuenta__tarjeta ficha__galeria" aria-label={`Fotos de ${nombre}`}>
      {foto ? (
        <div className="ficha__foto">
          {/* Fondo desenfocado: la foto se ve completa sin franjas vacías. */}
          <img className="ficha__foto-fondo" src={foto} alt="" aria-hidden="true" referrerPolicy="no-referrer" />
          <img
            className="ficha__foto-principal"
            src={foto}
            alt={`Foto ${actual + 1} de ${fotos.length} de ${nombre}`}
            referrerPolicy="no-referrer"
          />
          {actual === 0 && <span className="ficha__foto-etiqueta">Foto principal</span>}
        </div>
      ) : (
        <div className="ficha__foto ficha__foto--vacia">
          <ImageOff size={32} strokeWidth={1.5} aria-hidden="true" />
          <p>{nombre} todavía no tiene fotos.</p>
        </div>
      )}

      {fotos.length > 1 && (
        <ul className="ficha__miniaturas" aria-label="Elegir foto">
          {fotos.map((url, i) => (
            <li key={`${url}-${i}`}>
              <button
                type="button"
                className={`ficha__miniatura${i === actual ? ' ficha__miniatura--activa' : ''}`}
                aria-pressed={i === actual}
                aria-label={`Ver foto ${i + 1}`}
                onClick={() => setActual(i)}
              >
                <img src={url} alt="" referrerPolicy="no-referrer" loading="lazy" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function DatosFicha({ ficha }: { ficha: FichaMascotaPublica }) {
  const edad =
    ficha.edadAproximada === null
      ? 'No especificada'
      : `${ficha.edadAproximada} ${ficha.edadAproximada === 1 ? 'año' : 'años'}`;

  return (
    <section className="cuenta__tarjeta" aria-labelledby="ficha-nombre">
        <div className="cuenta__perfil">
          <span className="cuenta__avatar" aria-hidden="true">
            <PawPrint size={24} strokeWidth={1.75} />
          </span>
          <div className="cuenta__identidad">
            <h2 id="ficha-nombre" className="cuenta__nombre">{ficha.nombre}</h2>
            <Insignia estado={ESTADO_MASCOTA[ficha.estado]} />
          </div>
        </div>

        <dl className="cuenta__datos ficha__datos">
          <Dato icono={PawPrint} etiqueta="Especie" valor={ficha.especie || 'Sin especie'} />
          <Dato icono={Tag} etiqueta="Raza" valor={ficha.raza ?? 'Sin raza definida'} />
          <Dato icono={ficha.sexo === Sexo.Hembra ? Venus : Mars} etiqueta="Sexo" valor={ETIQUETA_SEXO[ficha.sexo]} />
          <Dato icono={Cake} etiqueta="Edad aproximada" valor={edad} />
          <Dato icono={ShieldCheck} etiqueta="Esterilización" valor={ficha.esterilizada ? (ficha.sexo === Sexo.Hembra ? 'Esterilizada' : 'Esterilizado') : 'Sin esterilizar'} />
          {ficha.refugioNombre && <Dato icono={House} etiqueta="Refugio" valor={ficha.refugioNombre} />}
        </dl>

        <div className="ficha__descripcion">
          <h3 className="cuenta__subtitulo">Sobre {ficha.nombre}</h3>
          <p>{ficha.descripcion?.trim() || 'Esta ficha todavía no tiene descripción.'}</p>
        </div>
    </section>
  );
}

function DisponibilidadFicha({ ficha }: { ficha: FichaMascotaPublica }) {
  const cache = useQueryClient();
  const [destino, setDestino] = useState<EstadoMascota>();
  const [motivo, setMotivo] = useState('');
  const [mensaje, setMensaje] = useState('');

  const cambio = useMutation({
    mutationFn: () => api.mascotas.cambiarEstado(ficha.id, { nuevoEstado: destino!, motivo }),
    onSuccess: async () => {
      setMensaje(destino === EstadoMascota.NoDisponible ? 'La publicación quedó desactivada.' : 'La publicación volvió al catálogo.');
      setDestino(undefined);
      setMotivo('');
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['ficha-real', ficha.id] }),
        cache.invalidateQueries({ queryKey: clavesMascotas.todo }),
      ]);
    },
  });

  function abrir(estado: EstadoMascota) {
    cambio.reset();
    setMensaje('');
    setMotivo('');
    setDestino(estado);
  }

  const visible = ficha.estado === EstadoMascota.Disponible;
  const pausada = ficha.estado === EstadoMascota.NoDisponible;
  const desactivar = destino === EstadoMascota.NoDisponible;

  return (
    <>
      <section className="cuenta__tarjeta" aria-labelledby="ficha-disponibilidad">
        <div>
          <h2 id="ficha-disponibilidad" className="cuenta__titulo">Disponibilidad</h2>
          <p className="cuenta__descripcion">
            {visible
              ? 'Aparece en el catálogo y las personas pueden postularse.'
              : pausada
                ? 'Está oculta del catálogo. Nadie puede postularse mientras siga así.'
                : 'Tiene un proceso de adopción en curso o ya fue adoptada, así que su disponibilidad no se cambia desde aquí.'}
          </p>
        </div>

        {(visible || pausada) && (
          <div className="ficha__estado">
            <span className={`ficha__estado-icono${visible ? '' : ' ficha__estado-icono--pausa'}`} aria-hidden="true">
              {visible ? <Eye size={20} strokeWidth={1.75} /> : <EyeOff size={20} strokeWidth={1.75} />}
            </span>
            <span className="ficha__estado-texto">{visible ? 'Publicada en el catálogo' : 'Publicación desactivada'}</span>
            {visible ? (
              <Boton variante="peligro" onClick={() => abrir(EstadoMascota.NoDisponible)}>Desactivar</Boton>
            ) : (
              <Boton variante="primario" onClick={() => abrir(EstadoMascota.Disponible)}>Reactivar</Boton>
            )}
          </div>
        )}
        {!visible && !pausada && (
          <div className="ficha__estado">
            <span className="ficha__estado-icono" aria-hidden="true">
              <HeartHandshake size={20} strokeWidth={1.75} />
            </span>
            <span className="ficha__estado-texto">{ESTADO_MASCOTA[ficha.estado].etiqueta}</span>
          </div>
        )}

        {mensaje && <p className="cuenta__ok" role="status">{mensaje}</p>}
      </section>

      {destino !== undefined && (
        <Modal
          titulo={desactivar ? 'Desactivar publicación' : 'Reactivar publicación'}
          compacto
          ocupado={cambio.isPending}
          alCerrar={() => setDestino(undefined)}
        >
          <p>
            {desactivar
              ? `${ficha.nombre} dejará de aparecer en el catálogo hasta que la reactives.`
              : `${ficha.nombre} volverá a aparecer en el catálogo y podrán postularse.`}
          </p>
          {desactivar && (
            <label className="campo">
              Motivo
              <textarea
                className="campo__control"
                value={motivo}
                placeholder="Por ejemplo: está en tratamiento veterinario"
                onChange={(e) => setMotivo(e.target.value)}
              />
            </label>
          )}
          {cambio.isError && <p role="alert" className="campo__error">{errorTexto(cambio.error)}</p>}
          <div className="publicacion-navegacion">
            <Boton disabled={cambio.isPending} onClick={() => setDestino(undefined)}>Cancelar</Boton>
            <Boton
              variante={desactivar ? 'peligro' : 'primario'}
              cargando={cambio.isPending}
              disabled={desactivar && !motivo.trim()}
              onClick={() => cambio.mutate()}
            >
              {desactivar ? 'Desactivar' : 'Reactivar'}
            </Boton>
          </div>
        </Modal>
      )}
    </>
  );
}

function Dato({ icono: Icono, etiqueta, valor }: { icono: LucideIcon; etiqueta: string; valor: string }) {
  return (
    <div className="cuenta__dato">
      <Icono className="cuenta__dato-icono" size={18} strokeWidth={1.75} aria-hidden="true" />
      <div>
        <dt>{etiqueta}</dt>
        <dd>{valor}</dd>
      </div>
    </div>
  );
}

/**
 * Edición real. ActualizarMascotaDTO no recibe especie ni procedencia, y
 * si se envían fotos el backend reemplaza todas (lista vacía = conserva).
 */
function EditarFicha({ ficha, alTerminar }: { ficha: FichaMascotaPublica; alTerminar: (guardado: boolean) => void }) {
  const cache = useQueryClient();
  const especies = usarEspecies();
  const especieId = ficha.especieId ?? especies.data?.find(e => e.nombre === ficha.especie)?.id ?? 0;
  const razas = usarRazas(especieId || undefined);
  const [fotos, setFotos] = useState<string[]>([...ficha.fotos]);
  const [subiendo, setSubiendo] = useState(false);
  const [errorFotos, setErrorFotos] = useState('');

  const guardar = useMutation({
    mutationFn: (datos: CrearMascotaDto) => api.mascotas.actualizar(ficha.id, { ...datos, fotosUrls: fotos }),
    onSuccess: async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ['ficha-real', ficha.id] }),
        cache.invalidateQueries({ queryKey: clavesMascotas.todo }),
      ]);
      alTerminar(true);
    },
  });

  // Sin los ids en el detalle (backend viejo) se buscan por nombre; tamaño y color quedan por elegir.
  const faltanIds = ficha.tamanoId === undefined || ficha.colorId === undefined;
  const listo = ficha.especieId !== undefined || especies.isSuccess;
  const razasListas = ficha.razaId !== undefined || !ficha.raza || razas.isSuccess || !especieId;
  if (!listo || !razasListas) return <EstadoCargando mensaje="Preparando el formulario…" />;
  const razaId = ficha.razaId ?? razas.data?.find(r => r.nombre === ficha.raza)?.id;

  const iniciales: CrearMascotaDto = {
    nombre: ficha.nombre, especieId, razaId: razaId ?? undefined,
    tamanoId: ficha.tamanoId ?? 0, colorId: ficha.colorId ?? 0, sexo: ficha.sexo,
    edadAproximada: ficha.edadAproximada ?? undefined, descripcion: ficha.descripcion ?? '',
    esterilizada: ficha.esterilizada, procedencia: Procedencia.Rescate,
    fechaIngreso: new Date().toLocaleDateString('sv-SE'), temperamentoIds: [],
  };

  function enviar(datos: CrearMascotaDto) {
    if (subiendo) { setErrorFotos('Espera a que terminen de subir las fotos.'); return; }
    if (ficha.fotos.length > 0 && fotos.length === 0) { setErrorFotos('Deja al menos una foto. El servidor no permite quitarlas todas.'); return; }
    setErrorFotos('');
    guardar.mutate(datos);
  }

  return (
    <div className="mascota-gestion">
      <section className="publicacion-revision" aria-labelledby="editar-fotos">
        <h2 id="editar-fotos">Fotos</h2>
        <p className="multimedia__ayuda">Agrega, quita o cambia la foto principal. Se guardan junto con los datos al pulsar "Guardar cambios".</p>
        <SubirFotos fotos={fotos} alActividad={setSubiendo} alCambiar={f => { setFotos(f); setErrorFotos(''); }} />
        <FotosPorUrl deshabilitado={subiendo || guardar.isPending} fotos={fotos} alCambiar={f => { setFotos(f); setErrorFotos(''); }} />
        {errorFotos && <p role="alert" className="campo__error">{errorFotos}</p>}
      </section>
      {faltanIds && <p className="publicacion-aviso">El servidor no indicó el tamaño y el color actuales: elígelos de nuevo antes de guardar.</p>}
      <FormularioMascota modoReal asistente={false} datosIniciales={iniciales} especieFija={ficha.especie}
        guardandoExterno={guardar.isPending} alGuardarLocal={enviar} alCancelar={() => alTerminar(false)} />
      {guardar.isError && <p role="alert" className="campo__error">{errorTexto(guardar.error)}</p>}
    </div>
  );
}
