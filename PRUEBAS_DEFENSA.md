# Pruebas para la defensa — Kick Off Mundial 2026

Guía corta para probar el sistema error por error usando PowerShell.

1. Iniciar el proyecto

Abrir PowerShell en la carpeta del proyecto y ejecuta:

npm start

Debe aparecer:

Aplicación disponible en http://localhost:5500

Abrir otra terminal de PowerShell para copiar los comandos de las pruebas.

En el navegador se ingresa a:

http://localhost:5500

F12 → Network → Fetch/XHR.

2. Comprobar el funcionamiento normal

Recargar la aplicación y revisa una petición como teams, games o stadiums.

Resultado esperado:

Status: 200 OK

Esto confirma que la aplicación y la API funcionan normalmente.

3. Probar el error 401

En la segunda terminal de PowerShell:

Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/_debug/simulate" -ContentType "application/json" -Body '{"status":401,"path":"all"}'

Regresar a la aplicación, limpiar Network y recargar.

Resultado esperado:

Peticiones en rojo con 401 Unauthorized.

Aparece el mensaje “Sesión expirada”.

Se elimina la sesión y aparece la opción “Reautenticarse”.

Volver al modo normal

Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/_debug/clear"

Pulsar Reautenticarse, iniciar sesión y comprobar que las peticiones vuelvan a 200.

4. Probar el error 429

Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/_debug/simulate" -ContentType "application/json" -Body '{"status":429,"path":"all"}'

Limpiar Network y recargar la aplicación.

Resultado esperado:

Peticiones con 429 Too Many Requests.

Reintentos automáticos después de 1, 2, 4 y 8 segundos.

La sesión permanece abierta.

La aplicación conserva la información anterior y muestra “Datos no actualizados”.

Volver al modo normal

Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/_debug/clear"

Recargar y confirmar que las peticiones vuelvan a 200.

5. Probar el error 500

Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/_debug/simulate" -ContentType "application/json" -Body '{"status":500,"path":"all"}'

Limpiar Network, recargar y esperar a que terminen los reintentos.

Resultado esperado:

Peticiones con 500 Internal Server Error.

Se realizan cuatro reintentos.

Al final aparece “Reintentos agotados” en Console.

La sesión permanece abierta.

Se conservan los datos anteriores con el aviso “Datos no actualizados”.

Volver al modo normal

Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/_debug/clear"

Recargar y confirmar que las peticiones vuelvan a 200.

6. Probar la pérdida de conexión

Con la aplicación cargada, abrir F12 → Network.

Cambiar No throttling a Offline.

No recargar la página.

Cambiar de sección dentro de la aplicación para provocar una nueva solicitud.

Resultado esperado:

Las nuevas peticiones fallan con ERR_INTERNET_DISCONNECTED.

La aplicación permanece abierta.

La sesión y los datos anteriores se conservan.

Volver al modo normal

Cambiar Offline a No throttling.

Recargar con Ctrl + R.

Confirmar que las peticiones vuelvan a 200.

7. Orden recomendado para la defensa

Haz siempre una prueba a la vez:

Comprobar 200.

Activar 401, comprobarlo y ejecutar clear.

Confirmar nuevamente 200.

Activar 429, comprobarlo y ejecutar clear.

Confirmar nuevamente 200.

Activar 500, comprobarlo y ejecutar clear.

Confirmar nuevamente 200.

Probar Offline y devolverlo a No throttling.

8. Si algo sale mal

El simulador muestra “Route not found”

No abras la ruta del simulador directamente en Chrome. Esa ruta necesita una petición POST. Usa los comandos de PowerShell de esta guía.

Las peticiones normales siguen mostrando el error

Ejecutar:

Invoke-RestMethod -Method POST -Uri "http://localhost:5500/api/_debug/clear"

Después recargar la aplicación.

La página muestra “No internet”

Devuelve Network de Offline a No throttling y recarga.

No aparece ninguna petición en Network

Seleccionar All o Fetch/XHR, limpia la lista y recarga.

El proyecto deja de responder

Revisar que la terminal donde ejecutaste npm start siga abierta. Para detener el servidor usa:

Ctrl + C

Después volver a iniciarlo con:

npm start