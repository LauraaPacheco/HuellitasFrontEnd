import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FileText, Pill, Plus, ShieldCheck, Stethoscope, Syringe, type LucideIcon } from 'lucide-react';
import { ErrorHttp, ETIQUETA_TIPO_REGISTRO_CLINICO, TipoRegistroClinico, formatearFecha } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Modal } from '@/componentes/ui/Modal/Modal';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { SoporteVeterinario } from './SoporteVeterinario';
import '@/componentes/ui/Campo/campo.css';
import './mascotas.css';
import { CampoFecha } from '@/componentes/ui/CampoFecha/CampoFecha';

const errorTexto = (e: Error) => (e instanceof ErrorHttp ? e.detalle ?? e.message : e.message);
const TAMANO_PAGINA = 5;

const ICONOS: Record<TipoRegistroClinico, LucideIcon> = {
  [TipoRegistroClinico.Vacuna]: Syringe,
  [TipoRegistroClinico.Desparasitacion]: Pill,
  [TipoRegistroClinico.Esterilizacion]: ShieldCheck,
  [TipoRegistroClinico.Diagnostico]: Stethoscope,
  [TipoRegistroClinico.Tratamiento]: Pill,
};

const TIPOS = [
  TipoRegistroClinico.Vacuna,
  TipoRegistroClinico.Desparasitacion,
  TipoRegistroClinico.Esterilizacion,
  TipoRegistroClinico.Diagnostico,
  TipoRegistroClinico.Tratamiento,
];

/** Hoy en hora local como AAAA-MM-DD, para el tope del campo de fecha. */
function hoyLocal() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function hace30Anios() {
  const d = new Date();
  return `${d.getFullYear() - 30}-01-01`;
}

/**
 * HU-MAS-04: historial clínico de la mascota. El refugio dueño ve las
 * atenciones (más recientes primero) y registra nuevas; los adoptantes lo
 * ven en la ficha de la app.
 */
