/**
 * a11y.js — controles de accesibilidad.
 * Por ahora: escala de tamaño de fuente (pequeña / normal / grande / muy
 * grande), aplicada mediante una clase en <html> que accessibility.css
 * traduce a un `font-size` base distinto (todo el layout usa `rem`, así
 * que escala en cascada de forma consistente).
 */
const STORAGE_KEY = 'wc2026_font_scale';
const SCALES = ['a11y-font-sm', 'a11y-font-md', 'a11y-font-lg', 'a11y-font-xl'];
const root = document.documentElement;

function currentIndex() {
  const saved = localStorage.getItem(STORAGE_KEY);
  const idx = SCALES.indexOf(saved);
  return idx === -1 ? 1 : idx; // por defecto: "md" (normal)
}

function applyScale(index) {
  SCALES.forEach((cls) => root.classList.remove(cls));
  root.classList.add(SCALES[index]);
  localStorage.setItem(STORAGE_KEY, SCALES[index]);
}

export function increaseFont() {
  const idx = Math.min(currentIndex() + 1, SCALES.length - 1);
  applyScale(idx);
}

export function decreaseFont() {
  const idx = Math.max(currentIndex() - 1, 0);
  applyScale(idx);
}

export function resetFont() {
  applyScale(1); // "md" = tamaño normal
}

export function initAccessibility() {
  applyScale(currentIndex());
}

/* =========================================================
 * Contraste: alto / bajo / normal.
 * Se aplica como atributo `data-contrast` en <html>; las variables de
 * color correspondientes viven en accessibility.css, así que ningún
 * otro archivo necesita tocar estilos individuales.
 * ========================================================= */
const CONTRAST_KEY = 'wc2026_contrast';

export function getContrast() {
  return localStorage.getItem(CONTRAST_KEY) || 'normal';
}

export function applyContrast(mode) {
  root.removeAttribute('data-contrast');
  if (mode === 'high' || mode === 'low') root.setAttribute('data-contrast', mode);
  localStorage.setItem(CONTRAST_KEY, mode);

  const highBtn = document.getElementById('contrast-high');
  const lowBtn = document.getElementById('contrast-low');
  highBtn?.classList.toggle('active', mode === 'high');
  highBtn?.setAttribute('aria-pressed', String(mode === 'high'));
  lowBtn?.classList.toggle('active', mode === 'low');
  lowBtn?.setAttribute('aria-pressed', String(mode === 'low'));
}

export function toggleHighContrast() {
  applyContrast(getContrast() === 'high' ? 'normal' : 'high');
}

export function toggleLowContrast() {
  applyContrast(getContrast() === 'low' ? 'normal' : 'low');
}

export function initContrast() {
  applyContrast(getContrast());
}

/* =========================================================
 * Lectura de pantalla (Web Speech API).
 * Un solo botón alterna entre "leer" y "detener": si ya está leyendo,
 * el mismo clic cancela la lectura en curso.
 * ========================================================= */
export function toggleReadAloud() {
  const btn = document.getElementById('tts-toggle');
  if (!('speechSynthesis' in window)) return;

  const stop = () => {
    window.speechSynthesis.cancel();
    btn?.classList.remove('active');
    btn?.setAttribute('aria-pressed', 'false');
    btn?.setAttribute('aria-label', 'Leer texto de la pantalla');
  };

  if (window.speechSynthesis.speaking) {
    stop();
    return;
  }

  const activeView = document.querySelector('.view.active') || document.getElementById('auth-screen');
  const text = (activeView?.innerText || '').trim();
  if (!text) return;

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'es-ES';
  utterance.onstart = () => {
    btn?.classList.add('active');
    btn?.setAttribute('aria-pressed', 'true');
    btn?.setAttribute('aria-label', 'Detener lectura');
  };
  utterance.onend = stop;
  utterance.onerror = stop;

  window.speechSynthesis.speak(utterance);
}
