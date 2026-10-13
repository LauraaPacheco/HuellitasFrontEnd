import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Isotipo } from '@/componentes/ui/Isotipo';
import { AvisoDemo } from '@/componentes/ui/AvisoDemo';
import './marcoAuth.css';

interface Props {
  readonly titulo: string;
  readonly descripcion?: string;
  /** Icono de resultado; va arriba del titulo, que es donde se busca. */
  readonly sello?: ReactNode;
  readonly children: ReactNode;
  /** Pie opcional; si no se pasa, va el enlace de vuelta al login. */
  readonly pie?: ReactNode;
}

/**
 * Marco de las pantallas sueltas de autenticación: confirmar correo,
 * recuperar contraseña y solicitar registro de refugio.
 *
 * El login usa el panel partido porque es la puerta de entrada. Estas son
 * pantallas de paso, a las que se llega desde un correo o un enlace, así
 * que van centradas y al grano.
 */
export function MarcoAuth({ titulo, descripcion, sello, children, pie }: Props) {
  return (
    <div className="marco-auth">
      <main className="marco-auth__columna">
        <Link to="/login" className="marco-auth__marca" aria-label="Huellitas, ir al inicio de sesión">
          <Isotipo tamano={40} />
          <span className="marco-auth__nombre">Huellitas</span>
        </Link>

        <AvisoDemo />

        <section className="marco-auth__tarjeta">
          {sello}
          <h1 className="marco-auth__titulo">{titulo}</h1>
          {descripcion && <p className="marco-auth__descripcion">{descripcion}</p>}
          {children}
        </section>

        <footer className="marco-auth__pie">
          {pie ?? <Link to="/login">Volver al inicio de sesión</Link>}
        </footer>
      </main>
    </div>
  );
}
