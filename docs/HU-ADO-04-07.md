# Integración ADO-04 a ADO-07 y archivos

Contrato revisado el 9 de noviembre de 2026 en `HuellitasBackend origin/main`, commit `85757de`. El checkout local del backend sigue en `develop` antiguo (`06a195e`): para probar estas funciones hay que ejecutar la versión que contiene los endpoints indicados y configurar Cloudinary. No se modificó backend ni se escribieron datos de prueba.

## Frontend conectado

- Web, Solicitudes recibidas: finalizar una solicitud Aprobada con confirmación explícita del cierre de las otras postulaciones; refrescar bandeja, inventario y consultas afectadas. Se envía PATCH por ID de solicitud, no de adopción.
- Web: agendar fecha/hora local y modalidad para solicitudes Enviadas o En revisión. No se inventan el enlace de videollamada, dirección ni una fecha consultada.
- Web: consultar soportes adjuntados por el adoptante; descargar la constancia cuando la solicitud esté Finalizada.
- Móvil, Mis solicitudes: consultar documentos, adjuntar PDF/JPG/PNG/WebP de hasta 5 MB e indicar el tipo; descargar/compartir la constancia tras finalizar. Si la subida termina pero la asociación falla, se conserva la URL en la pantalla para reintentar sin duplicar la carga.
- Web, Publicar mascota → Fotos: subir imágenes al servidor y agregar su URL al registro final. Se conserva el ingreso manual por enlace. No se habilitan videos ni edición de una ficha existente sin los IDs de catálogo requeridos.
- El estado Cerrada del backend se reconoce para las solicitudes cerradas automáticamente.

Los controles nuevos para documentos/constancia utilizan servidor real. En demo no se simula una persistencia real de archivos. La descarga PDF incluye autenticación y cabeceras del túnel; no se abre el endpoint protegido como si fuera un enlace público. En navegador se descarga el Blob; en teléfono se guarda en caché y se abre el menú de compartir.

## Contratos

| Método | Ruta (prefijo `/api/v1`) | Entrada / salida |
| --- | --- | --- |
| PATCH | `/Adopciones/{solicitudId}/finalizar` | sin cuerpo → mensaje |
| POST | `/Adopciones/{solicitudId}/agendar-visita` | `{ fecha, modalidad: 0 o 1 }` → mensaje |
| PATCH | `/Adopciones/{solicitudId}/confirmar-visita` | `{ aceptar: boolean }` → mensaje; adaptador preparado, interfaz bloqueada por falta de consulta |
| POST | `/Archivos` | multipart `archivo`, `tipo` → `{ mensaje, url }` |
| POST | `/Adopciones/{solicitudId}/soportes` | `{ tipo, archivoUrl }` → mensaje y documento |
| GET | `/Adopciones/{solicitudId}/soportes` | lista `{ documentoId, tipo, archivoUrl, fechaCarga }` |
| GET | `/Adopciones/{solicitudId}/constancia` | binario `application/pdf` |

## Bloqueos verificados del backend

1. No hay GET de visita ni campos de fecha/modalidad en los resúmenes de solicitud. No se ofrece aceptar/rechazar una fecha sin poder mostrársela al adoptante. El adaptador de confirmación está listo.
2. Agendar cambia la solicitud a Entrevista; aprobar, rechazar y reagendar solo aceptan Enviada/En revisión. Rechazar la fecha tampoco devuelve la solicitud a esos estados. El flujo con visita no puede llegar al cierre sin corregir esas transiciones. La UI explica esta limitación antes de agendar.
3. No hay detalle completo ni línea de tiempo real de la solicitud. La interfaz utiliza solo información de la bandeja.
4. Cloudinary debe estar configurado. Los errores de carga se muestran sin registrar documentos ficticios. La carga y asociación son dos operaciones; no hay eliminación de archivos huérfanos si se abandona la pantalla.

## Validación y prueba

Pruebas de contrato cubren PATCH de cierre, 403/409/500 sin reintento, fecha futura y modalidad cero, confirmación true/false, multipart sin Content-Type JSON, asociación, listado, PDF autenticado y errores 401/404, formatos/límite de tamaño y Cerrada. TypeScript, builds web normal/demo y exportaciones Expo se verifican aparte.

Pendiente prueba de extremo a extremo con backend actualizado, Cloudinary y cuentas reales. No se ejecutan finalizaciones, visitas ni cargas con documentos personales durante la implementación.

Recorrido: refugio abre Solicitudes recibidas; en una solicitud aprobada pulsa Finalizar y confirma. Adoptante actualiza Mis solicitudes y descarga la constancia. Para soportes, el adoptante abre Documentos de la solicitud, indica tipo y adjunta un archivo de prueba; el refugio usa Ver soportes. Prueba el agendamiento con una solicitud aparte hasta resolver el bloqueo de transiciones del backend.

Se agregaron módulos Expo para selector de documentos, archivos y compartir. Una app nativa compilada previamente necesita una nueva compilación para incluirlos; el navegador solo necesita reiniciar Metro. Se preservaron los cambios locales de versiones y configuración que ya existían.
