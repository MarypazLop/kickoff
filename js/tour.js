/**
 * tour.js — 2.1 Tour Virtual de Sedes
 * Objetivo técnico: scrollIntoView + estado activo entre elementos.
 * Reto de resiliencia: si /get/games falla, las sedes siguen siendo
 * clicables; solo la sección de partidos de esa sede muestra un error local.
 */
import { Endpoints, ApiError } from './api.js';
import { state, indexStadiums, indexTeams, teamName, stadiumImagePath, setStale, anyStale, staleSavedAt, escapeHtml } from './state.js';
import { iconMarkup } from './icons.js';
import { teamFlagImg } from './flags.js';

const listEl = document.getElementById('stadium-list');
const gamesSection = document.getElementById('games-of-stadium');
const gamesTitle = document.getElementById('games-of-stadium-title');
const gamesBody = document.getElementById('games-of-stadium-body');
const staleBadgeEl = document.getElementById('tour-stale-badge');

let activeStadiumId = null;
let gamesLoaded = false;

function renderStaleBadge() {
  if (!staleBadgeEl) return;
  const stale = anyStale('stadiums', 'teams', 'games');
  if (!stale) {
    staleBadgeEl.classList.add('hidden');
    staleBadgeEl.innerHTML = '';
    return;
  }
  const savedAt = staleSavedAt('stadiums', 'teams', 'games');
  staleBadgeEl.classList.remove('hidden');
  staleBadgeEl.innerHTML = `<span class="badge badge-stale">Datos no actualizados${savedAt ? ' · ' + new Date(savedAt).toLocaleString('es-CR') : ''}</span>`;
}

export async function initTour() {
  renderStadiumsSkeleton();
  try {
    if (!state.stadiums.length) {
      const { data, stale, savedAt } = await Endpoints.stadiums();
      indexStadiums(data.stadiums || data);
      setStale('stadiums', stale, savedAt);
    }
    renderStadiums();
    renderStaleBadge();
  } catch (err) {
    listEl.innerHTML = `<div class="inline-error">No se pudieron cargar las 16 sedes. <button class="btn btn-sm" id="retry-stadiums"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar</button></div>`;
    document.getElementById('retry-stadiums')?.addEventListener('click', initTour);
    return;
  }

  // Precarga los partidos en segundo plano (no bloquea la navegación entre sedes)
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
    gamesLoaded = true;
    renderStaleBadge();
  } catch (err) {
    gamesLoaded = false;
  }

  if (activeStadiumId) selectStadium(activeStadiumId);
}

function renderStadiumsSkeleton() {
  listEl.innerHTML = Array.from({ length: 8 })
    .map(() => `<div class="skeleton skeleton-stadium"></div>`)
    .join('');
}

function renderStadiums() {
  listEl.innerHTML = state.stadiums
    .map((s) => {
      const image = stadiumImagePath(s);
      // Sin foto real disponible: se conserva el fondo degradado actual como
      // respaldo visual consistente, en vez de dejar una ruta rota.
      const photo = image
        ? `<img class="stadium-btn-photo" src="${image}" alt="Fachada del estadio ${escapeHtml(s.name_en)}" loading="lazy">`
        : '';

      return `
      <button class="stadium-btn image-overlay stadium-image-overlay" data-id="${escapeHtml(s.id)}" type="button">
        ${photo}
        <span class="icon-row">
          <span class="icon" aria-hidden="true">${iconMarkup('stadium')}</span>
        </span>
        <span class="name">${escapeHtml(s.name_en)}</span>
        <span class="city">${escapeHtml(s.city_en)}, ${escapeHtml(s.country_en)}</span>
        <span class="cap">Aforo: ${escapeHtml(Number(s.capacity).toLocaleString('es-CR'))}</span>
      </button>`;
    })
    .join('');

  listEl.querySelectorAll('.stadium-btn').forEach((btn) => {
    btn.addEventListener('click', () => selectStadium(btn.dataset.id));
  });
}

function selectStadium(stadiumId) {
  activeStadiumId = stadiumId;

  listEl.querySelectorAll('.stadium-btn').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.id === stadiumId);
  });

  const stadium = state.stadiumsById[stadiumId];
  gamesTitle.textContent = stadium
    ? `Partidos en ${stadium.name_en}`
    : 'Partidos de la sede seleccionada';
  gamesSection.classList.remove('hidden');

  // Navegación interna del DOM: desplazamiento suave hacia la sección.
  gamesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  renderGamesOfStadium(stadiumId);
}

function renderGamesOfStadium(stadiumId) {
  // Reto de resiliencia: un fallo aquí NUNCA bloquea el resto de la navegación.
  if (!gamesLoaded) {
    gamesBody.innerHTML = `
      <div class="inline-error">
        No se pudieron cargar los partidos de esta sede.
        <button class="btn btn-sm" id="retry-games-of-stadium"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar</button>
      </div>`;
    document.getElementById('retry-games-of-stadium')?.addEventListener('click', async () => {
      gamesBody.innerHTML = `<div class="skeleton skeleton-games"></div>`;
      try {
        const { data, stale, savedAt } = await Endpoints.games();
        state.games = data.games || data;
        setStale('games', stale, savedAt);
        gamesLoaded = true;
        renderStaleBadge();
        renderGamesOfStadium(stadiumId);
      } catch (err) {
        renderGamesOfStadium(stadiumId);
      }
    });
    return;
  }

  const games = state.games.filter((g) => String(g.stadium_id) === String(stadiumId));
  if (!games.length) {
    gamesBody.innerHTML = `<p>Aún no hay partidos asignados a esta sede.</p>`;
    return;
  }

  gamesBody.innerHTML = games
    .map((g) => {
      const homeTeam = state.teamsById[String(g.home_team_id)];
      const awayTeam = state.teamsById[String(g.away_team_id)];
      return `
      <div class="match-row">
        <span class="team home">${homeTeam ? teamFlagImg(homeTeam) : ''}${escapeHtml(g.home_team_label || teamName(g.home_team_id))}</span>
        <span class="score">${escapeHtml(g.home_score ?? '-')} : ${escapeHtml(g.away_score ?? '-')}</span>
        <span class="team away">${awayTeam ? teamFlagImg(awayTeam) : ''}${escapeHtml(g.away_team_label || teamName(g.away_team_id))}</span>
        <span class="meta">${escapeHtml(g.local_date)} · Jornada ${escapeHtml(g.matchday)} · Grupo ${escapeHtml(g.group)}</span>
      </div>`;
    })
    .join('');
}
