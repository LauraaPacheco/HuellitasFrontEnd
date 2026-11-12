import { Encabezado } from '@/componentes/layout/Encabezado';
import { EstadoConstruccion } from '@/componentes/ui/EstadoConstruccion';

interface Props {
  readonly titulo: string;
  readonly historias: string;
}

/**
 * Marcador temporal para las pantallas que todavia no se implementan.
 * Cada una nombra las historias de usuario que la cubren.
 */
export function PaginaPendiente({ titulo, historias }: Props) {
  return (
    <>
      <Encabezado titulo={titulo} />
      <EstadoConstruccion pantalla={titulo} historias={historias} />
    </>
  );
}
