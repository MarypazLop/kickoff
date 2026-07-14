/**
 * theme.js — alterna entre modo claro y modo oscuro.
 * El tema se guarda en localStorage y se aplica como atributo
 * data-theme en <html>, lo que permite que TODO el CSS (variables.css)
 * reaccione sin tocar JS en ningún otro archivo.
 */
import { iconMarkup } from './icons.js';

const STORAGE_KEY = 'wc2026_theme';
const root = document.documentElement;
const iconSlot = document.getElementById('theme-icon-slot');

export function getTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'dark';
}

function paintIcon(theme) {
  if (!iconSlot) return;
  // El icono representa la ACCIÓN disponible, no el estado actual:
  // en modo oscuro se ofrece pasar a modo claro (icono de sol) y viceversa.
  iconSlot.innerHTML = theme === 'dark' ? iconMarkup('light-mode') : iconMarkup('dark-mode');
}

export function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);
  paintIcon(theme);
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  return next;
}

export function initTheme() {
  applyTheme(getTheme());
}
