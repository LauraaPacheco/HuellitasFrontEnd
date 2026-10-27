# HU-USU-05 y HU-USU-06 Perfiles de usuario

> Actualización de integración real: consultar [INTEGRACION-BACKEND.md](INTEGRACION-BACKEND.md). Los contratos propuestos y recorridos demo descritos abajo se conservan como contexto y no sustituyen esa revisión.

Estado: formularios móviles implementados y probados en demo, pendientes de
integración real. No se consideran historias cerradas de extremo a extremo.

## Alcance

Desde Perfil se puede abrir Datos personales para editar nombre y teléfono.
El correo es de consulta: el DTO actual no permite modificarlo.
El formulario conserva los valores si falla el guardado y muestra validación,
carga, error, reintento de consulta y confirmación de éxito.

Los adoptantes también pueden completar o editar vivienda, espacio,
presencia de niños, otras mascotas, tiempo disponible y experiencia previa.
Se distingue una respuesta No de una pregunta sin responder. La completitud
se toma de la respuesta del servicio, no se calcula en la pantalla.

Guardar actualiza la sesión móvil y su copia almacenada. El servicio demo
mantiene las ediciones separadas por usuario durante su ejecución; al
reiniciar la aplicación, los datos simulados del servicio vuelven a su semilla.
No hay guardado de datos reales en demo. Los formularios se consultan de nuevo
al abrirlos; no se habilita la edición si falla la consulta inicial.

## Contratos que el front tiene preparados

| Método y ruta actual | Entrada / salida |
| --- | --- |
| `GET /api/usuarios/yo` | `Usuario`, con `perfil` o `null` |
| `PUT /api/usuarios/yo` | `{ nombre, telefono }` → `Usuario` actualizado |
| `PUT /api/usuarios/yo/perfil-adoptante` | `PerfilAdoptanteDto` → `PerfilAdoptante` con completitud |

Se usan las rutas centralizadas del front; todavía no son rutas confirmadas
para estas dos HU en el backend. Los detalles están en
`packages/shared/src/types/usuarios.ts`. Vivienda usa el enum existente:
Casa=0, Apartamento=1, Finca=2. Confirmar estos números con backend.

El perfil de adoptante requiere sesión y rol Adoptante. El backend debe validar
autorización y datos, y calcular `porcentajeCompletitud` también con respuestas
false. El demo devuelve 100 al guardar los seis campos válidos.

## Verificación

```bash
npm test
npm run typecheck
```

Las pruebas nuevas verifican campos obligatorios, teléfono, vivienda con valor
cero, respuestas false, rechazo de perfiles incompletos, guardado/consulta en
demo, aislamiento entre cuentas, contexto de sesión restaurado y rechazo de
escritura sin sesión o con un rol incorrecto.

Revisión manual en Expo Web demo: iniciar sesión como adoptante, abrir Perfil,
editar datos personales y comprobar el nombre al volver. Editar el perfil de
adoptante, guardar, volver a abrir y comprobar las respuestas conservadas.
Falta comprobar teclado, navegación y presentación en dispositivos nativos.

## Backend y túnel

Revisado el remoto `origin/main` del backend en el commit `c703aa0`, sin cambiar
su checkout. Ya contiene HU-USU-03 y HU-MAS-02, pero su controlador Usuarios aún
no expone las operaciones de consulta/edición de estos perfiles.

La conexión existente por túnel se conserva: móvil usa
`EXPO_PUBLIC_URL_API` y `EXPO_PUBLIC_TUNEL_TOKEN`; la web usa el proxy de Vite
con `URL_API_TUNEL` y `TUNEL_TOKEN`. No se cambian estos valores ni se incluyen
credenciales en esta documentación.

Actualización de integración de las HU previas:

- El front ya usa `/api/v1/Catalogos/...`; razas sin especie devuelve lista
  vacía tanto en demo como en el backend revisado.
- Recuperación usa `POST /api/v1/Usuarios/recuperar` y
  `POST /api/v1/Usuarios/restablecer`, con formularios para el código en web
  y móvil. Los detalles están en `HU-USU-03.md`.
- Se pospuso la prueba HTTP real por petición del usuario: el túnel no está
  activo. Esto no cambia los pendientes de backend de HU-USU-05/06.
