# Panel web

Vite + React + TypeScript. Lo usan refugios y administradores.

La guía completa está en el [README de la raíz](../../README.md).
Desde la raíz del repositorio:

```bash
npm run web                         # desarrollo con backend
npm run web:demo                    # desarrollo sin backend
npm run build:web                   # compila a apps/web/dist/
npm run build --workspace=@huellitas/web -- --mode demo
npm run preview --workspace=@huellitas/web
npm run typecheck --workspace=@huellitas/web
```

Configura `apps/web/.env` antes de usar el backend. Con `VITE_URL_API` vacío,
el proxy de Vite reenvía `/api` a `URL_API_TUNEL` durante el desarrollo.
En producción hay que configurar el proxy en el hosting o usar una URL
pública de API con CORS; el proxy de desarrollo no se incluye en `dist/`.

## Organización

- `src/app/` — router y arranque de la aplicación
- `src/modulos/` — una carpeta por módulo del sistema
- `src/componentes/ui/` — botones, campos, insignias
- `src/componentes/layout/` — menú lateral y encabezados
- `src/estilos/tokens.css` — variables CSS del design system
- `src/lib/api.ts` — instancia del cliente con el token en localStorage
