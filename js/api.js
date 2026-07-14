/**
 * api.js
 * -------------------------------------------------------------------------
 * Capa de acceso a datos (Arquitectura Base de Resiliencia).
 * Reglas del laboratorio implementadas aquí:
 *   1. Autenticación JWT en cada llamada (Authorization: Bearer <token>)
 *   2. async/await exclusivo. Ni un solo .then()/.catch() en el proyecto.
 *   3. 401 -> limpia token + evento de sesión expirada (sin reload()).
 *   4. 429/500 -> backoff exponencial (1s, 2s, 4s, 8s) con countdown visible
 *      para 429.
 *   5. Modo offline: cachea la última respuesta exitosa de cada endpoint en
 *      localStorage y la sirve (marcada como "no actualizada") si la
 *      petición nueva falla y no quedan reintentos.
 *
 * Esta capa NUNCA usa alert() y NUNCA usa window.location.reload().
 * -------------------------------------------------------------------------
 */

const BASE_URL = '/api';
const TOKEN_KEY = 'wc2026_token';
const USER_KEY = 'wc2026_user';
const CACHE_PREFIX = 'wc2026_cache_';
const MAX_RETRIES = 4;               // 1s, 2s, 4s, 8s
const BASE_DELAY_MS = 1000;

/** Pequeño bus de eventos para desacoplar api.js de la UI. */
const listeners = {};
export function on(event, cb) {
  (listeners[event] ||= []).push(cb);
}
function emit(event, payload) {
  (listeners[event] || []).forEach((cb) => cb(payload));
}

/* ---------------------------- Token / sesión ---------------------------- */

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}
export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
}
export function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}
export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
export function isAuthenticated() {
  return Boolean(getToken());
}

/* ------------------------------ Caché local ------------------------------ */

function cacheKey(path) {
  return CACHE_PREFIX + path;
}

function readCache(path) {
  const raw = localStorage.getItem(cacheKey(path));
  if (!raw) return null;
  try {
    return JSON.parse(raw); // { data, savedAt }
  } catch {
    return null;
  }
}

function writeCache(path, data) {
  try {
    localStorage.setItem(
      cacheKey(path),
      JSON.stringify({ data, savedAt: Date.now() })
    );
  } catch {
    /* localStorage lleno o no disponible: se ignora silenciosamente */
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Cuenta atrás visible usada para el backoff del 429.
 * Emite 'retry-countdown' cada segundo para que la UI pinte el marcador.
 */
async function countdown(seconds, meta) {
  for (let s = seconds; s > 0; s--) {
    emit('retry-countdown', { ...meta, secondsLeft: s });
    await sleep(1000);
  }
  emit('retry-countdown', { ...meta, secondsLeft: 0 });
}

/**
 * Ejecuta una petición GET autenticada con:
 *  - reintentos con backoff exponencial ante 429/500
 *  - manejo especial de 401 (sesión expirada)
 *  - fallback a caché si se agotan los reintentos
 *
 * @param {string} path            ej. '/get/games'
 * @param {object} [opts]
 * @param {boolean} [opts.silentRetry] si es true, no emite eventos de red
 *        (útil para prefetch en segundo plano)
 * @returns {Promise<{data:any, fromCache:boolean, stale:boolean}>}
 */
export async function apiGet(path, opts = {}) {
  const token = getToken();
  let attempt = 0;

  while (true) {
    try {
      const response = await fetch(BASE_URL + path, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        clearSession();
        emit('session-expired');
        throw new ApiError('SESSION_EXPIRED', 401, path);
      }

      if (response.status === 429 || response.status >= 500) {
        if (attempt >= MAX_RETRIES) {
          return fallbackOrThrow(path, response.status);
        }
        const delaySeconds = (BASE_DELAY_MS * 2 ** attempt) / 1000;
        attempt += 1;

        if (!opts.silentRetry) {
          emit('retry-start', {
            path,
            status: response.status,
            attempt,
            maxAttempts: MAX_RETRIES,
            seconds: delaySeconds,
          });
          await countdown(delaySeconds, { path, status: response.status, attempt });
          emit('retry-end', { path });
        } else {
          await sleep(delaySeconds * 1000);
        }
        continue; // reintenta
      }

      if (!response.ok) {
        // 400 / 404 / otros errores no recuperables por reintento
        throw new ApiError('HTTP_ERROR', response.status, path);
      }

      const json = await response.json();
      writeCache(path, json);
      return { data: json, fromCache: false, stale: false };
    } catch (err) {
      if (err instanceof ApiError) throw err;
      // Error de red (offline, DNS, CORS, etc.) -> tratamos como recuperable
      if (attempt >= MAX_RETRIES) {
        return fallbackOrThrow(path, 0);
      }
      const delaySeconds = (BASE_DELAY_MS * 2 ** attempt) / 1000;
      attempt += 1;
      if (!opts.silentRetry) {
        emit('retry-start', {
          path,
          status: 0,
          attempt,
          maxAttempts: MAX_RETRIES,
          seconds: delaySeconds,
        });
        await countdown(delaySeconds, { path, status: 0, attempt });
        emit('retry-end', { path });
      } else {
        await sleep(delaySeconds * 1000);
      }
    }
  }
}

function fallbackOrThrow(path, status) {
  const cached = readCache(path);
  if (cached) {
    emit('serving-stale', { path, savedAt: cached.savedAt });
    return { data: cached.data, fromCache: true, stale: true };
  }
  throw new ApiError('EXHAUSTED_RETRIES', status, path);
}

export class ApiError extends Error {
  constructor(kind, status, path) {
    super(`${kind} (${status}) en ${path}`);
    this.kind = kind;
    this.status = status;
    this.path = path;
  }
}

/* ------------------------------ Auth calls ------------------------------ */

export async function register(name, email, password) {
  const response = await fetch(BASE_URL + '/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new ApiError(json.message || 'REGISTER_FAILED', response.status, '/auth/register');
  }
  return json;
}

export async function login(email, password) {
  const response = await fetch(BASE_URL + '/auth/authenticate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new ApiError(json.message || 'LOGIN_FAILED', response.status, '/auth/authenticate');
  }
  return json;
}

/* --------------------------- Endpoints de datos --------------------------- */

export const Endpoints = {
  games: () => apiGet('/get/games'),
  stadiums: () => apiGet('/get/stadiums'),
  teams: () => apiGet('/get/teams'),
  groups: () => apiGet('/get/groups'),
};
