import { ESTADO_SOLICITUD, ESTADO_USUARIO, EstadoSolicitud, EstadoUsuario } from '@huellitas/shared';
import { Boton } from '@/componentes/ui/Boton';
import { BotonTema } from '@/componentes/ui/BotonTema';
import { Campo } from '@/componentes/ui/Campo';
import { EstadoVacio } from '@/componentes/ui/EstadoVacio';
import { Ilustracion, type VarianteIlustracion } from '@/componentes/ui/Ilustracion';
import { Insignia } from '@/componentes/ui/Insignia';
import { Isotipo } from '@/componentes/ui/Isotipo';
import { useState } from 'react';

/**
 * Catálogo de lo que tenemos construido.
 *
 * Existe porque muchos de estos estados son difíciles de provocar en la
 * app de verdad: un vacío necesita que no haya datos, un bloqueo necesita
 * un rol sin acceso. Aquí se ven todos a la vez y en los dos temas.
 *
 * Solo se monta en desarrollo (ver rutas.tsx): no es una pantalla del
 * producto y no debe llegar a producción.
 */
export function PaginaGaleria() {
  const [texto, setTexto] = useState('');

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--surface-100)',
        padding: 'var(--space-6) var(--space-7)',
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--space-4)',
          marginBottom: 'var(--space-6)',
        }}
      >
        <Isotipo tamano={36} />
        <div style={{ flexGrow: 1 }}>
          <h1 style={{ margin: 0, fontSize: 30 }}>Galería de componentes</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--ink-muted)', fontSize: 14 }}>
            Solo visible en desarrollo. Cambia el tema para revisar los dos.
          </p>
        </div>
        <BotonTema conEtiqueta />
      </header>

      <Seccion titulo="Ilustraciones">
        <Rejilla minimo={260}>
          {(
            [
              ['trio', 'Las tres tranquilas'],
              ['bloqueo', 'Con candado'],
              ['confundido', 'Con signos de pregunta'],
              ['durmiendo', 'Dormidas'],
            ] as readonly (readonly [VarianteIlustracion, string])[]
          ).map(([variante, descripcion]) => (
            <Tarjeta key={variante} nombre={variante} nota={descripcion}>
              <Ilustracion variante={variante} alto={150} />
            </Tarjeta>
          ))}
        </Rejilla>
      </Seccion>

      <Seccion titulo="Estados vacíos">
        <Rejilla minimo={340}>
          <Tarjeta nombre="Sin datos todavía" nota="No es un error: no ha pasado nada aún">
            <EstadoVacio
              ilustracion="durmiendo"
              titulo="Todavía no hay solicitudes"
              descripcion="Cuando alguien se postule a una de tus mascotas, la verás aquí."
            />
          </Tarjeta>
          <Tarjeta nombre="El filtro no encontró nada" nota="Sí tiene salida: quitar el filtro">
            <EstadoVacio
              ilustracion="confundido"
              titulo="Ninguna solicitud en ese estado"
              descripcion="Prueba con otro estado o mira todas las solicitudes."
              accion={<Boton>Ver todas</Boton>}
            />
          </Tarjeta>
          <Tarjeta nombre="Error de carga" nota="Sin ilustración: un error no se adorna">
            <EstadoVacio
              titulo="No pudimos cargar las solicitudes"
              descripcion="Revisa tu conexión y vuelve a intentarlo."
            />
          </Tarjeta>
        </Rejilla>
      </Seccion>

      <Seccion titulo="Botones">
        <Rejilla minimo={220}>
          <Tarjeta nombre="primario" nota="Uno solo por pantalla">
            <Boton variante="primario">Guardar cambios</Boton>
          </Tarjeta>
          <Tarjeta nombre="secundario" nota="El resto de acciones">
            <Boton variante="secundario">Cancelar</Boton>
          </Tarjeta>
          <Tarjeta nombre="peligro" nota="Acciones que no se deshacen">
            <Boton variante="peligro">Rechazar solicitud</Boton>
          </Tarjeta>
          <Tarjeta nombre="texto" nota="Para enlaces dentro de un bloque">
            <Boton variante="texto">Cerrar sesión</Boton>
          </Tarjeta>
          <Tarjeta nombre="cargando" nota="Se deshabilita solo">
            <Boton variante="primario" cargando>
              Guardar
            </Boton>
          </Tarjeta>
        </Rejilla>
      </Seccion>

      <Seccion titulo="Campos">
        <Rejilla minimo={300}>
          <Tarjeta nombre="normal" nota="Etiqueta visible, no solo marcador">
            <Campo
              id="g-normal"
              etiqueta="Correo"
              valor={texto}
              alCambiar={setTexto}
              marcador="tucorreo@ejemplo.com"
              ayuda="Te enviaremos un enlace para confirmarlo"
            />
          </Tarjeta>
          <Tarjeta nombre="con error" nota="El error va debajo, con role alert">
            <Campo
              id="g-error"
              etiqueta="NIT"
              valor="123"
              alCambiar={() => {}}
              error="El NIT no tiene un formato válido."
            />
          </Tarjeta>
        </Rejilla>
      </Seccion>

      <Seccion titulo="Insignias de estado">
        <Rejilla minimo={240}>
          <Tarjeta nombre="Solicitud" nota="El color nunca viaja solo: siempre con texto">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {Object.values(EstadoSolicitud)
                .filter((v): v is EstadoSolicitud => typeof v === 'number')
                .map((estado) => (
                  <Insignia key={estado} estado={ESTADO_SOLICITUD[estado]} />
                ))}
            </div>
          </Tarjeta>
          <Tarjeta nombre="Usuario" nota="Mismos tonos, otro dominio">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {Object.values(EstadoUsuario)
                .filter((v): v is EstadoUsuario => typeof v === 'number')
                .map((estado) => (
                  <Insignia key={estado} estado={ESTADO_USUARIO[estado]} />
                ))}
            </div>
          </Tarjeta>
        </Rejilla>
      </Seccion>
    </div>
  );
}

/* ---------- Andamiaje de la propia galería ---------- */

function Seccion({ titulo, children }: { readonly titulo: string; readonly children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 'var(--space-7)' }}>
      <h2
        style={{
          fontSize: 19,
          margin: '0 0 var(--space-4)',
          paddingBottom: 'var(--space-2)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {titulo}
      </h2>
      {children}
    </section>
  );
}

function Rejilla({ minimo, children }: { readonly minimo: number; readonly children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minimo}px, 1fr))`,
        gap: 'var(--space-4)',
        alignItems: 'start',
      }}
    >
      {children}
    </div>
  );
}

function Tarjeta({
  nombre,
  nota,
  children,
}: {
  readonly nombre: string;
  readonly nota: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        background: 'var(--surface-200)',
        padding: 'var(--space-4)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--space-3)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 80,
        }}
      >
        {children}
      </div>
      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 'var(--space-2)' }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{nombre}</p>
        <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--ink-muted)' }}>{nota}</p>
      </div>
    </div>
  );
}
