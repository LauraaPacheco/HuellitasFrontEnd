# Huellitas — Front

Plataforma híbrida de adopción y trazabilidad animal para Cali.
Trabajo de grado, Institución Universitaria Antonio José Camacho.

Este repositorio contiene el front: la **app móvil** del adoptante y el
**panel web** de refugios y administradores. El backend (.NET + EF Core)
vive en un repositorio aparte.

## Estructura

```
HuellitasFront/
├── packages/shared/     Código que usan las dos apps
│   ├── types/           Enums y entidades (espejo de la base de datos)
│   ├── api/             Cliente HTTP y servicios por módulo
│   ├── tokens/          Colores, tipografía, espaciado y radios
│   └── utils/           Fechas y validaciones
├── apps/web/            Panel web: Vite + React + React Router
└── apps/mobile/         App móvil: Expo + React Native + Expo Router
```

Los tipos y el cliente de la API se escriben **una sola vez** en
`packages/shared`. Si el backend cambia un contrato, se ajusta ahí y las
dos apps se enteran en tiempo de compilación.

## Requisitos

- Node 20 o superior
- Para la app móvil: la aplicación **Expo Go** en el celular

## Primera vez

```bash
npm install
```

Un solo `npm install` en la raíz instala todo: npm workspaces resuelve
las dependencias de los tres paquetes.

Luego copia los archivos de entorno:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

## Levantar los proyectos

```bash
npm run web        # panel web en http://localhost:5173, contra el backend
npm run web:demo   # lo mismo pero con datos simulados (ver más abajo)
npm run mobile     # app móvil: escanea el QR con Expo Go
```

Para que el celular alcance el backend no sirve `localhost`: hay que poner
la IP de la máquina en `apps/mobile/.env`, por ejemplo
`EXPO_PUBLIC_URL_API=http://192.168.1.20:5001`.

## Modo demostración

Las apps pueden correr con datos simulados, sin backend. Sirve para dos
cosas que hoy no se pueden revisar contra la API:

- Pantallas cuyo endpoint todavía no existe (mascotas, reportes,
  seguimientos, indicadores).
- Pantallas que piden un rol que la base de datos no tiene asignado:
  Solicitudes y Mascotas exigen sesión de refugio.

En la web se levanta con un comando, sin tocar el `.env`:

```bash
npm run web:demo
```

Carga `apps/web/.env.demo` encima de `.env`, así que el token del túnel
sigue en su sitio y no hay que acordarse de devolver ninguna variable.
`npm run web` sigue yendo contra el backend de verdad.

En la móvil todavía se hace a mano, porque Expo no tiene modos:

```
EXPO_PUBLIC_MODO_DEMO=true   # en apps/mobile/.env
```

Usuarios de prueba, todos con la contraseña `Demo1234`:

| Correo | Rol | Qué ve |
|---|---|---|
| `admin@huellitas.co` | Administrador | Todo el menú, incluida verificación de refugios |
| `refugio@huellitas.co` | Refugio | Solicitudes, mascotas, reportes y seguimientos |
| `adoptante@huellitas.co` | Adoptante | La app móvil con su solicitud en curso |

Los datos viven en `packages/shared/src/demo/`. Nada se guarda: al recargar
vuelve al estado inicial. Ninguna pantalla cambia entre un modo y el otro:
`ClienteDemo` extiende `ClienteApi` y solo sobrescribe `peticion()`, así que
los servicios y las pantallas no se enteran.

Con el servidor levantado hay además una galería de componentes en
`/galeria`, con las ilustraciones, los estados vacíos y los botones en los
dos temas. No existe en ningún build.


## Verificar antes de subir cambios

```bash
npm run typecheck    # revisa los tres paquetes
npm run build:web    # compila el panel web
```

## Convenciones

- **Todo en español**: nombres de archivos, variables, funciones y comentarios.
- **Los enums no se reordenan.** Sus valores numéricos son los `TINYINT`
  de la base de datos; cambiar un número corrompe los datos guardados.
- **Ningún estado se comunica solo con color.** La insignia siempre lleva
  su texto al lado, para que la pantalla se lea con daltonismo o bajo el sol.
- **El control de acceso real está en el backend.** Lo que hace el front es
  no mostrar pantallas que el usuario no podría usar.
- **Área tocable mínima de 44×44**, aunque el ícono sea de 24.

## Reparto del equipo

| Capa | Responsable |
|---|---|
| Base de datos | Jean Felipe García Arias |
| Back-end | Mateo Alessandro Cuellar Cossio |
| Front-end móvil y web | Laura Alejandra Pacheco Caucali |

## Estado

Implementado: estructura del monorepo, tipos de las 35 entidades, cliente
de la API con sus servicios, autenticación con JWT, catálogo de mascotas,
ficha, bandeja de solicitudes y reporte ciudadano con ubicación.

Pendiente: formulario de adopción, seguimiento post-adopción, panel de
indicadores, verificación de refugios y el Match.
