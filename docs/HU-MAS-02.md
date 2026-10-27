# HU-MAS-02 Catálogos paramétricos

> Actualización de integración real: consultar [INTEGRACION-BACKEND.md](INTEGRACION-BACKEND.md). Los contratos propuestos y recorridos demo descritos abajo se conservan como contexto y no sustituyen esa revisión.

Estado: base de consumo del front implementada y probada en demo. Integración
con backend pendiente; esta HU no se declara cerrada de extremo a extremo.
El formulario de publicación de HU-MAS-01 todavía no forma parte de este cambio.

## Contrato revisado en backend c703aa0

Las rutas actuales están centralizadas en `packages/shared/src/api/rutas.ts`:

| GET | Respuesta |
| --- | --- |
| `/api/v1/Catalogos/especies` | `[{ id, nombre, activo }]` |
| `/api/v1/Catalogos/razas?especieId=1` | `[{ id, nombre, activo, especieId }]` |
| `/api/v1/Catalogos/tamanos` | `[{ id, nombre, activo }]` |
| `/api/v1/Catalogos/colores` | `[{ id, nombre, activo }]` |
| `/api/v1/Catalogos/temperamentos` | `[{ id, nombre, activo }]` |

Se esperan arrays sin envoltorio ni paginación; `id` y `especieId` son números,
`nombre` es texto y `activo` es booleano. Sin `especieId` válido, razas devuelve una lista vacía. Con él, el backend
filtra por especie. El demo reproduce ese comportamiento.

Las rutas se alinearon con CatalogosController y los DTO del backend en
`c703aa0`. Las pruebas automáticas comprueban las rutas y los parámetros.
La validación HTTP por el túnel se pospuso por petición del usuario porque
el túnel no está activo; revisar el código no equivale a validar la integración.

Confirmar si el backend devuelve también opciones inactivas. El front no las
ofrece como selecciones nuevas. Conserva visible, deshabilitado y marcado el
valor inactivo que ya tuviera un registro en edición, siempre que venga en la
respuesta. Si el backend solo devuelve activos, hace falta acordar cómo resolver
los nombres y valores históricos antes de implementar la edición.

## Comportamiento del front

- Servicio compartido para los cinco catálogos, disponible para web y móvil.
- Hooks web con caché de una hora y claves separadas por especie para razas.
- Sin especie elegida no se consulta ni se habilita el selector de razas.
- Cambiar especie elimina la raza anterior y vuelve a la primera página.
- Selector con etiqueta accesible, opción inicial, carga, dependencia, lista
  vacía, error y reintento. Los campos obligatorios admiten `requerido`.
- Filtros de especie y raza conectados en el listado web de mascotas.
- Demo con filtros por especie, raza y estado; las razas con el mismo nombre
  en especies diferentes no se mezclan.

## Verificación

Desde la raíz:

```bash
node tests/catalogos.test.mjs
npm run typecheck
npm run build:web
npm run build --workspace=@huellitas/web -- --mode demo
```

La prueba de catálogos utiliza esbuild, ya instalado por Vite. Comprueba
contratos demo de los cinco catálogos, aislamiento de razas por especie,
filtro de estado con valor cero, opciones inactivas y HTML accesible de los
estados del selector. No sustituye pruebas de integración con la API real.

Para la revisión manual, ejecutar `npm run web:demo`, entrar como
`refugio@huellitas.co` con `Demo1234` y abrir Mascotas. Elegir Perro → Criollo,
cambiar a Gato y comprobar que se limpia la raza. Elegir Otro para revisar
un catálogo de razas vacío. Restablecer los filtros con “Todas las especies”.

## Antes de cerrar la integración

Confirmar rutas, forma de respuesta, política de inactivos y acceso por rol;
repetir los filtros y estados de carga/error contra los endpoints reales.
Los hooks y el selector de este cambio son web; el servicio compartido queda
listo para que la futura pantalla móvil consuma los mismos contratos.
