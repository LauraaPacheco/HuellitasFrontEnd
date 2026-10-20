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

- Git y Node.js compatible con las dependencias móviles: se recomienda Node
  22 LTS (22.13 o superior), con npm. Evita Node 23, que React Native 0.86 no soporta.
- Para probar en un celular: Expo Go compatible con el SDK 57 del proyecto.
- Para simuladores: Android Studio con un emulador configurado, o macOS con
  Xcode y un simulador de iOS.
- El backend solo hace falta para el modo normal. La demo funciona sin él.

## Descargar e instalar

```bash
git clone https://github.com/LauraaPacheco/HuellitasFrontEnd.git
cd HuellitasFrontEnd
npm ci
```

`npm ci` instala las versiones del `package-lock.json` de los tres paquetes.
No hay que instalar dependencias por separado dentro de cada app.

Copia los archivos de entorno una sola vez, sin sobrescribir una configuración
que ya tengas:

```bash
cp apps/web/.env.example apps/web/.env
cp apps/mobile/.env.example apps/mobile/.env
```

En PowerShell puedes usar `Copy-Item` en lugar de `cp`.
Todos los comandos siguientes se ejecutan desde la **raíz del repositorio**,
salvo que se indique otra carpeta. Para ejecutar las dos apps a la vez,
usa una terminal para cada una.

## Probar sin backend: modo demo

### Panel web

```bash
npm run web:demo
```

Abre la dirección que muestra Vite, normalmente http://localhost:5173.
Este comando carga `apps/web/.env.demo`, que activa los datos simulados.
No hace falta modificar `VITE_MODO_DEMO` en `.env`.

### App móvil

En `apps/mobile/.env`, deja:

```dotenv
EXPO_PUBLIC_MODO_DEMO=true
```

El archivo de ejemplo ya trae ese valor. Después ejecuta:

```bash
npm run mobile
```

Conecta el celular y el computador a la misma red y escanea el QR con
Expo Go (en iPhone, desde Cámara). También puedes pulsar `a` para un
emulador Android, `i` para el simulador iOS o `w` para abrir la app móvil
en el navegador. Los simuladores requieren las herramientas de los requisitos.
La versión móvil en navegador es distinta del panel web de Vite.

## Ejecutar con backend: modo normal

Primero levanta el backend desde su propio repositorio. Confirma con el equipo
su URL, puerto y credenciales reales: los usuarios demo no crean cuentas en
la base de datos del backend.

### Panel web

En `apps/web/.env`, configura:

```dotenv
VITE_MODO_DEMO=false
VITE_URL_API=
URL_API_TUNEL=https://localhost:7296
TUNEL_TOKEN=
```

Cambia `URL_API_TUNEL` por la dirección real del backend. Aunque se llame
“túnel”, también acepta una dirección local. Deja `VITE_URL_API` vacío para
que el navegador pida a `/api` y el proxy de Vite reenvíe al backend.
Si usas un túnel protegido, completa `TUNEL_TOKEN` con su token vigente;
para un backend local sin túnel, déjalo vacío.

```bash
npm run web
```

### App móvil

En `apps/mobile/.env`, configura, por ejemplo:

```dotenv
EXPO_PUBLIC_MODO_DEMO=false
EXPO_PUBLIC_URL_API=http://192.168.1.20:5001
EXPO_PUBLIC_TUNEL_TOKEN=
```

Reemplaza la IP y el puerto por los del backend. En un celular físico,
`localhost` apunta al propio teléfono: usa una dirección accesible desde
el celular y configura el backend para aceptar conexiones de la red.
También puedes usar un túnel HTTPS; si está protegido, completa
`EXPO_PUBLIC_TUNEL_TOKEN`. Un certificado HTTPS local que el teléfono no
reconoce puede impedir la conexión.

```bash
npm run mobile
```

La app móvil en navegador llama directamente a la API y necesita que el
backend permita su origen mediante CORS; no usa el proxy del panel web.

### Cambiar entre modos

Detén el servidor con `Ctrl+C` y vuelve a iniciarlo después de cambiar los
archivos `.env`. Para web, usa `npm run web:demo` o `npm run web`. Para móvil,
cambia `EXPO_PUBLIC_MODO_DEMO` entre `true` y `false` y reinicia Expo.
Si conserva una sesión anterior, cierra sesión e ingresa con las credenciales
del modo elegido. Si Expo conserva datos de caché, reinícialo con:

```bash
npm run mobile -- --clear
```

## Usuarios y alcance de la demo

Las apps responden con datos simulados sin llamar al backend. Esto permite
probar pantallas cuyos endpoints todavía no existen o requieren roles que
no estén asignados en la base de datos real.

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


## Compilar y revisar

Ejecutar un servidor de desarrollo y generar una compilación son pasos distintos.

### Panel web

```bash
# Compilación normal: usa la configuración de producción disponible.
npm run build:web

# Compilación con datos simulados.
npm run build --workspace=@huellitas/web -- --mode demo

# Servir localmente la última compilación generada.
npm run preview --workspace=@huellitas/web
```

