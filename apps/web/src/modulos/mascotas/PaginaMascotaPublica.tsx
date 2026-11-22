import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Cake, HeartHandshake, House, ImageOff, Mars, PawPrint, Share2, ShieldCheck, Venus, type LucideIcon } from 'lucide-react';
import { ESTADO_MASCOTA, ETIQUETA_SEXO, EstadoMascota, Sexo } from '@huellitas/shared';
import { api } from '@/lib/api';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { Isotipo } from '@/componentes/ui/Isotipo';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { EstadoCargando } from '@/componentes/ui/EstadoCargando';
import { HistoriaMascota } from '@/modulos/trazabilidad/HistoriaMascota';
import '@/modulos/refugios/refugios.css';
import './mascotaPublica.css';

/**
 * Ficha pública de una mascota: adonde lleva el enlace de compartir
 * (GET /api/v1/Mascotas/{id}/compartir arma {FrontendUrl}/public/mascotas/{id}).
 * No pide sesión. Postularse sí la pide, así que el botón lleva al login.
 */
export function PaginaMascotaPublica() {
  const id = Number(useParams<{ id: string }>().id);
  const navegar = useNavigate();
  const valido = Number.isSafeInteger(id) && id > 0;
  const [foto, setFoto] = useState(0);
  const [copiado, setCopiado] = useState(false);
  const consulta = useQuery({ queryKey: ['mascota-publica', id], queryFn: () => api.mascotas.obtenerFicha(id), enabled: valido, retry: false });
  const m = consulta.data;
  const disponible = m?.estado === EstadoMascota.Disponible || m?.estado === EstadoMascota.EnProceso;

  async function compartir() {
    const url = window.location.href;
    if (navigator.share) {
      try { await navigator.share({ title: `Conoce a ${m?.nombre} en Huellitas`, url }); } catch { /* la persona canceló */ }
      return;
    }
    await navigator.clipboard?.writeText(url);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  }

  return (
    <main className="refugio-perfil">
      <header className="refugio-perfil__barra">
        <Link className="refugio-marca" to="/login"><Isotipo tamano={36} /><span>Huellitas</span></Link>
        {m && <Boton onClick={() => void compartir()}><Share2 size={16} strokeWidth={1.75} aria-hidden="true" /> {copiado ? 'Enlace copiado' : 'Compartir'}</Boton>}
      </header>

      {consulta.isPending && valido ? (
        <EstadoCargando mensaje="Cargando la ficha…" />
      ) : !valido || consulta.isError || !m ? (
        <EstadoVacio
          ilustracion="confundido"
          titulo="Esta mascota no está disponible"
          descripcion="El enlace no es válido o la mascota ya no se muestra en el catálogo."
          accion={valido ? <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton> : undefined}
        />
      ) : (
        <div className="mascota-publica">
          <section className="mascota-publica__galeria" aria-label={`Fotos de ${m.nombre}`}>
            {m.fotos.length ? (
              <>
                <div className="mascota-publica__foto">
                  <img className="mascota-publica__fondo" src={m.fotos[foto]} alt="" aria-hidden="true" referrerPolicy="no-referrer" />
                  <img className="mascota-publica__principal" src={m.fotos[foto]} alt={`Foto ${foto + 1} de ${m.fotos.length} de ${m.nombre}`} referrerPolicy="no-referrer" />
                </div>
                {m.fotos.length > 1 && (
                  <div className="mascota-publica__miniaturas" role="group" aria-label="Elegir foto">
                    {m.fotos.map((f, i) => (
                      <button key={f} type="button" aria-pressed={i === foto} aria-label={`Ver foto ${i + 1}`} onClick={() => setFoto(i)}>
                        <img src={f} alt="" referrerPolicy="no-referrer" />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="mascota-publica__sin-foto"><ImageOff size={32} strokeWidth={1.5} aria-hidden="true" /> Sin fotos por ahora</div>
            )}
          </section>

          <section className="mascota-publica__info">
            <p className="refugio-sobretitulo">Busca un hogar</p>
            <div className="mascota-publica__titulo">
              <h1>{m.nombre}</h1>
              <Insignia estado={ESTADO_MASCOTA[m.estado]} />
            </div>
            <dl className="mascota-publica__datos">
              <Dato icono={PawPrint} etiqueta="Especie" valor={m.raza ? `${m.especie} · ${m.raza}` : m.especie} />
              <Dato icono={m.sexo === Sexo.Macho ? Mars : Venus} etiqueta="Sexo" valor={ETIQUETA_SEXO[m.sexo]} />
              <Dato icono={Cake} etiqueta="Edad" valor={m.edadAproximada === null ? 'Sin dato' : `${m.edadAproximada} ${m.edadAproximada === 1 ? 'año' : 'años'}`} />
              <Dato icono={ShieldCheck} etiqueta="Esterilización" valor={m.esterilizada ? 'Esterilizad@' : 'Sin esterilizar'} />
            </dl>
            <p className="mascota-publica__descripcion">{m.descripcion?.trim() || 'El refugio todavía no agregó una descripción.'}</p>

            <div className="mascota-publica__accion">
              {disponible ? (
                <>
                  <Boton variante="primario" onClick={() => navegar('/login', { state: { volverA: `/public/mascotas/${id}` } })}>
                    <HeartHandshake size={18} strokeWidth={1.75} aria-hidden="true" /> Postularme para adoptar
                  </Boton>
                  <p>Para postularte necesitas una cuenta. También puedes hacerlo desde la app Huellitas.</p>
                </>
              ) : (
                <p>{m.nombre} no está recibiendo postulaciones en este momento.</p>
              )}
            </div>

            <div className="mascota-publica__refugio">
              <House size={18} strokeWidth={1.75} aria-hidden="true" />
              <div>
                <p className="mascota-publica__refugio-nombre">{m.refugioNombre}</p>
                {m.refugioTelefono && <p>Teléfono: {m.refugioTelefono}</p>}
              </div>
              {m.refugioId !== undefined && <Link className="boton boton--secundario" to={`/refugios/${m.refugioId}`}>Ver refugio</Link>}
            </div>
          </section>
        </div>
      )}

      {m && <div className="mascota-publica__historia"><HistoriaMascota mascotaId={id} /></div>}
    </main>
  );
}

function Dato({ icono: Icono, etiqueta, valor }: { icono: LucideIcon; etiqueta: string; valor: string }) {
  return (
    <div className="mascota-publica__dato">
      <span aria-hidden="true"><Icono size={18} strokeWidth={1.75} /></span>
      <div><dt>{etiqueta}</dt><dd>{valor}</dd></div>
    </div>
  );
}
