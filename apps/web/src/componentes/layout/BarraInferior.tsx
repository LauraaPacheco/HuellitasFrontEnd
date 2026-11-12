import { useLayoutEffect, useRef, useState, type Ref } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Plus, type LucideIcon } from 'lucide-react';
import './barraInferior.css';

export interface ItemBarra {
  readonly ruta: string;
  readonly etiqueta: string;
  readonly icono: LucideIcon;
}

interface Props {
  readonly items: readonly ItemBarra[];
  readonly alAbrirMas: () => void;
  readonly menuAbierto: boolean;
  readonly refMas: Ref<HTMLButtonElement>;
}

/* Medidas de la muesca, en px. El circulo activo (52) queda con su
   centro sobre el borde superior y 8 px de aire entre el y la muesca. */
const ALTO = 64;
const RADIO_ESQUINA = 20;
const MEDIO_ANCHO_MUESCA = 50;
const PROFUNDIDAD = 34;

/**
 * Forma de la barra: rectangulo redondeado con una muesca curva en cx.
 * Se dibuja como path para que la curva sea suave, como en la referencia.
 */
function formaBarra(ancho: number, cx: number) {
  const r = RADIO_ESQUINA;
  const m = MEDIO_ANCHO_MUESCA;
  const p = PROFUNDIDAD;
  return [
    `M ${r} 0`,
    `L ${cx - m} 0`,
    `C ${cx - m * 0.45} 0 ${cx - m * 0.72} ${p} ${cx} ${p}`,
    `C ${cx + m * 0.72} ${p} ${cx + m * 0.45} 0 ${cx + m} 0`,
    `L ${ancho - r} 0`,
    `Q ${ancho} 0 ${ancho} ${r}`,
    `L ${ancho} ${ALTO - r}`,
    `Q ${ancho} ${ALTO} ${ancho - r} ${ALTO}`,
    `L ${r} ${ALTO}`,
    `Q 0 ${ALTO} 0 ${ALTO - r}`,
    `L 0 ${r}`,
    `Q 0 0 ${r} 0`,
    'Z',
  ].join(' ');
}

/**
 * Barra de navegacion inferior para celular y tableta.
 *
 * Dos accesos a cada lado y, en el centro, el boton de menu (+), que abre
 * la ventana con todas las opciones. La opcion activa sube en un circulo
 * y la barra se abre en una muesca debajo de el; al cambiar de seccion,
 * circulo y muesca se deslizan juntos.
 */
export function BarraInferior({ items, alAbrirMas, menuAbierto, refMas }: Props) {
  const { pathname } = useLocation();
  const barra = useRef<HTMLElement>(null);
  const [ancho, setAncho] = useState(0);

  useLayoutEffect(() => {
    const elemento = barra.current;
    if (!elemento) return;
    const observador = new ResizeObserver(([entrada]) => {
      if (entrada) setAncho(entrada.contentRect.width);
    });
    observador.observe(elemento);
    return () => observador.disconnect();
  }, []);

  // Ranuras: dos accesos, el menu en el centro, dos accesos.
  const mitad = Math.ceil(items.length / 2);
  const centroMenu = mitad;
  const total = items.length + 1;
  const ranuraDe = (indiceItem: number) => (indiceItem < mitad ? indiceItem : indiceItem + 1);

  const indiceRuta = items.findIndex((item) => pathname === item.ruta || pathname.startsWith(`${item.ruta}/`));
  // Con el menu abierto, o si la pagina no esta en la barra, la muesca va al centro.
  const activo = menuAbierto || indiceRuta === -1 ? centroMenu : ranuraDe(indiceRuta);

  // Los centros se alejan de las esquinas lo justo para que la muesca de
  // los extremos no se coma la curva del borde.
  const margen = RADIO_ESQUINA + MEDIO_ANCHO_MUESCA;
  const util = Math.max(ancho - margen * 2, 0);
  const centro = (ranura: number) => margen + (util / Math.max(total - 1, 1)) * ranura;
  const cx = ancho ? centro(activo) : 0;

  const enMenu = activo === centroMenu;
  const itemActivo = enMenu ? undefined : items[indiceRuta];
  const IconoActivo = itemActivo?.icono ?? Plus;
  const etiquetaActiva = enMenu ? (menuAbierto ? 'Cerrar' : 'Menú') : itemActivo?.etiqueta;

  return (
    <nav ref={barra} className="barra-inferior" aria-label="Accesos rápidos">
      {ancho > 0 && (
        <>
          <svg className="barra-inferior__fondo" width={ancho} height={ALTO} viewBox={`0 0 ${ancho} ${ALTO}`} aria-hidden="true">
            <path style={{ d: `path("${formaBarra(ancho, cx)}")` } as React.CSSProperties} d={formaBarra(ancho, cx)} />
          </svg>
          <span className="barra-inferior__burbuja" style={{ transform: `translateX(${cx - 26}px)` }} aria-hidden="true">
            {/* El + gira a una x cuando la ventana esta abierta. */}
            <IconoActivo
              size={enMenu ? 26 : 22}
              strokeWidth={2}
              className={enMenu && menuAbierto ? 'barra-inferior__mas barra-inferior__mas--abierto' : enMenu ? 'barra-inferior__mas' : undefined}
            />
          </span>
          <span className="barra-inferior__etiqueta" style={{ transform: `translateX(calc(${cx}px - 50%))` }} aria-hidden="true">
            {etiquetaActiva}
          </span>
        </>
      )}

      <ul className="barra-inferior__lista">
        {items.map((item, indice) => {
          const ranura = ranuraDe(indice);
          return (
            <li key={item.ruta} style={{ left: ancho ? centro(ranura) : undefined }}>
              <NavLink
                to={item.ruta}
                aria-label={item.etiqueta}
                className={`barra-inferior__boton${ranura === activo ? ' barra-inferior__boton--activo' : ''}`}
              >
                <item.icono size={22} strokeWidth={1.75} aria-hidden="true" />
              </NavLink>
            </li>
          );
        })}
        <li style={{ left: ancho ? centro(centroMenu) : undefined }}>
          <button
            ref={refMas}
            type="button"
            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={menuAbierto}
            aria-controls="menu-panel"
            className={`barra-inferior__boton${activo === centroMenu ? ' barra-inferior__boton--activo' : ''}`}
            onClick={alAbrirMas}
          >
            <Plus size={24} strokeWidth={2} aria-hidden="true" />
          </button>
        </li>
      </ul>
    </nav>
  );
}
