import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 5500);
const API_ORIGIN = 'https://worldcup26.ir';
const IS_DEV = process.env.NODE_ENV !== 'production';

/* -------------------------------------------------------------------------
 * SIMULADOR LOCAL DE ERRORES (401 / 429 / 500)
 * -------------------------------------------------------------------------
 * Solo activo cuando IS_DEV es true Y la petición llega desde localhost.
 * Nunca toca la API real: cuando la simulación está encendida para un
 * endpoint, el proxy responde de inmediato con el status HTTP indicado,
 * sin llegar a hacer fetch() contra worldcup26.ir.
 *
 * Se activa/desactiva en caliente con dos rutas locales:
 *   POST /api/_debug/simulate  { "status": 401|429|500, "path": "/get/games" | "all" }
 *   POST /api/_debug/clear
 *   GET  /api/_debug/status
 * Ver PRUEBAS_DEFENSA.md para los comandos exactos (curl / DevTools).
 * ---------------------------------------------------------------------- */
const debugSimulation = { enabled: false, status: null, path: null };

function isLocalRequest(req) {
  const addr = req.socket.remoteAddress || '';
  return addr === '127.0.0.1' || addr === '::1' || addr === '::ffff:127.0.0.1';
}

function debugAllowed(req) {
  return IS_DEV && isLocalRequest(req);
}

function simulatedMessage(status) {
  if (status === 401) return 'Token inválido o expirado (simulado por X-Debug-Status).';
  if (status === 429) return 'Demasiadas solicitudes (simulado por X-Debug-Status).';
  return 'Error interno del servidor (simulado por X-Debug-Status).';
}

async function handleDebugRoutes(req, res, requestUrl) {
  if (requestUrl.pathname === '/api/_debug/status' && req.method === 'GET') {
    sendJson(res, 200, { devMode: IS_DEV, allowedFromThisHost: debugAllowed(req), ...debugSimulation });
    return true;
  }
  if (requestUrl.pathname === '/api/_debug/simulate' && req.method === 'POST') {
    if (!debugAllowed(req)) {
      sendJson(res, 403, { message: 'El simulador de errores solo funciona en localhost/desarrollo.' });
      return true;
    }
    const body = await readRequestBody(req);
    let parsed = {};
    try { parsed = JSON.parse(body.toString('utf8') || '{}'); } catch { parsed = {}; }
    const status = Number(parsed.status);
    if (![401, 429, 500].includes(status)) {
      sendJson(res, 400, { message: 'status debe ser 401, 429 o 500.' });
      return true;
    }
    debugSimulation.enabled = true;
    debugSimulation.status = status;
    debugSimulation.path = parsed.path || 'all';
    console.warn(`[DEBUG] Simulación activada: HTTP ${status} en ${debugSimulation.path}`);
    sendJson(res, 200, { message: 'Simulación activada.', ...debugSimulation });
    return true;
  }
  if (requestUrl.pathname === '/api/_debug/clear' && req.method === 'POST') {
    if (!debugAllowed(req)) {
      sendJson(res, 403, { message: 'El simulador de errores solo funciona en localhost/desarrollo.' });
      return true;
    }
    debugSimulation.enabled = false;
    debugSimulation.status = null;
    debugSimulation.path = null;
    console.info('[DEBUG] Simulación desactivada. Modo normal restaurado.');
    sendJson(res, 200, { message: 'Simulación desactivada.', ...debugSimulation });
    return true;
  }
  return false;
}

/** Devuelve el status simulado a aplicar a esta ruta, o null si no aplica. */
function simulatedStatusFor(req, upstreamPath) {
  if (!debugAllowed(req)) return null;

  const headerStatus = Number(req.headers['x-debug-status']);
  if ([401, 429, 500].includes(headerStatus)) return headerStatus;

  if (!debugSimulation.enabled) return null;
  if (debugSimulation.path === 'all' || upstreamPath.startsWith(debugSimulation.path)) {
    return debugSimulation.status;
  }
  return null;
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function sendJson(res, status, payload) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

async function readRequestBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

async function proxyApi(req, res, requestUrl) {
  const upstreamPath = requestUrl.pathname.replace(/^\/api/, '') + requestUrl.search;

  const simulated = simulatedStatusFor(req, upstreamPath);
  if (simulated) {
    console.warn(`[DEBUG] Respondiendo HTTP ${simulated} simulado para ${upstreamPath}`);
    sendJson(res, simulated, { message: simulatedMessage(simulated), simulated: true });
    return;
  }

  const targetUrl = API_ORIGIN + upstreamPath;
  const headers = {};

  if (req.headers.authorization) headers.Authorization = req.headers.authorization;
  if (req.headers['content-type']) headers['Content-Type'] = req.headers['content-type'];
  headers.Accept = req.headers.accept || 'application/json';

  const hasBody = !['GET', 'HEAD'].includes(req.method || 'GET');
  const body = hasBody ? await readRequestBody(req) : undefined;

  try {
    const upstream = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: hasBody ? body : undefined,
      redirect: 'follow',
    });

    const responseBody = Buffer.from(await upstream.arrayBuffer());
    const responseHeaders = {
      'Content-Type': upstream.headers.get('content-type') || 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    };

    res.writeHead(upstream.status, responseHeaders);
    res.end(responseBody);
  } catch (error) {
    console.error('Error del proxy:', error);
    sendJson(res, 502, {
      message: 'No se pudo conectar con la API del Mundial 2026.',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}

async function serveStatic(req, res, requestUrl) {
  let pathname = decodeURIComponent(requestUrl.pathname);
  if (pathname === '/') pathname = '/index.html';

  const relativePath = pathname.replace(/^\/+/, '');
  const filePath = path.resolve(__dirname, relativePath);

  if (!filePath.startsWith(__dirname + path.sep) && filePath !== __dirname) {
    sendJson(res, 403, { message: 'Acceso denegado.' });
    return;
  }

  try {
    const info = await stat(filePath);
    if (!info.isFile()) throw new Error('Not a file');
    const data = await readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME_TYPES[extension] || 'application/octet-stream',
      'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  } catch {
    sendJson(res, 404, { message: 'Archivo no encontrado.' });
  }
}

const server = http.createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (requestUrl.pathname.startsWith('/api/_debug/')) {
    if (await handleDebugRoutes(req, res, requestUrl)) return;
  }

  if (requestUrl.pathname.startsWith('/api/')) {
    await proxyApi(req, res, requestUrl);
    return;
  }

  await serveStatic(req, res, requestUrl);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Aplicación disponible en http://localhost:${PORT}`);
  if (IS_DEV) {
    console.log('[DEBUG] Simulador de errores disponible en /api/_debug/simulate (ver PRUEBAS_DEFENSA.md).');
  }
});
