# HU-ADO-01 — Postulación desde móvil

Implementada contra el contrato de backend `06a195e`. Pendiente prueba autenticada con mascota real disponible o en proceso.

Desde la ficha, Postularme abre el formulario. Consulta el perfil vigente; requiere rol Adoptante, cuenta activa, completitud 100%, motivación y compromiso de cuidado. Envía una sola petición mientras está pendiente y muestra el código devuelto por backend. Conserva los campos si falla y muestra el detalle del error, incluido conflicto por duplicado. No reintenta automáticamente un POST.

Contrato: `POST /api/v1/Adopciones` con `{ mascotaId, respuestasFormulario: { motivacion, aceptaCompromisos } }`. Respuesta 201: `{ mensaje, solicitud: { solicitudId, codigo, mascotaNombre, fechaEnvio, estado } }`. No se envía usuarioId ni estado: los asigna backend.

El formulario y compromiso son una propuesta de interfaz: backend acepta respuestas libres, sin esquema de preguntas. Las validaciones de perfil del frontend no reemplazan la autorización y validación del servidor.

La demo indica expresamente que simula el envío y no lo persiste. En modo real, Mis solicitudes informa que el seguimiento está pendiente: backend todavía no expone el GET correspondiente. No se presenta una lista vacía como si fuera un historial consultado.

Las rutas móviles usan la carpeta `principal` para la navegación por pestañas. Los parámetros descriptivos `[mascotaId]` y `[refugioId]` conservan los corchetes necesarios para Expo Router. La ruta raíz redirige a `/principal/catalogo`.

Validación: siete pruebas del adaptador verifican endpoint, cuerpo, confirmación y errores sin reintentar ni fingir éxito. Suite completa: 109 pruebas. TypeScript y build web verificados. Para prueba real se requiere cuenta adoptante completa y mascota publicada; no se insertaron animales ni cuentas en esta implementación.
