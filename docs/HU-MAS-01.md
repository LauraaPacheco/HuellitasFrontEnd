# HU-MAS-01 — Gestión de mascotas y estados

Estado: implementada en frontend y demo en memoria; pendiente integración y
validación con backend. No modifica SQL ni inserta animales en la base de datos.

## Recorrido

Con `refugio@huellitas.co` / `Demo1234`, abrir Mascotas → Publicar mascota.
Seleccionar especie, tamaño y color; raza opcional dependiente de especie.
Completar nombre, sexo, fecha de ingreso, procedencia, esterilización, edad
opcional en años (admite decimales), descripción y temperamentos opcionales.
Guardar lleva al listado y muestra confirmación. Gestionar abre la edición.

El listado del refugio contiene sus propias mascotas. El administrador puede
consultar el conjunto pero no publicar a nombre de otro refugio. Una cuenta
necesita `usuario.refugioId` y un refugio activo y verificado para escribir.
Los controles de la UI no sustituyen la autorización del backend.

Desactivar publicación abre un modal y exige motivo: cambia a No disponible, preservando
la ficha. Desde No disponible se puede volver a Disponible. La demo permite
solo esas transiciones manuales; En proceso y Adoptada se reservan para las
HU de adopción, para evitar cierres sin solicitud. Esta política y el tratamiento
de solicitudes en curso deben acordarse con backend antes de cerrar la HU.

## Contrato propuesto, todavía no verificado con backend

| Método | Ruta actual del front | Contrato |
| --- | --- | --- |
| GET | `/api/mascotas` | `FiltroMascota` → `Paginado<MascotaResumen>` |
| GET | `/api/mascotas/{id}` | `Mascota` |
| POST | `/api/mascotas` | `CrearMascotaDto` → `Mascota` disponible, propietario obtenido de la sesión |
| PUT | `/api/mascotas/{id}` | `EditarMascotaDto` → `Mascota` |
| PUT | `/api/mascotas/{id}/estado` | `{ nuevoEstado, motivo? }` |
| DELETE | `/api/mascotas/{id}` | `{ motivo }`; demo lo trata como baja a No disponible |

El formulario usa los catálogos versionados existentes. El mapa de rutas de
mascotas deberá alinearse al controlador que construya backend. La API debe
validar rol/propietario/verificación en cada escritura, raza de la especie,
catálogos activos, fecha válida y no futura, edad no negativa, estado inicial,
transiciones y motivo. Debe ignorar o rechazar inyección de propietario/estado.
Una opción inactiva previamente guardada se conserva al editar, sin ofrecerla
para nuevas mascotas. Los campos opcionales vacíos deben poder limpiarse.

## Límites

- La demo conserva cambios en memoria y los reinicia al recargar.
- Fotos/videos se implementan en HU-MAS-03 y el historial clínico en HU-MAS-04.
- El cierre automático y las transiciones por solicitudes quedan para HU-ADO.
- No se declara completado el catálogo público HU-MAS-05 con este incremento.
- Falta acordar baja de mascotas con solicitudes activas, límites definitivos
  de texto y edad, bitácora de cambios y códigos de respuesta con backend.

## Validación

`npm test`: creación y consulta, aislamiento entre clientes demo, validación,
permisos por rol/propietario, refugio suspendido, catálogos y raza, edición sin
alterar propietario/estado, baja con motivo y bloqueo de saltos de adopción.
También se ejecutan TypeScript, build web normal y build demo.

## Ajustes visuales

Calendario propio con mes/año, selección de hoy, bloqueo de fechas futuras y
colores del tema. Tarjetas al ancho disponible, descripción con espaciado
interior y etiqueta «Está esterilizad@». Cabecera con explicación del estado,
acción reversible «Desactivar publicación» / «Reactivar publicación» y motivo.
El estado Adoptada ya se presenta en listado y gestión; el cambio automático
al finalizar la solicitud depende de HU-ADO-04, todavía pendiente.
