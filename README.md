# kickoff
Categoría B: Interfaces Interactivas y DOM Avanzado

## Kick Off · Mundial 2026 — Sala de Control

Panel interactivo (vanilla JS + Node) con Tour de Sedes, Agenda Simultánea,
Timeline Infinito, Dashboard del Fanático y Matriz de Grupos, consumiendo la
API pública del Mundial 2026 vía un proxy local con autenticación JWT,
reintentos con backoff exponencial, caché independiente por endpoint y
banderas reales por selección.

### Ejecutar

```bash
npm start
# o
node server.js
```

Luego abre **http://localhost:5500**.

### Pruebas y demostración para la defensa

Ver **[PRUEBAS_DEFENSA.md](./PRUEBAS_DEFENSA.md)** para instrucciones
detalladas (Windows/PowerShell incluido): cómo provocar y probar los
errores 401/429/500 de forma controlada, verificar reintentos y backoff,
probar el modo offline y la caché por endpoint, y empaquetar el proyecto
para entrega.
