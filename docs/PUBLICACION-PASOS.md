# Publicación por pasos

> Actualización de integración real: consultar [INTEGRACION-BACKEND.md](INTEGRACION-BACKEND.md). Los contratos propuestos y recorridos demo descritos abajo se conservan como contexto y no sustituyen esa revisión.

La web presenta tres pasos: Información → Fotos y videos → Revisar y publicar.
HU-MAS-04 añadirá Salud cuando esté implementada. La información obligatoria se
valida antes de avanzar; fotos y videos son opcionales por ahora y la revisión
avisa si falta una portada. No se ha acordado exigir una foto para publicar.

Al continuar desde Información se crea un borrador. Se pueden editar los datos,
cargar archivos y volver a pasos anteriores. Mientras hay una selección de
archivos sin cargar/descartar o una operación en curso, se bloquea cambiar de
paso para no perderla. Al confirmar, la ficha pasa a Disponible. El listado del
refugio muestra borradores y permite retomarlos con «Continuar publicación».

Los cambios guardados de un borrador viven en el cliente demo, igual que las
fotos. No hay persistencia real, ni recuperación tras recargar el navegador o
reiniciar la demo. Los cambios de información sin guardar se pierden al salir.

## Propuesta que debe implementar y validar backend

- `EstadoMascota.Borrador = 4`: valor nuevo propuesto; no modifica ni migra SQL.
  No se renumeran los estados 0–3 existentes. Debe acordarse el valor con backend.
- `POST /api/mascotas/borradores`: `CrearMascotaDto` → `Mascota` en Borrador.
- `POST /api/mascotas/{id}/publicar`: sin cuerpo → `Mascota` Disponible.
- PUT de ficha y gestión multimedia conservan Borrador hasta la confirmación.
- Borradores solo visibles al propietario y administrador; visitantes y
  adoptantes no los reciben en listados ni detalles, incluso filtrando por id.
- Publicar exige propietario y refugio activo/verificado, revalida datos y
  catálogos y permite exclusivamente Borrador → Disponible. No permite duplicar
  la publicación. Los cambios manuales de estado no sustituyen esta operación.
- Las rutas son propuestas sin versión; al integrar deben alinearse con backend.

El endpoint anterior POST `/api/mascotas` permanece para compatibilidad del
servicio, pero el asistente usa crearBorrador y publicar. La API debe acordar
si la creación directa seguirá permitida. Nada de lo anterior está validado
contra el backend real y no se declara cerrada la integración por este avance.
