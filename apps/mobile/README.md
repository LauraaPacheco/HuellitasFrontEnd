# App móvil

Expo SDK 57 + React Native 0.86 + React 19. La usan adoptantes y ciudadanos.

La versión del SDK tiene que coincidir con la de Expo Go del App Store o
Play Store: Apple solo permite instalar la última, así que si Expo Go se
actualiza hay que subir el proyecto con `npx expo install --fix`.

```bash
npm run start      # abre el QR para Expo Go
npm run android    # emulador de Android
npm run ios        # simulador de iOS (solo macOS)
npm run typecheck  # revisa tipos
```

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
