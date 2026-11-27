import { REDES_SOCIALES, etiquetaRedSocial, type RedesSociales } from '@huellitas/shared';
import { Campo } from '../Campo';
import './camposRedesSociales.css';

const CONOCIDAS = new Set<string>(REDES_SOCIALES.map((red) => red.clave));

/**
 * Un campo por red social. Se edita como un objeto red → usuario o enlace,
 * que es lo que el backend guarda como JSON. Las claves que el front no
 * conoce (por ejemplo, un texto suelto de antes, guardado como "otra") se
 * muestran también para no perderlas al guardar.
 */
export function CamposRedesSociales({
  id,
  etiqueta = 'Redes sociales (opcional)',
  ayuda,
  valor,
  alCambiar,
}: {
  id: string;
  etiqueta?: string;
  ayuda?: string;
  valor: RedesSociales | null | undefined;
  alCambiar: (redes: RedesSociales) => void;
}) {
  const redes = valor ?? {};
  const extra = Object.keys(redes).filter((clave) => !CONOCIDAS.has(clave));
  const cambiar = (clave: string) => (texto: string) => alCambiar({ ...redes, [clave]: texto });

  return (
    <fieldset className="redes-campos">
      <legend className="campo__etiqueta redes-campos__titulo">{etiqueta}</legend>
      {ayuda && <p className="redes-campos__ayuda">{ayuda}</p>}
      <div className="redes-campos__rejilla">
        {REDES_SOCIALES.map((red) => (
          <Campo
            key={red.clave}
            id={`${id}-${red.clave}`}
            etiqueta={red.etiqueta}
            tipo={red.clave === 'sitioWeb' ? 'url' : 'text'}
            valor={redes[red.clave] ?? ''}
            marcador={red.marcador}
            alCambiar={cambiar(red.clave)}
          />
        ))}
        {extra.map((clave) => (
          <Campo key={clave} id={`${id}-${clave}`} etiqueta={etiquetaRedSocial(clave)} valor={redes[clave] ?? ''} alCambiar={cambiar(clave)} />
        ))}
      </div>
    </fieldset>
  );
}
