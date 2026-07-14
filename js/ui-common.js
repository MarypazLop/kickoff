/**
 * ui-common.js
 * Componentes de interfaz compartidos por todos los subproyectos:
 *  - Barra de estado de red con countdown visible (para 429/500)
 *  - Modal de "sesión expirada" (reemplaza cualquier alert()/reload())
 */
import { on } from './api.js';

const statusEl = document.getElementById('network-status');
const statusDot = statusEl.querySelector('.dot');
const statusLabel = statusEl.querySelector('.label');
const statusMsg = statusEl.querySelector('.msg');
const statusCountdown = statusEl.querySelector('.countdown');

function statusMessage(status) {
  if (status === 429) return 'Límite de peticiones alcanzado (429)';
  if (status >= 500) return 'Error del servidor (500)';
  if (status === 0) return 'Sin conexión con la API';
  return 'Reintentando…';
}

on('retry-start', ({ status, attempt, maxAttempts }) => {
  statusEl.classList.add('show');
  statusLabel.textContent = `Reintento ${attempt}/${maxAttempts}`;
  statusMsg.textContent = statusMessage(status);
});

on('retry-countdown', ({ secondsLeft }) => {
  statusCountdown.textContent = secondsLeft;
});

on('retry-end', () => {
  statusEl.classList.remove('show');
});

on('serving-stale', ({ path }) => {
  statusEl.classList.add('show');
  statusLabel.textContent = 'Modo offline';
  statusMsg.textContent = `Mostrando datos cacheados de ${path}`;
  statusCountdown.textContent = 'OFF';
  setTimeout(() => statusEl.classList.remove('show'), 3500);
});

/* -------------------------- Sesión expirada -------------------------- */

const modal = document.getElementById('session-modal');
const reauthBtn = document.getElementById('reauth-btn');

on('session-expired', () => {
  modal.classList.add('show');
});

reauthBtn.addEventListener('click', () => {
  modal.classList.remove('show');
  // Vuelve a la pantalla de autenticación SIN recargar la página.
  document.getElementById('app').classList.remove('active');
  document.getElementById('auth-screen').style.display = 'flex';
  document.getElementById('login-email').focus();
});

export function hideSessionModal() {
  modal.classList.remove('show');
}
