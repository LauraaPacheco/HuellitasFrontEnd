import type { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { useRegistrarTitulo, useSeccionActual } from './TituloPagina';

interface Props {
  readonly titulo: string;
  readonly resumen?: string;
  readonly acciones?: ReactNode;
}

/**
 * Encabezado de cada pantalla del panel.
 *
 * Lleva el icono de la seccion del menu, el mismo que se ve en la barra
 * lateral, para que la pantalla se reconozca de un vistazo. En las
 * pantallas de detalle (una ficha, una solicitud) la seccion aparece
 * arriba en pequeno para saber de donde se viene.
 */
export function Encabezado({ titulo, resumen, acciones }: Props) {
  useRegistrarTitulo(titulo);
  const seccion = useSeccionActual();
  const Icono = seccion?.icono;
  const { pathname } = useLocation();
  // Solo en pantallas dentro de la seccion (un detalle, una ficha). En la
  // pantalla principal de la seccion el icono ya dice donde estas.
  const mostrarSeccion = seccion && pathname !== seccion.ruta && seccion.etiqueta !== titulo;

  return (
    <header className="encabezado">
      <div className="encabezado__texto">
        {Icono && (
          <span className="encabezado__icono" aria-hidden="true">
            <Icono size={22} strokeWidth={1.75} />
          </span>
        )}
        <div className="encabezado__titulos">
          {mostrarSeccion && <p className="encabezado__seccion">{seccion.etiqueta}</p>}
          <h1>{titulo}</h1>
          {resumen && <p className="encabezado__resumen">{resumen}</p>}
        </div>
      </div>
      {acciones && <div className="encabezado__acciones">{acciones}</div>}
    </header>
  );
}
