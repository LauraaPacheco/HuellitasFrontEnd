# Panel web

Vite + React + TypeScript. Lo usan refugios y administradores.

```bash
npm run dev        # desarrollo en http://localhost:5173
npm run build      # compila a dist/
npm run typecheck  # revisa tipos sin compilar
```

El proxy de Vite manda todo `/api` al backend, así que en desarrollo no hay
problemas de CORS. La URL se configura en `.env` con `VITE_URL_API`.

## Organización

- `src/app/` — router y arranque de la aplicación
- `src/modulos/` — una carpeta por módulo del sistema
- `src/componentes/ui/` — botones, campos, insignias
- `src/componentes/layout/` — menú lateral y encabezados
- `src/estilos/tokens.css` — variables CSS del design system
- `src/lib/api.ts` — instancia del cliente con el token en localStorage
