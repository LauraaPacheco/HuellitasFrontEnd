# Integración con backend — 25 de octubre de 2026

Contrato revisado en HuellitasBackend, commit `29bbef0`. Los adaptadores compartidos sirven a web y móvil. Esta revisión no cierra la validación autenticada de extremo a extremo.

## Funciones conectadas

- HU-USU-05: consulta y edición del perfil; contraseña, correo y desactivación de cuenta. Acceso desde Mi cuenta (web) y Perfil / Seguridad de la cuenta (móvil).
- HU-USU-06: consulta y guardado de perfil adoptante. Vivienda se recibe como texto y se envía como enum; la completitud se vuelve a consultar después del guardado.
- HU-MAS-02: catálogos versionados existentes.
- HU-MAS-01: registro final, inventario propio y cambio de disponibilidad en web.
- HU-MAS-05: catálogo público y detalle móvil con fotos y contacto disponibles en la respuesta.

El perfil no devuelve rol ni refugioId: se conserva el rol de autenticación y no se inventa una asociación. Cambiar de sesión limpia la caché de consultas.

## Diferencias entre modo real y demo

En modo real se usa `/api/v1/Usuarios/perfil`, `/perfil-adoptante` y `/api/v1/Mascotas`. El inventario usa `/Mascotas/refugio/inventario` y pagina mediante `tamano`; el catálogo público usa `tamanoPagina`. Se normalizan `totalRegistros`, sexo y estados de texto.

El catálogo público admite especie, tamaño y sexo. El inventario no ofrece filtros que backend no reconoce. El registro acepta edad entera de 0 a 255 años; la fecha la asigna backend. No se envían fecha de ingreso ni temperamentos.

El asistente real conserva información local hasta confirmar el POST final: no guarda borradores remotos. Todavía no hay endpoints para subir archivos o publicar borradores. La demo conserva su flujo completo en memoria.

La edición completa permanece limitada: el detalle del backend omite los IDs de tamaño, color y raza necesarios para reconstruir el PUT sin sobrescribir datos. El cambio de disponibilidad sí usa PATCH. No se ofrecen cierres manuales de adopción.

Refugios, multimedia, historia clínica y solicitudes de adopción siguen sujetos a sus endpoints pendientes. La demo no acredita integración SQL de esas funciones.

## Validación

- 102 pruebas automatizadas y comprobación adicional de catálogos demo.
- TypeScript de los paquetes y aplicaciones; builds web normal y demo.
- API real iniciada con `/usr/local/share/dotnet/dotnet` (.NET 10).
- GET especies y catálogo público: HTTP 200, listas vacías en la BD local.
- Pendiente: login real, edición de perfiles y publicación con una cuenta de refugio verificado y catálogos cargados. No se crearon usuarios, animales ni semillas durante esta revisión.

Para probar: ejecutar backend y frontend en modo normal con la URL vigente, entrar con la cuenta correspondiente y abrir Mi cuenta / Perfil. Con refugio verificado, abrir Mascotas → Publicar mascota. En móvil, abrir Catálogo y el detalle. En un teléfono físico, localhost apunta al teléfono: usar una URL de API accesible desde ese dispositivo.
