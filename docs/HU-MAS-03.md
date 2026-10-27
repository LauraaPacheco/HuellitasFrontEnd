# HU-MAS-03 — Fotos y videos

> Actualización de integración real: consultar [INTEGRACION-BACKEND.md](INTEGRACION-BACKEND.md). Los contratos propuestos y recorridos demo descritos abajo se conservan como contexto y no sustituyen esa revisión.

Estado: gestión web y demo en memoria implementadas; pendiente integración
con backend, almacenamiento definitivo y validación de criterios con el equipo.
No modifica SQL ni envía archivos a servicios externos.

## Recorrido web

- Publicar mascota guarda un borrador y avanza al paso Fotos y videos.
  La ficha solo pasa a Disponible al confirmar en Revisar y publicar.
- Desde Mascotas → Gestionar se pueden añadir archivos posteriormente.
- Selección múltiple, vista previa, descarte y carga explícita. No se sube al
  seleccionar. Si una carga falla, se conservan solo los pendientes para
  reintentar; los archivos cargados antes del fallo permanecen en la galería.
- La primera foto es principal; se puede elegir otra. Videos nunca son portada.
- Eliminar requiere confirmación. Si se elimina la principal, se asigna otra
  foto activa, si existe. Sin fotos, el resumen queda sin portada.
- Galería responsive con imágenes y videos con controles, sin autoplay.
  Si el navegador no admite el archivo/códec, se informa en la tarjeta.
- El listado refleja la foto principal al cambiarla.

## Límites provisionales a acordar con backend

10 archivos activos por mascota. Fotos JPEG/PNG/WebP de hasta 5 MiB y videos
MP4/WebM de hasta 25 MiB. Se rechazan formatos distintos, archivos vacíos y
excesos de tamaño. La demo comprueba la cabecera binaria declarada, pero eso
no reemplaza la validación/decodificación completa del servidor.
No se han definido duración máxima, dimensiones mínimas, compresión ni códecs
obligatorios; requieren acuerdo antes de dar por cerrada la HU.

## Contrato propuesto

Las rutas son las previstas por el front, no endpoints validados del backend.
Deben alinearse con su convención versionada cuando existan.

| Método | Ruta | Entrada / respuesta |
| --- | --- | --- |
| POST | `/api/mascotas/{id}/multimedia` | multipart `archivo` → `Multimedia` |
| PUT | `/api/mascotas/{id}/multimedia/{archivoId}/principal` | sin cuerpo → 204 |
| DELETE | `/api/mascotas/{id}/multimedia/{archivoId}` | sin cuerpo → 204 |
| GET | `/api/mascotas/{id}` | `Mascota.multimedia` contiene archivos activos |
| GET | `/api/mascotas` | `MascotaResumen.fotoPrincipal` contiene URL principal o null |

Cada escritura exige usuario Refugio, propietario de la mascota y refugio activo
verificado. El servidor debe validar los bytes, tamaño y tipo de archivo y
controlar el número máximo y la unicidad de principal de forma atómica. Los
identificadores del archivo deben pertenecer a la mascota indicada. Principal
solo se permite para fotos. La eliminación en demo es lógica y filtra inactivos.
La API debe definir su política de conservación y eliminación del objeto real.

## Demo y límites de integración

Los archivos se leen localmente y se conservan como data URL en la instancia
demo. Recargar o reiniciar el cliente borra el estado, incluidos archivos. No
hay sincronización entre instancias web y móvil ni persistencia en localStorage.
En backend se esperan URLs de almacenamiento, no data URL permanentes.
La ficha pública/galería móvil se integrará al catálogo HU-MAS-05; este incremento
implementa la carga y administración por parte del refugio en la web.

## Pruebas

`npm test`: formatos y tamaños, cabeceras, carga y portada, cambio de principal,
eliminación y reasignación, videos sin portada, propietario/rol/suspensión,
archivos vacíos/disfrazados, mascota inexistente, diez cargas concurrentes e
identificadores únicos. Se ejecutan TypeScript y builds web normal y demo.

El asistente de publicación y los contratos de borrador se documentan en
`PUBLICACION-PASOS.md`.
