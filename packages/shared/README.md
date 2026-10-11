# @huellitas/shared

Código que comparten la web y la app móvil. No importa nada del DOM ni de
react-native: solo tipos, lógica pura, el cliente HTTP y los tokens.

## Qué hay aquí

- `types/enums.ts` — las enumeraciones del dominio. **Sus valores numéricos
  son los `TINYINT` de la base de datos: no se reordenan.**
- `types/etiquetas.ts` — el texto en español y el tono de color de cada estado.
- `types/*.ts` — las entidades y los DTOs, un archivo por módulo.
- `api/client.ts` — envoltura de `fetch` con el token, manejo de errores y
  tiempo límite. Traduce los `ProblemDetails` de ASP.NET Core.
- `api/rutas.ts` — todas las rutas de la API en un solo lugar.
- `api/services/` — un servicio por módulo, construidos con `crearApi()`.
- `tokens/` — colores en tema claro y oscuro, espaciado, radios y tipografía.
- `utils/` — formato de fechas en español y validaciones de formulario.

## Cómo usarlo

```ts
import { crearApi, EstadoSolicitud, ESTADO_SOLICITUD } from '@huellitas/shared';

const api = crearApi({ urlBase, almacen });
const solicitudes = await api.adopcion.listar({ estado: EstadoSolicitud.Enviada });
```

Cada app provee su propio `almacen` de token: `localStorage` en la web,
`AsyncStorage` en móvil.