El resultado queda en `apps/web/dist/`. Abre la dirección que imprime
`preview`. El modo demo o normal queda definido al compilar: para cambiarlo,
genera otra compilación. La última reemplaza el contenido de `dist/`.

El proxy de `/api` configurado en este repositorio es del servidor de
desarrollo. Para publicar una compilación normal, configura un proxy de
`/api` en el hosting o una URL pública en `VITE_URL_API` al compilar, con
CORS habilitado en el backend. El hosting también debe servir `index.html`
para las rutas de React Router. `preview` sirve para revisar el build;
no sustituye la configuración de producción ni conecta por sí solo el backend.

### App móvil

Expo Go permite probar el código, pero no genera un APK ni un instalable de iOS.
Para compilar y ejecutar localmente con las herramientas nativas instaladas:

```bash
npm exec --workspace=@huellitas/mobile -- expo run:android

# Solo en macOS con Xcode:
npm exec --workspace=@huellitas/mobile -- expo run:ios
```

Estos comandos pueden generar las carpetas nativas `android/` e `ios/` y
compilaciones de desarrollo; no son paquetes listos para publicar.
El modo de datos depende de `EXPO_PUBLIC_MODO_DEMO` al preparar la compilación.

#### Compilación demo instalable con EAS

`apps/mobile/eas.json` incluye los perfiles `demo` (APK Android o iPhone
físico) y `demo-simulador` (simulador iOS). Ambos fijan
`EXPO_PUBLIC_MODO_DEMO=true` durante el build: no necesitan backend ni Metro
para abrir la app. Las credenciales de prueba son las de la sección demo.

La primera vez, desde la carpeta móvil, inicia sesión en Expo y vincula el
proyecto a tu cuenta o al proyecto compartido del equipo:

```bash
cd apps/mobile
npx eas-cli@latest login
npx eas-cli@latest init
```

Si ya existe un proyecto EAS del equipo, vincúlalo; no crees uno duplicado.
`init` guarda el identificador del proyecto en la configuración de Expo.
Revisa esos cambios antes de confirmarlos en Git.

Genera un APK para instalar y compartir en Android:

```bash
npx eas-cli@latest build --platform android --profile demo
```

Para el simulador iOS de macOS:

```bash
npx eas-cli@latest build --platform ios --profile demo-simulador
```

Para un iPhone físico:

```bash
npx eas-cli@latest device:create
npx eas-cli@latest build --platform ios --profile demo
```

La distribución interna en iPhone requiere cuenta de Apple Developer y
registrar el dispositivo para la firma. El build de simulador no se instala
en un iPhone físico. EAS proporciona el enlace al resultado cuando termina.
Estos perfiles son para pruebas internas; no publican en las tiendas.
Todavía queda definir un perfil de producción y sus credenciales.

Para probar sin generar instalables, usa el flujo de Expo Go explicado arriba.

### Verificación del código

```bash
npm test             # pruebas automáticas y regresiones de catálogos
npm run test:coverage # pruebas con informe de cobertura en coverage/
npm run test:watch    # Vitest en modo observación
npm run typecheck    # revisa los tres paquetes
npm run build:web    # compila el panel web
```

## Problemas frecuentes al iniciar

- **Faltan dependencias:** ejecuta `npm ci` desde la raíz. `react-native-web`
  y `@expo/metro-runtime` ya están declarados para la app móvil.
- **El QR no conecta:** revisa que celular y computador estén en la misma red
  y que el firewall permita la conexión a Expo.
- **La demo sigue activa en móvil:** el `.env.example` trae
  `EXPO_PUBLIC_MODO_DEMO=true`; cámbialo a `false` y reinicia Expo.
- **La API no responde:** verifica la URL, el backend levantado y, si aplica,
  el token actualizado del túnel. Desde el celular evita `localhost`.
- **Expo Go indica un SDK incompatible:** usa un cliente compatible con el
  SDK del proyecto o una compilación de desarrollo. No actualices todas las
  dependencias automáticamente para resolverlo.

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

## Alcance de las pruebas

Vitest comprueba validaciones compartidas, adaptación de sesión y roles,
expiración, cliente HTTP (JSON, archivos, errores, autorización y timeout),
acceso a rutas web y autenticación demo. `npm test` también ejecuta las
regresiones de catálogos de `tests/catalogos.test.mjs`.

El informe de cobertura de Vitest muestra también servicios compartidos sin
pruebas; no implica cobertura completa del proyecto. El script separado de
catálogos no contribuye a ese porcentaje. `test:watch` ejecuta las suites de
Vitest; para incluir catálogos usa `npm test`.

Estas pruebas no sustituyen la integración con el backend ni pruebas de
interacción y presentación en dispositivos iOS/Android. Los builds EAS se
preparan con los perfiles indicados, pero no se han ejecutado en esta tarea.
