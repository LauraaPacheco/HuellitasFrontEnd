/*
 * Metro sabe empaquetar imagenes, pero TypeScript no sabe que son. Sin
 * esto, importar un .webp da "Cannot find module".
 *
 * En la web esto lo trae vite/client; aqui hay que declararlo a mano.
 */
declare module '*.webp' {
  import type { ImageSourcePropType } from 'react-native';

  const fuente: ImageSourcePropType;
  export default fuente;
}

declare module '*.png' {
  import type { ImageSourcePropType } from 'react-native';

  const fuente: ImageSourcePropType;
  export default fuente;
}
