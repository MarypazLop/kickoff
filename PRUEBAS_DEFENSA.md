# Pruebas para la defensa — Kick Off Mundial 2026

Guía paso a paso para demostrar resiliencia (401/429/500, reintentos, caché,
offline) durante la exposición. Todos los comandos incluyen la variante para
**PowerShell** (la terminal por defecto en Windows 10/11) y, cuando cambia,
la variante para **CMD**.

## 1. Instalar dependencias

El proyecto no usa dependencias externas (solo `http`, `fs`, `path` de
Node.js), así que no hay paquetes que instalar. Solo se necesita Node.js 18+.

```powershell
node -v
```

Si no aparece una versión `v18` o superior, instala Node.js desde
https://nodejs.org antes de continuar.

## 2. Iniciar el proyecto

PowerShell / CMD (desde la carpeta del proyecto):

```powershell
npm start
```

Equivalente directo (sin npm):

```powershell
node server.js
```

Deberías ver:

```
Aplicación disponible en http://localhost:5500
[DEBUG] Simulador de errores disponible en /api/_debug/simulate (ver PRUEBAS_DEFENSA.md).
```

## 3. URL local

Abre en el navegador: **http://localhost:5500**

## 4. Probar una petición normal

1. Abre DevTools (`F12`) → pestaña **Network**.
2. Inicia sesión o crea una cuenta.
3. Entra a cualquier vista (por ejemplo "Tour de Sedes").
4. En Network deberías ver `GET /api/get/stadiums` con status `200`.
5. En Console deberías ver: `[API] GET /get/stadiums`.

> Nota: esta prueba requiere que tu máquina tenga salida a Internet hacia
> `worldcup26.ir` (el servidor local solo hace de proxy). Si no hay
> conexión, ver la sección 13 (modo offline / caché).

## 5. Provocar un 401 (sesión expirada)

**Opción A — desde la Consola del navegador** (recomendada, no requiere
terminal aparte). Con la app abierta y una sesión iniciada:

```js
await fetch('/api/_debug/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 401, path: 'all' }),
});
```

Luego cambia de vista o recarga: la próxima petición recibirá `401` real
(visible en Network), se borrará el token/usuario guardado y aparecerá el
modal **"Sesión expirada"**. La interfaz de fondo sigue visible; no hay
recarga automática de la página.

**Opción B — desde una terminal (PowerShell)**:

```powershell
Invoke-RestMethod -Uri http://localhost:5500/api/_debug/simulate -Method POST -ContentType "application/json" -Body '{"status":401,"path":"all"}'
```

**Opción B — CMD / curl:**

```cmd
curl -X POST http://localhost:5500/api/_debug/simulate -H "Content-Type: application/json" -d "{\"status\":401,\"path\":\"all\"}"
```

Resultado esperado: 1 sola petición con status `401` en Network, consola con
`[AUTH] Sesión eliminada por respuesta 401`, un único modal (aunque cambies
de vista varias veces), botón **Reautenticarse** que regresa al login sin
recargar la página.

## 6. Provocar un 429 (demasiadas solicitudes)

```js
await fetch('/api/_debug/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 429, path: '/get/games' }),
});
```

(`path` puede ser cualquier endpoint: `/get/games`, `/get/teams`,
`/get/groups`, `/get/stadiums`, o `"all"` para todos).

Navega a una vista que use ese endpoint (por ejemplo "Agenda Simultánea").
En Network deberás ver **5 peticiones** a `/api/get/games`, todas con status
`429` real: 1 original + 4 reintentos. En pantalla aparece la barra
"Reintento X/4" con countdown visible (8… 7… 6…). En Console:

```
[API] GET /get/games
[API] HTTP 429 en /get/games
[API] Reintento 1 de 4 en 1 segundo
[API] HTTP 429 en /get/games
[API] Reintento 2 de 4 en 2 segundos
[API] HTTP 429 en /get/games
[API] Reintento 3 de 4 en 4 segundos
[API] HTTP 429 en /get/games
[API] Reintento 4 de 4 en 8 segundos
[API] HTTP 429 en /get/games
[API] Reintentos agotados para /get/games
```

