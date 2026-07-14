/**
 * agenda.js — 2.2 Agenda Simultánea
 * Objetivo técnico: agrupación por clave compuesta (fecha) + layout dividido,
 * navegado con un calendario mensual (en vez de flechas fecha por fecha).
 * Reto de resiliencia: si no hay caché ni red al cambiar de mes, se
 * muestran esqueletos de carga; nunca una pantalla en blanco.
 */
import { Endpoints } from './api.js';
import { state, indexTeams, teamName } from './state.js';
import { iconMarkup } from './icons.js';

const monthLabelEl = document.getElementById('calendar-month-label');
const gridEl = document.getElementById('calendar-grid');
const prevMonthBtn = document.getElementById('calendar-prev-month');
const nextMonthBtn = document.getElementById('calendar-next-month');
const selectedDateEl = document.getElementById('agenda-selected-date');
const columnsEl = document.getElementById('agenda-columns');

const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

let byDay = {};          // "YYYY-MM-DD" -> [partidos]
let simultaneousDays = new Set();
let viewYear = 2026;
let viewMonth = 5;       // 0-indexed: junio
let selectedKey = null;

export async function initAgenda() {
  renderSkeletonCalendar();

  try {
    if (!state.games.length) {
      const { data } = await Endpoints.games();
      state.games = data.games || data;
    }
    if (!state.teams.length) {
      const { data } = await Endpoints.teams();
      indexTeams(data.teams || data);
    }
    buildDayIndex();
    // Arranca en el primer mes del torneo que tenga fechas simultáneas.
    const firstKey = [...simultaneousDays].sort()[0];
    if (firstKey) {
      const [y, m] = firstKey.split('-');
      viewYear = Number(y);
      viewMonth = Number(m) - 1;
    }
    renderCalendar();
  } catch (err) {
    renderCalendarError();
  }
}

function renderSkeletonCalendar() {
  monthLabelEl.textContent = 'Cargando…';
  gridEl.innerHTML = Array.from({ length: 35 })
    .map(() => `<div class="skeleton" style="aspect-ratio:1"></div>`)
    .join('');
}

function renderCalendarError() {
  monthLabelEl.textContent = 'Sin datos';
  gridEl.innerHTML = '';
  columnsEl.innerHTML = `
    <div class="inline-error" style="grid-column:1/-1">
      No hay datos en caché ni conexión disponible para construir el calendario.
      <button class="btn btn-sm" id="retry-agenda"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar</button>
    </div>`;
  document.getElementById('retry-agenda')?.addEventListener('click', initAgenda);
}

function dayKey(dateStr) {
  // "06/11/2026 13:00" -> "2026-06-11"
  const [datePart] = dateStr.split(' ');
  const [mm, dd, yyyy] = datePart.split('/');
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`;
}

function buildDayIndex() {
  byDay = {};
  for (const g of state.games) {
    if (!g.local_date) continue;
    const key = dayKey(g.local_date);
    (byDay[key] ||= []).push(g);
  }
  simultaneousDays = new Set(
    Object.keys(byDay).filter((key) => byDay[key].length >= 2)
  );
}

function renderCalendar() {
  monthLabelEl.textContent = `${MONTHS[viewMonth]} ${viewYear}`;

  const firstOfMonth = new Date(viewYear, viewMonth, 1);
  // Lunes = 0 ... Domingo = 6
  const startOffset = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const dowHtml = DOW.map((d) => `<span class="dow">${d}</span>`).join('');

  const dayHtml = cells
    .map((d) => {
      if (!d) return `<span class="calendar-day empty"></span>`;
      const key = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const hasMatches = simultaneousDays.has(key);
      const isSelected = key === selectedKey;
      return `
        <button type="button" class="calendar-day ${hasMatches ? 'has-matches' : ''} ${isSelected ? 'selected' : ''}"
                data-key="${key}" ${hasMatches ? '' : 'disabled'}>
          <span>${d}</span>
          ${hasMatches ? '<span class="dot"></span>' : ''}
        </button>`;
    })
    .join('');

  gridEl.innerHTML = dowHtml + dayHtml;

  gridEl.querySelectorAll('.calendar-day.has-matches').forEach((btn) => {
    btn.addEventListener('click', () => selectDay(btn.dataset.key));
  });

  if (selectedKey && byDay[selectedKey]) {
    renderSelectedDay();
  }
}

function selectDay(key) {
  selectedKey = key;
  renderCalendar();
  renderSelectedDay();
}

function renderSelectedDay() {
  const games = (byDay[selectedKey] || []).slice().sort(
    (a, b) => new Date(a.local_date) - new Date(b.local_date)
  );
  const [yyyy, mm, dd] = selectedKey.split('-');
  selectedDateEl.textContent = `${dd}/${mm}/${yyyy} · ${games.length} partidos simultáneos`;

  columnsEl.innerHTML = games
    .map(
      (g, i) => `
      <div class="simul-col">
        <h4>Partido ${i + 1} · ${g.local_date.split(' ')[1] || ''}</h4>
        <div class="match-row" style="grid-template-columns:1fr;text-align:center">
          <span class="team">${g.home_team_label || teamName(g.home_team_id)}</span>
          <span class="score" style="justify-self:center;margin:.35em 0">${g.home_score ?? '-'} : ${g.away_score ?? '-'}</span>
          <span class="team">${g.away_team_label || teamName(g.away_team_id)}</span>
          <span class="meta">Grupo ${g.group} · Jornada ${g.matchday}</span>
        </div>
      </div>`
    )
    .join('');
}

prevMonthBtn.addEventListener('click', () => {
  viewMonth -= 1;
  if (viewMonth < 0) { viewMonth = 11; viewYear -= 1; }
  renderCalendar();
});
nextMonthBtn.addEventListener('click', () => {
  viewMonth += 1;
  if (viewMonth > 11) { viewMonth = 0; viewYear += 1; }
  renderCalendar();
});
