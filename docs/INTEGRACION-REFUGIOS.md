# Refugios: integración con el backend a2c6491

Web y Expo usan ServicioRefugios compartido. En conexión real consume:

| Operación | Ruta | Adaptación |
| --- | --- | --- |
| Listar verificados | GET /api/v1/Refugios | pagina y tamano; totalRegistros → total |
| Perfil público | GET /api/v1/Refugios/{id} | refugioId → id; verificado → estado de verificación público |
| Mi refugio | GET /api/v1/Refugios/mi-perfil | ID de la asociación del usuario; estado interno del DTO |
| Actualizar mi refugio | PUT /api/v1/Refugios/mi-perfil | Solo descripción, dirección, teléfono y redes sociales |
| Agregar requisito | POST /api/v1/Refugios/requisitos | descripción, esObligatorio y orden |
| Aprobar o rechazar | PATCH /api/v1/Refugios/{id}/verificar | aprobado; motivoRechazo al rechazar |

Los requisitos mapean requisitoId a id. El backend devuelve mensajes al guardar:
no se interpretan como entidades. El perfil se vuelve a consultar tras guardar.
Mi-perfil actualmente no incluye los requisitos en su consulta EF; se complementa
con el detalle del mismo refugio para mostrar la lista actual.

NIT, encargado, fecha de verificación y estadísticas no llegan en estos DTOs.
No se muestran valores inventados ni se permite editar campos que el PUT ignora.
La lista pública no se presenta como bandeja de solicitudes pendientes.

El controlador no expone solicitud de registro, listado administrativo de
pendientes, suspensión, edición ni eliminación de requisitos. Esos controles se
ocultan en conexión real y el cliente bloquea llamadas a rutas inexistentes.
La demostración conserva su contrato y sus operaciones anteriores en memoria.
No se modificó el backend ni se registraron refugios, mascotas o requisitos de prueba.

Swagger local: http://localhost:5046/swagger/index.html

## Seguimiento de solicitudes de adopción

El botón «Poner en revisión» en la bandeja del refugio consume
`PATCH /api/v1/Adopciones/{id}/revisar` (backend 7993c8a). Solo se ofrece
para solicitudes Enviadas. La propiedad del refugio y la transición se validan
en el servidor. Tras guardar se vuelve a consultar la bandeja; los conflictos
se muestran sin cambiar el estado de forma ficticia.

El catálogo y Mis solicitudes de Expo consultan cambios cada 10 segundos
mientras la pantalla está enfocada y la app está activa. Al volver a la
pantalla o reabrir la app consultan de nuevo. La bandeja web también se
actualiza cada 10 segundos mientras está visible. No usa sockets ni implica
una actualización instantánea: depende de la conectividad y del intervalo.
