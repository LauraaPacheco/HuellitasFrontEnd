# Visitas de adopción: front conectado a 15e5973

- GET /api/v1/Adopciones/mis-visitas: visitas del adoptante.
- GET /api/v1/Adopciones/refugio/visitas: visitas del refugio.
- PATCH /api/v1/Adopciones/{solicitudId}/confirmar-visita: { aceptar: true | false }.

Se muestran fecha, hora y modalidad devueltas por el servidor. Propuesta habilita
Aceptar y Rechazar en móvil si la solicitud está en Entrevista. Confirmada muestra
la aceptación y Reprogramada indica que se rechazó la fecha. Los cambios consultan
de nuevo la API; no se fabrican confirmaciones ni se modifican solicitudes por SQL.
Las listas se actualizan cada diez segundos mientras están visibles.

La bandeja web une visitas con solicitudes por solicitudId. Si hay varias visitas,
selecciona la de mayor visitaId, no la de fecha más lejana. La visita Confirmada
habilita Aprobar y Rechazar para la solicitud en Entrevista. No reabre solicitudes
aprobadas, rechazadas, cerradas, canceladas o finalizadas.

## Ajuste necesario en backend

En 15e5973 AprobarSolicitudAsync y RechazarSolicitudAsync solo permiten Enviada o
EnRevision. ConfirmarVisitaAsync cambia el estado de la visita, pero mantiene la
solicitud en Entrevista. El backend debe permitir decidir desde Entrevista cuando
su visita vigente esté Confirmada y seguir validando propietario y estado.
Actualmente puede responder 409 al pulsar Aprobar/Rechazar después de confirmar.
El front muestra ese error y no simula éxito. No se modificó el backend.
