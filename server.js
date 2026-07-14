import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 5500);
const API_ORIGIN = 'https://worldcup26.ir';

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

  if (requestUrl.pathname.startsWith('/api/')) {
    await proxyApi(req, res, requestUrl);
    return;
  }

  await serveStatic(req, res, requestUrl);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Aplicación disponible en http://localhost:${PORT}`);
});
