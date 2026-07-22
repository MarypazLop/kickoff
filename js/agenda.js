/**
 * agenda.js — 2.2 Agenda Simultánea
 * Objetivo técnico: agrupación por clave compuesta (fecha) + layout dividido,
 * navegado con un calendario mensual (en vez de flechas fecha por fecha).
 * Reto de resiliencia: si no hay caché ni red al cambiar de mes, se
 * muestran esqueletos de carga; nunca una pantalla en blanco.
 */
import { Endpoints } from './api.js';
import { state, indexTeams, teamName, setStale, anyStale, staleSavedAt, escapeHtml } from './state.js';
import { iconMarkup } from './icons.js';
import { teamFlagImg } from './flags.js';

const monthLabelEl = document.getElementById('calendar-month-label');
const gridEl = document.getElementById('calendar-grid');
const prevMonthBtn = document.getElementById('calendar-prev-month');
const nextMonthBtn = document.getElementById('calendar-next-month');
const selectedDateEl = document.getElementById('agenda-selected-date');
const columnsEl = document.getElementById('agenda-columns');
const prevDateBtn = document.getElementById('agenda-prev-date');
const nextDateBtn = document.getElementById('agenda-next-date');
const staleBadgeEl = document.getElementById('agenda-stale-badge');

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
      const { data, stale, savedAt } = await Endpoints.games();
      state.games = data.games || data;
      setStale('games', stale, savedAt);
    }
    if (!state.teams.length) {
      const { data, stale, savedAt } = await Endpoints.teams();
      indexTeams(data.teams || data);
      setStale('teams', stale, savedAt);
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
    updateDateNavButtons();
    renderStaleBadge();
  } catch (err) {
    renderCalendarError();
  }
}

function renderStaleBadge() {
  if (!staleBadgeEl) return;
  const stale = anyStale('teams', 'games');
  if (!stale) {
    staleBadgeEl.classList.add('hidden');
    staleBadgeEl.innerHTML = '';
    return;
  }
  const savedAt = staleSavedAt('teams', 'games');
  staleBadgeEl.classList.remove('hidden');
  staleBadgeEl.innerHTML = `<span class="badge badge-stale">Datos no actualizados${savedAt ? ' · ' + new Date(savedAt).toLocaleString('es-CR') : ''}</span>`;
}

function renderSkeletonCalendar() {
  monthLabelEl.textContent = 'Cargando…';
  gridEl.innerHTML = Array.from({ length: 35 })
    .map(() => `<div class="skeleton skeleton-day"></div>`)
    .join('');
}

function renderCalendarError() {
  monthLabelEl.textContent = 'Sin datos';
  gridEl.innerHTML = '';
  columnsEl.innerHTML = `
    <div class="inline-error inline-error-span">
      No hay datos en caché ni conexión disponible para construir el calendario.
      <button class="btn btn-sm" id="retry-agenda"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar</button>
    </div>`;
  document.getElementById('retry-agenda')?.addEventListener('click', initAgenda);
  if (prevDateBtn) prevDateBtn.disabled = true;
  if (nextDateBtn) nextDateBtn.disabled = true;
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

function renderCalendar(skipSelectedRender = false) {
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

  if (!skipSelectedRender && selectedKey && byDay[selectedKey]) {
    renderSelectedDay();
  }
}

function selectDay(key, { skipSkeleton } = {}) {
  selectedKey = key;
  const [y, m] = key.split('-');
  viewYear = Number(y);
  viewMonth = Number(m) - 1;
  renderCalendar(true); // el panel de la derecha se pinta abajo (con skeleton)
  updateDateNavButtons();

  if (skipSkeleton) {
    renderSelectedDay();
    return;
  }
  // Los partidos ya están en memoria (state.games), así que el cambio de
  // fecha es instantáneo; aun así se muestra un skeleton breve en las
  // columnas para que el cambio de contenido nunca se sienta como un salto
  // brusco de layout (requisito de la agenda: skeletons al cambiar de fecha).
  renderSkeletonColumns();
  window.requestAnimationFrame(() => {
    setTimeout(renderSelectedDay, 120);
  });
}

function renderSkeletonColumns() {
  columnsEl.innerHTML = Array.from({ length: 2 })
    .map(
      () => `
      <div class="simul-col">
        <div class="skeleton" style="height:1.1em;width:60%;margin-bottom:.7rem;"></div>
        <div class="skeleton" style="height:2.4rem;margin-bottom:.5rem;"></div>
        <div class="skeleton" style="height:.8em;width:80%;"></div>
      </div>`
    )
    .join('');
}

function renderSelectedDay() {
  const games = (byDay[selectedKey] || []).slice().sort(
    (a, b) => new Date(a.local_date) - new Date(b.local_date)
  );
  const [yyyy, mm, dd] = selectedKey.split('-');
  selectedDateEl.textContent = `${dd}/${mm}/${yyyy} · ${games.length} partidos simultáneos`;

  columnsEl.innerHTML = games
    .map((g, i) => {
      const homeTeam = state.teamsById[String(g.home_team_id)];
      const awayTeam = state.teamsById[String(g.away_team_id)];
      return `
      <div class="simul-col">
        <h4>Partido ${i + 1} · ${escapeHtml(g.local_date.split(' ')[1] || '')}</h4>
        <div class="match-row match-row-stacked">
          <span class="team">${homeTeam ? teamFlagImg(homeTeam) : ''}${escapeHtml(g.home_team_label || teamName(g.home_team_id))}</span>
          <span class="score">${escapeHtml(g.home_score ?? '-')} : ${escapeHtml(g.away_score ?? '-')}</span>
          <span class="team">${awayTeam ? teamFlagImg(awayTeam) : ''}${escapeHtml(g.away_team_label || teamName(g.away_team_id))}</span>
          <span class="meta">Grupo ${escapeHtml(g.group)} · Jornada ${escapeHtml(g.matchday)}</span>
        </div>
      </div>`;
    })
    .join('');
}

/** Lista ordenada de fechas con dos o más partidos, para la navegación
 *  explícita "fecha anterior / fecha siguiente" (independiente del mes
 *  visible en el calendario). */
function sortedDates() {
  return [...simultaneousDays].sort();
}

function updateDateNavButtons() {
  if (!prevDateBtn || !nextDateBtn) return;
  const dates = sortedDates();
  const idx = selectedKey ? dates.indexOf(selectedKey) : -1;
  prevDateBtn.disabled = idx <= 0;
  nextDateBtn.disabled = idx === -1 || idx >= dates.length - 1;
}

function goToAdjacentDate(step) {
  const dates = sortedDates();
  if (!dates.length) return;
  const idx = selectedKey ? dates.indexOf(selectedKey) : -1;
  let nextIdx;
  if (idx === -1) {
    nextIdx = step > 0 ? 0 : dates.length - 1;
  } else {
    nextIdx = idx + step;
  }
  if (nextIdx < 0 || nextIdx >= dates.length) return; // ya en el límite
  selectDay(dates[nextIdx]);
}

prevDateBtn?.addEventListener('click', () => goToAdjacentDate(-1));
nextDateBtn?.addEventListener('click', () => goToAdjacentDate(1));

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