Si hay caché de ese endpoint, se muestran los datos con la insignia
**"Datos no actualizados"** (persistente, sin auto-ocultarse). Si no hay
caché, la vista muestra un error local con botón **Reintentar**.

## 7. Provocar un 500 (error interno)

Igual que el 429, cambiando el status:

```js
await fetch('/api/_debug/simulate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: 500, path: '/get/teams' }),
});
```

Mismo comportamiento: 5 peticiones visibles en Network con status `500`
real, 4 reintentos con backoff 1s/2s/4s/8s, countdown visible, caché o error
local al agotarse.

**PowerShell equivalente:**

```powershell
Invoke-RestMethod -Uri http://localhost:5500/api/_debug/simulate -Method POST -ContentType "application/json" -Body '{"status":500,"path":"/get/teams"}'
```

## 8. Desactivar el modo de prueba

```js
await fetch('/api/_debug/clear', { method: 'POST' });
```

**PowerShell:**

```powershell
Invoke-RestMethod -Uri http://localhost:5500/api/_debug/clear -Method POST
```

**CMD / curl:**

```cmd
curl -X POST http://localhost:5500/api/_debug/clear
```

Para confirmar que quedó apagado:

```powershell
Invoke-RestMethod -Uri http://localhost:5500/api/_debug/status
```

Debe responder `"enabled": false`. A partir de ahí todas las peticiones
vuelven a comportarse con normalidad de inmediato (no hace falta reiniciar
el servidor). El simulador **solo funciona en localhost/desarrollo**: si el
servidor corre con `NODE_ENV=production` o se accede desde otra IP, las
rutas `/api/_debug/*` responden `403` y nunca alteran el tráfico real.

## 9. Qué revisar en Network

- El status HTTP de cada petición (`200`, `401`, `429`, `500`) es el real
  devuelto por el servidor local, no uno inventado en el frontend.
- Al simular 429/500 deben verse **5 peticiones** al mismo endpoint (1 +
  4 reintentos), nunca más ni menos.
- El header `Authorization: Bearer <token>` debe estar presente en las
  peticiones a `/api/get/*` cuando hay sesión iniciada, y **ausente** (no
  `"Bearer null"`) si no hay token.

## 10. Qué mensajes deben aparecer en Console

Formato usado por `js/api.js` (ver también `[CACHE]`, `[AUTH]` y `[FLAGS]`):

```
[API] GET /get/games
[API] HTTP 500 en /get/games
[API] Reintento 1 de 4 en 1 segundo
[API] Reintento 2 de 4 en 2 segundos
[API] Reintentos agotados para /get/games
[CACHE] Mostrando datos no actualizados de /get/games (guardados …)
[AUTH] Sesión eliminada por respuesta 401
```

Nunca debe aparecer el JWT completo, la contraseña, ni un `alert()`.

## 11. Cómo comprobar el token

En Console:

```js
localStorage.getItem('wc2026_token')
```

Debe mostrar el JWT (o `null` si no hay sesión). Nunca se registra
completo en los `console.*` de `api.js` (solo se usa internamente en el
header `Authorization`).

## 12. Cómo comprobar las claves de caché

En Console:

```js
Object.keys(localStorage).filter(k => k.startsWith('wc2026_cache_'))
```

Cada endpoint tiene su propia clave, por ejemplo:

```
wc2026_cache_/get/games
wc2026_cache_/get/teams
wc2026_cache_/get/groups
wc2026_cache_/get/stadiums
```

Para ver el contenido de una:

```js
JSON.parse(localStorage.getItem('wc2026_cache_/get/games'))
// { data: {...}, path: '/get/games', savedAt: 1753..., version: 1 }
```

## 13. Cómo activar el modo Offline

1. DevTools → pestaña **Network** → menú de límite de red → **Offline**.
2. Navega entre vistas que ya visitaste (para que usen su caché) y también
   alguna que no hayas visitado (para ver el error "sin caché").

## 14. Cómo probar con caché

1. Con conexión normal, visita cada vista al menos una vez (para que
   `api.js` guarde su caché por endpoint).
