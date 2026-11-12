import { ErrorHttp, type ClienteApi } from '../client';
export type CarpetaArchivo = 'perfiles' | 'mascotas' | 'soportes' | 'refugios' | 'reportes';
export const MAX_BYTES_ARCHIVO = 5 * 1024 * 1024;
export function validarArchivoServidor(nombre: string, bytes: number, soloImagen = false): string | null {
  if (!Number.isFinite(bytes) || bytes <= 0 || bytes > MAX_BYTES_ARCHIVO) return 'El archivo debe pesar entre 1 byte y 5 MB.';
  if (!(soloImagen ? /\.(jpe?g|png|webp)$/i : /\.(jpe?g|png|webp|pdf)$/i).test(nombre)) return soloImagen ? 'Selecciona una imagen JPG, PNG o WebP.' : 'Selecciona un PDF o una imagen JPG, PNG o WebP.';
  return null;
}
export class ServicioArchivos {
  constructor(private readonly api: ClienteApi, private readonly modoDemo = false) {}
  async subir(formulario: FormData): Promise<string> {
    if (this.modoDemo) throw new ErrorHttp({ titulo: 'La carga de archivos requiere conexión al backend real.', estadoHttp: 501 });
    const respuesta = await this.api.post<{ url: string }>('/api/v1/Archivos', formulario);
    if (!/^https:\/\//i.test(respuesta.url)) throw new ErrorHttp({ titulo: 'El servidor no devolvió un enlace seguro al archivo.', estadoHttp: 502 });
    return respuesta.url;
  }
}
