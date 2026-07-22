/**
 * app.js — bootstrap de la aplicación
 * Maneja el cambio de pestañas, el tema claro/oscuro, la accesibilidad y la
 * inicialización perezosa de cada módulo (solo se piden datos la primera
 * vez que el usuario visita cada sección).
 */
import './ui-common.js';
import { initTheme } from './theme.js';
import {
  initAccessibility, increaseFont, decreaseFont, resetFont,
  initContrast, toggleHighContrast, toggleLowContrast,
  toggleReadAloud,
} from './a11y.js';
import { tryAutoLogin, onAuthSuccess } from './auth.js';
import { getUser, clearSession } from './api.js';
import { initTour } from './tour.js';
import { initAgenda } from './agenda.js';
import { initTimeline } from './timeline.js';
import { initDashboard } from './dashboard.js';
import { initMatrix } from './matrix.js';

// El tema y la escala de fuente se aplican de una vez, incluso antes de
// iniciar sesión, para que la pantalla de login ya respete la preferencia
// guardada del usuario.
initTheme();
initAccessibility();
initContrast();

const navButtons = document.querySelectorAll('.nav-item[data-view]');
const views = document.querySelectorAll('.view');

const initializers = {
  tour: initTour,
  agenda: initAgenda,
  timeline: initTimeline,
  dashboard: initDashboard,
  matrix: initMatrix,
};
const initialized = new Set();

function activateView(viewName) {
  navButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.view === viewName));
  views.forEach((v) => v.classList.toggle('active', v.id === `view-${viewName}`));

  if (!initialized.has(viewName)) {
    initialized.add(viewName);
    initializers[viewName]?.();
  }
}

navButtons.forEach((btn) => {
  btn.addEventListener('click', () => activateView(btn.dataset.view));
});

document.getElementById('font-increase')?.addEventListener('click', increaseFont);
document.getElementById('font-decrease')?.addEventListener('click', decreaseFont);
document.getElementById('font-reset')?.addEventListener('click', resetFont);
document.getElementById('contrast-high')?.addEventListener('click', toggleHighContrast);
document.getElementById('contrast-low')?.addEventListener('click', toggleLowContrast);
document.getElementById('tts-toggle')?.addEventListener('click', toggleReadAloud);

document.getElementById('logout-btn')?.addEventListener('click', () => {
  clearSession();
  initialized.clear();
  document.getElementById('app').classList.remove('active');
  document.getElementById('auth-screen').classList.remove('hidden');
});

function bootApp() {
  const user = getUser();
  if (user) document.getElementById('user-name').textContent = user.name;
  activateView('tour');
}

onAuthSuccess(bootApp);

// Si ya había una sesión guardada, entra directo sin pasar por el login.
if (tryAutoLogin()) {
  bootApp();
}
