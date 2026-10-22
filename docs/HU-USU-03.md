# HU-USU-03 Recuperación y restablecimiento

Estado: front alineado con el backend `c703aa0`, probado en demo y con pruebas
de contrato. Integración HTTP y correo real pendientes: el usuario indicó
que el túnel no está activo y pidió omitir esas pruebas por ahora.

## Recorrido

En web y móvil: Recuperar contraseña → escribir correo → Enviar código →
Ya tengo el código → escribir código, contraseña nueva y confirmación →
Cambiar contraseña → volver a iniciar sesión.

El correo real contiene un token para copiar; no un enlace al formulario.
El backend lo configura con vigencia de 30 minutos y uso único.
Los formularios validan código obligatorio, contraseña de entre 8 y 100
caracteres y confirmación coincidente. Un error conserva los valores para
reintentar; el éxito limpia los campos sensibles. Puede solicitarse otro código.

## Contrato

- `POST /api/v1/Usuarios/recuperar` con `{ correo }`.
- `POST /api/v1/Usuarios/restablecer` con `{ token, nuevaContrasena }`.
- El backend devuelve mensaje genérico al solicitar para no revelar si existe
  el correo. El front conserva esa misma política.

Las rutas se centralizan en `packages/shared/src/api/rutas.ts`.
El túnel y sus credenciales no se modificaron.

## Pruebas

```bash
npm test
npm run typecheck
npm run build:web
npm run build:web:demo
```

En demo, solicitar primero el código y escribir `demo-recuperacion`. El
simulador permite un uso por solicitud y rechaza códigos incorrectos o usados.
No envía correos ni cambia contraseñas de las cuentas demo: siguen usando
`Demo1234`. Reiniciar el cliente demo reinicia también esta simulación.

Se revisó manualmente el recorrido de la web demo. Falta la validación en
dispositivos y, cuando el túnel esté disponible, la recepción de correo,
restablecimiento, rechazo por vencimiento/reutilización e inicio de sesión
con la nueva contraseña contra el backend real.
