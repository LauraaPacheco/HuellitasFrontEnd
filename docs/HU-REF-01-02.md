# HU-REF-01 y HU-REF-02 Pantallas de refugios

Estado: avance de front con demo en memoria. No se declaran cerradas las HU:
falta backend y acordar los criterios de soportes, verificación y acceso.
Este cambio no modifica la base de datos ni el backend.

## Recorridos implementados

- Solicitud pública de registro: valida contacto/NIT, crea una solicitud
  pendiente y confirma recepción. No crea credenciales ni envía correo.
- Administrador: Verificación de refugios lista solicitudes con paginación;
  permite revisar datos en un modal, confirmar en un segundo modal la
  verificación o el rechazo con motivo. Un refugio verificado puede suspenderse
  con motivo, usando la operación ya prevista en el servicio.
- Refugio: Mi refugio permite editar contacto/descripción, y agregar, editar
  o eliminar requisitos, marcándolos obligatorios u opcionales.
- Perfil público web: `/refugios/:id`, con contacto, descripción y requisitos.
  Un refugio no verificado solo se muestra al administrador o a su propietario
  como vista interna; la API debe aplicar esa misma restricción.
- Móvil: desde la ficha de la mascota se abre el perfil público del refugio.
  Esta pantalla solo muestra perfiles verificados.

El NIT y la verificación no se cambian desde el editor de contacto. La cuenta
Refugio necesita `usuario.refugioId`. El login demo hidrata ese dato desde
`GET /usuarios/yo`; en modo real debe acordarse cómo lo proporciona el backend.

## Contratos propuestos del front

Estas rutas ya estaban previstas salvo la edición del perfil y la edición /
eliminación de requisitos. No son endpoints comprobados del backend:

| Método | Ruta | Entrada / respuesta |
| --- | --- | --- |
| POST | `/api/refugios/solicitar-registro` | `SolicitudRefugioDto` → `Refugio` pendiente |
| GET | `/api/refugios?pagina=1&tamanoPagina=10` | `Paginado<Refugio>`; administrador ve pendientes |
| GET | `/api/refugios/{id}` | `Refugio`, incluye requisitos |
| PUT | `/api/refugios/{id}` | `EditarRefugioDto` → `Refugio` |
| POST | `/api/refugios/{id}/verificar` | sin cuerpo; decisión administrativa |
| POST | `/api/refugios/{id}/rechazar` | `{ motivo }` |
| POST | `/api/refugios/{id}/suspender` | `{ motivo }`; solo desde Verificado |
| GET / POST | `/api/refugios/{id}/requisitos` | lista / `{ descripcion, esObligatorio }` |
| PUT / DELETE | `/api/refugios/{id}/requisitos/{requisitoId}` | edición / eliminación |

Al implementar backend, acordar las rutas versionadas y ajustar el mapa del
front. La autorización real, unicidad de NIT y persistencia son del backend.
La demo simula aislamiento por propietario y decisiones solo de administrador;
no modifica datos de SQL Server y reinicia sus cambios al recargar el cliente.

## Límites y pendientes de HU-REF-01

- Falta carga/consulta de soportes: el contrato actual no tiene archivos.
- Verificar el refugio no crea una cuenta ni asigna un rol automáticamente.
  El mecanismo de invitación, asociación de representante y correo se debe
  definir con backend; el front no inventa una contraseña ni credenciales.
- Las decisiones de rechazo se conservan, pero no hay un flujo de subsanación
  o reactivación diseñado en este incremento.
- No se ejecutaron pruebas con backend ni se cambió su implementación.

## Pruebas

`npm test` verifica solicitud pendiente, NIT duplicado, verificación/rechazo,
control de rol y propietario, protección de NIT/estado, edición de contacto y
CRUD de requisitos. También comprueba que el público solo liste verificados.

`npm run typecheck`, `npm run build:web` y `npm run build:web:demo` verifican
compilación. Revisar manualmente la demo con admin@huellitas.co y
refugio@huellitas.co (contraseña Demo1234). Falta validación en dispositivo móvil.

## Ajuste visual y navegación

El detalle y la decisión se presentan en diálogos nativos superpuestos: el
segundo deja el primero inactivo, contiene el foco y se cierra con Escape,
volviendo al detalle. Durante el guardado se bloquea el cierre. Cerrar el
detalle devuelve el foco al botón de la fila y restaura el desplazamiento.
El perfil tiene una acción Volver con destino según su entrada y el rol;
los enlaces de acción tienen apariencia de botón y los estados usan colores
con texto y borde visibles en ambos temas.

No se introduce Verificado → Pendiente. La suspensión no equivale a reiniciar
la solicitud ni implementa una reactivación. Debe acordarse con el equipo la
política de reclamos y el efecto real sobre publicaciones/adopciones existentes.
La demo solo oculta el perfil público del refugio suspendido; no simula una
cascada de cambios en otras entidades.
