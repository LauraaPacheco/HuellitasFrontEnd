# App móvil

Expo SDK 57 + React Native 0.86 + React 19. La usan adoptantes y ciudadanos.

La guía completa para instalar, ejecutar en demo o con backend y compilar
está en el [README de la raíz](../../README.md).

Desde la raíz del repositorio:

```bash
npm run mobile                   # abre el QR para Expo Go; a/i/w eligen destino
npm run mobile -- --clear        # reinicia con caché limpia
npm run typecheck --workspace=@huellitas/mobile
```

Configura `apps/mobile/.env`: `EXPO_PUBLIC_MODO_DEMO=true` para datos
simulados, o `false` y una `EXPO_PUBLIC_URL_API` accesible para usar el backend.
Reinicia Expo al cambiar estas variables. Expo Go debe ser compatible con
el SDK del proyecto; no actualices las dependencias automáticamente.

## Organización

- `app/` — rutas basadas en archivos (Expo Router)
  - `(tabs)/` — las cuatro pestañas: catálogo, solicitudes, reportar, perfil
  - `login.tsx`, `registro.tsx` — acceso
  - `mascota/[id].tsx` — ficha de la mascota
- `src/componentes/` — botones, campos, insignias e isotipo
- `src/lib/` — cliente de la API y contexto de sesión
- `src/temas/` — paleta según el tema del sistema

## Permisos

La app pide ubicación y cámara solo cuando el ciudadano va a reportar un
animal. Los textos de permiso están en `app.json` y explican para qué se
usan, que es lo que exigen las tiendas.

## Nota sobre el backend

`localhost` no funciona desde el celular. Hay que poner la IP de la máquina
donde corre el backend en `EXPO_PUBLIC_URL_API`.

## Reglas de estilo

Los arrays de estilos funcionan en toda la app, con una excepción: **el hijo de
un `<Link asChild>` no puede recibir un array**. Expo Router clona ese hijo con
`@radix-ui/react-slot` para inyectarle el `onPress`, y antes de clonarlo valida
que su prop `style` no sea un array; si lo es, lanza en tiempo de ejecución:

```
[expo-router]: You are passing an array of styles to a child of <Slot>.
```

El mensaje habla de `<Slot>`, no de `<Link>`, y por eso despista: no tiene nada
que ver con el elemento raíz de la pantalla. La regla es solo para el hijo
directo del link:

```tsx
// Mal: rompe en tiempo de ejecución
<Link href={`/mascota/${id}`} asChild>
  <Pressable style={[estilos.tarjeta, { borderColor: paleta.border }]}>

// Bien
<Link href={`/mascota/${id}`} asChild>
  <Pressable style={StyleSheet.flatten([estilos.tarjeta, { borderColor: paleta.border }])}>
```

La alternativa, si el aplanado estorba, es quitar el `asChild` y poner el
`<Pressable>` por fuera con `router.push()` en el `onPress`.

## Generar una demo instalable

Desde `apps/mobile`, con la cuenta y el proyecto EAS vinculados:

```bash
npx eas-cli@latest build --platform android --profile demo
npx eas-cli@latest build --platform ios --profile demo-simulador
```

El primer comando genera un APK para Android; el segundo, una app para el
simulador iOS en macOS. Para iPhone físico usa `--profile demo`, con cuenta
Apple Developer y dispositivo registrado. Ambos perfiles activan la demo sin
backend. Consulta los pasos iniciales y la firma en el README de la raíz.