2. Actívate el modo Offline (paso 13) o simula un 500/429 (pasos 6-7).
3. Recarga o cambia de vista: debe aparecer el contenido cacheado con la
   insignia **"Datos no actualizados"**, persistente hasta que:
   - se recupera la red y llega una respuesta nueva, o
   - el usuario pulsa **Reintentar** manualmente.

## 15. Cómo probar sin caché

Usa un perfil/pestaña de incógnito (localStorage vacío) o borra las claves:

```js
Object.keys(localStorage).filter(k => k.startsWith('wc2026_cache_')).forEach(k => localStorage.removeItem(k));
```

Con la red desconectada o un 500/429 simulado, la vista debe mostrar un
error local con botón **Reintentar** — nunca una pantalla en blanco.

## 16. Cómo verificar los reintentos

- Consola: deben aparecer exactamente 4 líneas `[API] Reintento N de 4…`.
- Network: 5 peticiones al mismo endpoint.
- Tiempos entre peticiones: ~1s, ~2s, ~4s, ~8s (puedes verificarlo con la
  columna de tiempo de Network o cronometrando el countdown en pantalla).

## 17. Resultado esperado en cada prueba

| Prueba | Resultado esperado |
|---|---|
| Petición normal | `200 OK`, datos reales, sin advertencias |
| 401 simulado | 1 petición `401`, sesión borrada, 1 modal, sin reload |
| 429 simulado | 5 peticiones `429`, countdown 1-2-4-8s, caché o error final |
| 500 simulado | 5 peticiones `500`, countdown 1-2-4-8s, caché o error final |
| Offline con caché | Datos cacheados + insignia persistente |
| Offline sin caché | Error local + botón Reintentar, sin pantalla en blanco |
| Recuperación | Al reintentar con red/API ok, se actualiza el dato y desaparece la insignia |
| Agenda | Botones "fecha anterior/siguiente" navegan solo entre fechas con partidos |
| Skeletons | Aparecen durante la carga/cambio de fecha y desaparecen con datos o error |
| Banderas | Bandera real junto al nombre en dashboard, matriz, tour, agenda y timeline; placeholder + aviso en consola si no hay bandera reconocida |
| Matriz | 12 grupos, nombre real de cada uno, diagonal deshabilitada, "Pendiente" si no hay resultado |
| Responsive | Layout usable en escritorio, tablet y celular, sin scroll horizontal de página |

## 18. Cómo recuperar el funcionamiento normal

1. Apaga cualquier simulación: `POST /api/_debug/clear` (paso 8).
2. Vuelve a activar la red en DevTools (quitar "Offline").
3. Si quedó el modal de sesión expirada en pantalla, pulsa
   **Reautenticarse** e inicia sesión de nuevo.
4. Si algo quedó en un estado raro, un refresco normal de la página (F5)
   es seguro: el token válido se reutiliza automáticamente
   (`tryAutoLogin`), no se pierde ningún dato cacheado.

---

## Empaquetar el proyecto para entrega (ZIP)

**PowerShell** (excluye `.git`, `node_modules`, logs y temporales):

```powershell
Compress-Archive -Path * -DestinationPath ..\kickoff-entrega.zip -Force `
  -CompressionLevel Optimal
# Luego, si el zip incluyó .git o node_modules por error, ábrelo y bórralos
# manualmente, o usa 7-Zip con exclusiones:
```

**Con 7-Zip (recomendado, soporta exclusiones nativas):**

```powershell
7z a ..\kickoff-entrega.zip . -xr!.git -xr!node_modules -xr!*.log -x!.env
```

Antes de comprimir, confirma que el proyecto reinstala sin problemas:

```powershell
Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
npm install
npm start
```

Como el proyecto no tiene dependencias de terceros, `npm install` no
descargará nada adicional; sirve solo para confirmar que `package.json`
está bien formado.

---

## Limitaciones conocidas

- El simulador de errores (`/api/_debug/*`) **nunca** contacta la API real:
  cuando está activo, responde de inmediato con el status simulado. Esto es
  intencional (no satura ni modifica `worldcup26.ir`).
- Las pruebas de "petición normal" (sección 4) requieren salida real a
  Internet hacia `worldcup26.ir` desde la máquina donde corre el servidor.