export function HistorialClinico({ mascotaId, nombre }: { mascotaId: number; nombre: string }) {
  const cache = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const historial = useQuery({
    queryKey: ['historial-clinico', mascotaId, pagina],
    queryFn: () => api.mascotas.historialClinico(mascotaId, { pagina, tamanoPagina: TAMANO_PAGINA }),
    retry: false,
    placeholderData: (previo) => previo,
  });

  return (
    <section className="cuenta__tarjeta historial" aria-labelledby="historial-titulo">
      <div className="historial__cabecera">
        <div>
          <h2 id="historial-titulo" className="cuenta__titulo">Historial clínico</h2>
          <p className="cuenta__descripcion">Vacunas, desparasitaciones y demás atenciones. Los adoptantes lo ven en la ficha.</p>
        </div>
        <Boton onClick={() => { setMensaje(''); setAbierto(true); }}>
          <Plus size={16} strokeWidth={2} aria-hidden="true" /> Registrar atención
        </Boton>
      </div>

      {mensaje && <p role="status" className="cuenta__ok">{mensaje}</p>}

      {historial.isPending ? (
        <EstadoCargando variante="compacto" mensaje="Cargando historial…" />
      ) : historial.isError ? (
        <p role="alert" className="campo__error">
          {errorTexto(historial.error)} <Boton onClick={() => void historial.refetch()}>Reintentar</Boton>
        </p>
      ) : historial.data.items.length === 0 ? (
        <p className="cuenta__aviso">Aún no hay atenciones registradas para {nombre}.</p>
      ) : (
        <>
          <ol className="historial__lista">
            {historial.data.items.map((r) => {
              const Icono = ICONOS[r.tipo] ?? Stethoscope;
              return (
                <li key={r.id} className="historial__item">
                  <span className="historial__icono" aria-hidden="true"><Icono size={18} strokeWidth={1.75} /></span>
                  <div className="historial__texto">
                    <p className="historial__tipo">
                      {ETIQUETA_TIPO_REGISTRO_CLINICO[r.tipo]}
                      <span className="historial__fecha">{formatearFecha(r.fecha)}</span>
                    </p>
                    {r.descripcion && <p className="historial__descripcion">{r.descripcion}</p>}
                    {r.soporteVeterinario && /^https:\/\//i.test(r.soporteVeterinario) && (
                      <a className="historial__soporte" href={r.soporteVeterinario} target="_blank" rel="noopener noreferrer">
                        <FileText size={14} strokeWidth={1.75} aria-hidden="true" /> {/\.pdf($|\?)/i.test(r.soporteVeterinario) ? 'Ver PDF del veterinario' : 'Ver soporte veterinario'}
                      </a>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          {historial.data.totalPaginas > 1 && (
            <nav className="historial__paginas" aria-label="Páginas del historial">
              <Boton disabled={pagina <= 1 || historial.isFetching} onClick={() => setPagina((p) => p - 1)}>← Más recientes</Boton>
              <span>Página {historial.data.pagina} de {historial.data.totalPaginas}</span>
              <Boton disabled={pagina >= historial.data.totalPaginas || historial.isFetching} onClick={() => setPagina((p) => p + 1)}>Anteriores →</Boton>
            </nav>
          )}
        </>
      )}

      {abierto && (
        <FormularioAtencion
          mascotaId={mascotaId}
          nombre={nombre}
          alCerrar={(guardado) => {
            setAbierto(false);
            if (guardado) {
              setMensaje('La atención se registró en el historial.');
              setPagina(1);
              void cache.invalidateQueries({ queryKey: ['historial-clinico', mascotaId] });
            }
          }}
        />
      )}
    </section>
  );
}

function FormularioAtencion({ mascotaId, nombre, alCerrar }: { mascotaId: number; nombre: string; alCerrar: (guardado: boolean) => void }) {
  const [tipo, setTipo] = useState(TipoRegistroClinico.Vacuna);
  const [fecha, setFecha] = useState(hoyLocal());
  const [descripcion, setDescripcion] = useState('');
  const [soporte, setSoporte] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const [errorLocal, setErrorLocal] = useState('');
  const guardar = useMutation({
    mutationFn: () => api.mascotas.agregarRegistroClinico({ mascotaId, tipo, fecha, descripcion, soporteVeterinario: soporte }),
    onSuccess: () => alCerrar(true),
  });

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    if (guardar.isPending || subiendo) return;
    const error = !fecha ? 'Elige la fecha de la atención.'
      : fecha > hoyLocal() ? 'La fecha no puede estar en el futuro.'
      : !descripcion.trim() ? 'Describe la atención (por ejemplo, la vacuna aplicada).'
      : '';
    setErrorLocal(error);
    if (!error) guardar.mutate();
  }

  return (
    <Modal titulo="Registrar atención" compacto ocupado={guardar.isPending || subiendo} alCerrar={() => alCerrar(false)}>
      <p className="historial__contexto">{nombre}</p>
      <form className="cuenta__form" onSubmit={enviar} noValidate>
        <fieldset disabled={guardar.isPending}>
          <label className="campo">
            <span className="campo__etiqueta">Tipo</span>
            <select className="campo__control" value={tipo} onChange={(e) => setTipo(Number(e.target.value) as TipoRegistroClinico)}>
              {TIPOS.map((t) => <option key={t} value={t}>{ETIQUETA_TIPO_REGISTRO_CLINICO[t]}</option>)}
            </select>
          </label>
          {/* Atenciones ya hechas: hasta hoy y como mucho 30 años atrás. */}
          <CampoFecha etiqueta="Fecha de la atención" valor={fecha} alCambiar={setFecha} desde={hace30Anios()} hasta={hoyLocal()} />
          <label className="campo">
            <span className="campo__etiqueta">Descripción</span>
            <textarea className="campo__control historial__area" value={descripcion} maxLength={500}
              placeholder="Vacuna antirrábica, lote 1234" onChange={(e) => setDescripcion(e.target.value)} />
          </label>
          <SoporteVeterinario valor={soporte} alCambiar={setSoporte} alActividad={setSubiendo} />
          {(errorLocal || guardar.isError) && <p role="alert" className="campo__error">{errorLocal || (guardar.error && errorTexto(guardar.error))}</p>}
          <div className="publicacion-navegacion">
            <Boton disabled={guardar.isPending || subiendo} onClick={() => alCerrar(false)}>Cancelar</Boton>
            <Boton tipo="submit" variante="primario" cargando={guardar.isPending} disabled={subiendo}>Guardar atención</Boton>
          </div>
        </fieldset>
      </form>
    </Modal>
  );
}
