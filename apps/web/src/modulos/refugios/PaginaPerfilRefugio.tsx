import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ESTADO_VERIFICACION, EstadoVerificacion, NivelRol } from '@huellitas/shared';
import { api } from '@/lib/api';
import { useSesion } from '@/modulos/autenticacion/ContextoSesion';
import { Boton } from '@/componentes/ui/Boton';
import { Insignia } from '@/componentes/ui/Insignia';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Isotipo } from '@/componentes/ui/Isotipo';
import './refugios.css';

export function PaginaPerfilRefugio() {
  const id = Number(useParams<{ id: string }>().id);
  const { usuario } = useSesion();
  const ubicacion = useLocation();
  const anterior = (ubicacion.state as { volverA?: string } | null)?.volverA;
  const volverA = anterior === '/refugios' && usuario?.rol.nivel === NivelRol.Administrador ? anterior
    : anterior === '/mi-refugio' && usuario?.rol.nivel === NivelRol.Refugio ? anterior
      : usuario?.rol.nivel === NivelRol.Administrador ? '/refugios'
        : usuario?.rol.nivel === NivelRol.Refugio ? '/mi-refugio' : '/login';
  const valido = Number.isInteger(id) && id > 0;
  const consulta = useQuery({ queryKey: ['refugios', 'detalle', id, usuario?.correo ?? 'publico'], queryFn: () => api.refugios.obtener(id), enabled: valido, retry: false });
  const refugio = consulta.data;
  const puedeVer = refugio?.estadoVerificacion === EstadoVerificacion.Verificado || usuario?.rol.nivel === NivelRol.Administrador ||
    (usuario?.rol.nivel === NivelRol.Refugio && usuario.refugioId === id);
  return <main className="refugio-perfil">
    <header className="refugio-perfil__barra">
      <Link className="refugio-marca" to={volverA}><Isotipo tamano={36} /><span>Huellitas</span></Link>
      <Link className="boton boton--secundario refugio-enlace" to={volverA}><span aria-hidden="true">←</span> Volver</Link>
    </header>
    {consulta.isPending && valido && <p>Cargando perfil del refugio…</p>}
    {(!valido || consulta.isError || (refugio && !puedeVer)) && <EstadoVacio titulo="Perfil no disponible" descripcion="El refugio no existe, aún no está verificado o no se pudo consultar." accion={valido ? <Boton onClick={() => void consulta.refetch()}>Reintentar</Boton> : undefined} />}
    {refugio && puedeVer && <>
      <header className="refugio-perfil__presentacion">
        <p className="refugio-sobretitulo">Conoce al refugio</p>
        <h1>{refugio.nombre}</h1>
        <Insignia estado={ESTADO_VERIFICACION[refugio.estadoVerificacion]} />
      </header>
      {refugio.estadoVerificacion !== EstadoVerificacion.Verificado && <p>Vista interna: este perfil todavía no está disponible al público.</p>}
      <section className="refugio-panel"><h2>Sobre el refugio</h2>
        <p style={{ whiteSpace: 'pre-wrap' }}>{refugio.descripcion || 'El refugio aún no agregó una descripción.'}</p>
        <dl className="refugio-datos">
          <div><dt>Dirección</dt><dd>{refugio.direccion}</dd></div><div><dt>Teléfono</dt><dd>{refugio.telefono || 'Sin información'}</dd></div>
          <div><dt>Correo de contacto</dt><dd>{refugio.correo || 'Sin información'}</dd></div><div><dt>Redes sociales</dt><dd>{refugio.redesSociales || 'Sin información'}</dd></div>
        </dl>
      </section>
      <section className="refugio-panel"><h2>Requisitos de adopción</h2>
        {refugio.requisitos.filter(r => r.activo).length ? <ol className="refugio-lista">{[...refugio.requisitos].filter(r => r.activo).sort((a,b) => a.orden-b.orden).map(r => <li key={r.id}>{r.descripcion} <strong>({r.esObligatorio ? 'Obligatorio' : 'Opcional'})</strong></li>)}</ol>
          : <p>El refugio todavía no publicó sus requisitos. Consulta sus condiciones antes de postularte.</p>}
      </section>
    </>}
  </main>;
}
