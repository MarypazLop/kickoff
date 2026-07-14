/**
 * icons.js
 * Fuente única de los iconos SVG usados en la interfaz. Se inyectan en línea
 * (no como <img>) para que hereden el color del texto (currentColor) y así
 * funcionen automáticamente en modo claro, modo oscuro y estados activos.
 *
 * Buena práctica: un solo lugar para mantener los iconos, en vez de repetir
 * markup SVG disperso en cada archivo de vista.
 */

const RAW = {
  'tour-sedes': '<svg width="800px" height="800px" viewBox="0 -0.33 20.754 20.754" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g id="football-ball" transform="translate(-1.623 -1.913)"><path fill="#b3dbc1" d="M14.33,3.31,12,5,9.67,3.31a8.91,8.91,0,0,1,4.66,0ZM4.46,7.1A9,9,0,0,0,3,11.53L5.34,9.84ZM8,17.89l-.07-.23H5A8.92,8.92,0,0,0,8.78,20.4ZM12,8,8.5,10.67,9.84,15h4.32l1.34-4.33Zm4.11,9.66-.07.23-.82,2.51A8.92,8.92,0,0,0,19,17.66ZM19.54,7.11l-.88,2.73L21,11.53a8.93,8.93,0,0,0-1.46-4.42Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.67,3.31,12,5l2.33-1.69M3.02,11.53,5.34,9.84,4.46,7.1M18,18l-1.92-.04-.73,2.38M6,18l1.92-.04.73,2.38M19.55,7.1l-.89,2.74,2.32,1.69M12,8V5M8.41,10.65,5.34,9.84M9.84,15,7.89,18m6.27-3,1.95,3m-.61-7.33,3.16-.83M12,8,8.5,10.67,9.84,15h4.32l1.34-4.33Zm0-5a9,9,0,1,0,9,9A9,9,0,0,0,12,3Z"/></g></svg>',

  'agenda-simultanea': '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#b3dbc1" d="M18,3H12V9L10,8,8,9V3H5A1,1,0,0,0,4,4V20a1,1,0,0,0,1,1H18a1,1,0,0,0,1-1V4A1,1,0,0,0,18,3Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12,3V9L10,8,8,9V3Zm9,4H19V9h2Zm0,6H19v2h2Zm-2,7V4a1,1,0,0,0-1-1H5A1,1,0,0,0,4,4V20a1,1,0,0,0,1,1H18A1,1,0,0,0,19,20Z"/></svg>',

  'timeline-infinito': '<svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path fill="#b3dbc1" d="M20,3H9A1,1,0,0,0,8,4V7A5,5,0,0,1,8,17v3a1,1,0,0,0,1,1H20a1,1,0,0,0,1-1V4A1,1,0,0,0,20,3Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8,17v3a1,1,0,0,0,1,1H20a1,1,0,0,0,1-1V4a1,1,0,0,0-1-1H9A1,1,0,0,0,8,4V7"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13,12A5,5,0,1,1,8,7,5,5,0,0,1,13,12ZM8,10v2H7"/></svg>',

  'mi-equipo': '<svg width="24" height="24" viewBox="0 -1 20 20" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-2 -3)"><path fill="#b3dbc1" d="M12,4,9.22,9.27,3,10.11l4.5,4.1L6.44,20,12,17.27,17.56,20,16.5,14.21l4.5-4.1-6.22-.84Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12,4,9.22,9.27,3,10.11l4.5,4.1L6.44,20,12,17.27,17.56,20,16.5,14.21l4.5-4.1-6.22-.84Z"/></g></svg>',

  'matriz-grupos': '<svg width="24" height="24" viewBox="0 -2 20 20" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-2 -4)"><path fill="#b3dbc1" d="M21,9V5H3V9H7v6H3v4H21V15H17V9Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12,19V5m9,10V9H17v6ZM7,15V9H3v6Zm14,4V5H3V19Z"/></g></svg>',

  'dark-mode': '<svg width="24" height="24" viewBox="-0.14 0 20.03 20.03" xmlns="http://www.w3.org/2000/svg" fill="currentColor"><g transform="translate(-2.25 -2)"><path d="M21,12A9,9,0,0,1,3.25,14.13,6.9,6.9,0,0,0,8,16,7,7,0,0,0,11.61,3H12a9,9,0,0,1,9,9Z"/></g></svg>',

  'light-mode': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="4.5" stroke="currentColor" stroke-width="2"/><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 2V4.5M12 19.5V22M4.22 4.22L6 6M18 18L19.78 19.78M2 12H4.5M19.5 12H22M4.22 19.78L6 18M18 6L19.78 4.22"/></svg>',

  'user': '<svg width="24" height="24" viewBox="-0.08 0 20.162 20.162" xmlns="http://www.w3.org/2000/svg"><g transform="translate(-2 -2)"><path fill="#b3dbc1" d="M18.36,5.64A9,9,0,0,0,3,12c0,.11,0,.22,0,.32A9,9,0,0,0,7,19.5H7A5,5,0,0,1,12,15a4,4,0,1,1,4-4,4,4,0,0,1-4,4,5,5,0,0,1,5,4.48h0a9,9,0,0,0,4-7.18v-.32a9,9,0,0,0-2.64-6.34Z"/><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12,15a5,5,0,0,0-5,4.5,9,9,0,0,0,9.94,0A5,5,0,0,0,12,15Zm0-8a4,4,0,1,0,4,4A4,4,0,0,0,12,7Zm0,14h0a9,9,0,0,1-9-9H3a9,9,0,0,1,9-9h0a9,9,0,0,1,9,9h0a9,9,0,0,1-9,9Z"/></g></svg>',

  'stadium': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><ellipse cx="12" cy="12" rx="9" ry="5" stroke="currentColor" stroke-width="2"/><ellipse cx="12" cy="12" rx="4.5" ry="2.4" stroke="currentColor" stroke-width="2"/><path d="M3 12v3.5M21 12v3.5M7 15.6v3M17 15.6v3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  'calendar': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" stroke-width="2"/><path d="M3 9.5H21M8 3V6.5M16 3V6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  'close': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 6L18 18M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  'chevron-left': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15 18l-6-6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  'chevron-right': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  'lock': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="11" width="14" height="10" rx="2" stroke="currentColor" stroke-width="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  'refresh': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M18 3v4.2h-4.2M6 21v-4.2h4.2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  'logout': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16 17l5-5-5-5M21 12H9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',

  'font-increase': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18L7.5 6H8.5L13 18M4.5 14H11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 9V15M14 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  'font-decrease': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 18L7.5 6H8.5L13 18M4.5 14H11.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 12H20" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',

  'alert': '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 9v4M12 17h.01" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M10.29 3.86 1.82 18a1 1 0 0 0 .86 1.5h18.64a1 1 0 0 0 .86-1.5L13.71 3.86a1 1 0 0 0-1.72 0Z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
};

/** Devuelve el markup SVG de un icono, listo para insertar con innerHTML. */
export function iconMarkup(name) {
  return RAW[name] || '';
}

/** Devuelve un <span> con el icono adentro y una clase para tamaño/color. */
export function iconSpan(name, extraClass = '') {
  return `<span class="icon ${extraClass}" aria-hidden="true">${iconMarkup(name)}</span>`;
}
