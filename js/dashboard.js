/**
 * dashboard.js — 2.4 Dashboard del Fanático Incondicional
 * Objetivo técnico: tematización dinámica vía variables CSS +
 * persistencia de preferencias en localStorage.
 * Los colores de acento del panel y de la burbuja del equipo se derivan
 * de los colores de su bandera nacional (state.js -> flagColorsForTeam).
 * Reto de resiliencia: el equipo favorito sobrevive a un refresco completo.
 * Si la API no responde al recargar, se muestra el último estado cacheado
 * de ese equipo con aviso de "datos no actualizados", nunca un dashboard vacío.
 */
import { Endpoints } from './api.js';
import { state, indexTeams, indexGroups, setFavoriteTeam, flagColorsForTeam, normalizeText, setStale, anyStale, staleSavedAt, escapeHtml } from './state.js';
import { iconMarkup } from './icons.js';
import { teamFlagImg } from './flags.js';

const chipsEl = document.getElementById('team-chips');
const panelEl = document.getElementById('dashboard-panel');
const dashRoot = document.getElementById('view-dashboard');
const searchInput = document.getElementById('team-search-input');
const searchClearBtn = document.getElementById('team-search-clear');
const searchEmptyEl = document.getElementById('team-search-empty');

export async function initDashboard() {
  chipsEl.innerHTML = Array.from({ length: 12 })
    .map(() => `<div class="skeleton skeleton-chip"></div>`)
    .join(' ');

  try {
    if (!state.teams.length) {
      const { data, stale, savedAt } = await Endpoints.teams();
      indexTeams(data.teams || data);
      setStale('teams', stale, savedAt);
    }
    if (!state.groups.length) {
      const { data, stale, savedAt } = await Endpoints.groups();
      indexGroups(data.groups || data);
      setStale('groups', stale, savedAt);
    }
    if (!state.games.length) {
      const { data, stale, savedAt } = await Endpoints.games();
      state.games = data.games || data;
      setStale('games', stale, savedAt);
    }
  } catch (err) {
    panelEl.innerHTML = `
      <div class="inline-error">
        No se pudo cargar la información de equipos.
        <button class="btn btn-sm" id="retry-dashboard"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar</button>
      </div>`;
    document.getElementById('retry-dashboard')?.addEventListener('click', initDashboard);
    chipsEl.innerHTML = '';
    return;
  }

  renderChips();

  const saved = state.favoriteTeamId;
  if (saved && state.teamsById[saved]) {
    selectTeam(saved);
  } else {
    panelEl.innerHTML = `<p>Elige tu equipo favorito para ver su panel personalizado.</p>`;
  }
}

function renderChips() {
  const query = normalizeText(searchInput?.value || '');
  // La búsqueda funciona por nombre completo, y también por código FIFA/ISO
  // (mayúsculas, minúsculas y acentos ya normalizados por normalizeText).
  const filtered = query
    ? state.teams.filter((t) =>
        normalizeText(t.name_en).includes(query) ||
        normalizeText(t.fifa_code).includes(query)
      )
    : state.teams;

  searchEmptyEl?.classList.toggle('hidden', filtered.length > 0);
  chipsEl.classList.toggle('hidden', filtered.length === 0);

  chipsEl.innerHTML = filtered
    .map((t) => {
      const [c1, c2] = flagColorsForTeam(t);
      return `
      <button type="button" class="team-chip" data-id="${escapeHtml(t.id)}" style="--c1:${c1};--c2:${c2}">
        ${teamFlagImg(t)}${escapeHtml(t.name_en)}
      </button>`;
    })
    .join('');

  chipsEl.querySelectorAll('.team-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      setFavoriteTeam(chip.dataset.id);
      selectTeam(chip.dataset.id);
    });
  });
  markActiveChip();
}

searchInput?.addEventListener('input', () => {
  searchClearBtn?.classList.toggle('hidden', !searchInput.value);
  renderChips();
});

searchClearBtn?.addEventListener('click', () => {
  if (!searchInput) return;
  searchInput.value = '';
  searchClearBtn.classList.add('hidden');
  renderChips();
  searchInput.focus();
});

function markActiveChip() {
  chipsEl.querySelectorAll('.team-chip').forEach((chip) => {
    chip.classList.toggle('active', chip.dataset.id === state.favoriteTeamId);
  });
}

function selectTeam(teamId) {
  markActiveChip();
  const team = state.teamsById[teamId];
  if (!team) return;

  // Indicador persistente: no depende de si ESTA llamada refrescó datos,
  // sino de si algún recurso usado por este panel sigue sirviéndose desde
  // caché (429/500/offline previo). Se mantiene visible entre cambios de
  // equipo hasta que una petición fresca lo limpie.
  const stale = anyStale('teams', 'groups', 'games');
  const savedAt = staleSavedAt('teams', 'groups', 'games');

  const [c1, c2] = flagColorsForTeam(team);
  // Tematización dinámica: repinta las variables CSS del dashboard con los
  // colores de la bandera del equipo elegido.
  dashRoot.style.setProperty('--c1', c1);
  dashRoot.style.setProperty('--c2', c2);

  const teamGames = state.games.filter(
    (g) => String(g.home_team_id) === String(teamId) || String(g.away_team_id) === String(teamId)
  );

  // El grupo del propio equipo puede venir en distinta mayúscula/minúscula
  // que las etiquetas ya resueltas en indexGroups(), así que se normaliza
  // antes de buscarlo.
  const groupLabel = String(team.groups || '').trim().toUpperCase();
  const group = state.groupsByName[groupLabel];

  panelEl.innerHTML = `
    ${stale ? `<span class="badge badge-stale">Datos no actualizados${savedAt ? ' · ' + new Date(savedAt).toLocaleString('es-CR') : ''}</span>` : ''}
    <div class="dash-grid">
      <div class="card">
        <div class="team-header">
          ${teamFlagImg(team, { class: 'flag-icon-lg' })}
          <h3>${escapeHtml(team.name_en)}</h3>
        </div>
        <p class="text-muted">Grupo ${escapeHtml(groupLabel) || '—'} · Código FIFA ${escapeHtml(team.fifa_code)}</p>
        ${renderStanding(group, teamId)}
      </div>
      <div class="card">
        <h3>Partidos de ${escapeHtml(team.name_en)}</h3>
        ${renderTeamGames(teamGames, teamId)}
      </div>
    </div>`;
}

function renderStanding(group, teamId) {
  if (!group) return '<p class="text-muted">Aún sin datos de grupo.</p>';
  const rows = group.teams
    .map((row) => {
      const t = state.teamsById[row.team_id];
      const isSelf = String(row.team_id) === String(teamId);
      return `
      <div class="standing-row ${isSelf ? 'self' : ''}">
        <span>${t ? teamFlagImg(t) : ''}${escapeHtml(t ? t.fifa_code : row.team_id)}</span>
        <span>${escapeHtml(t ? t.name_en : row.team_id)}</span>
        <span>${escapeHtml(row.pts)} pts</span>
        <span>${escapeHtml(row.gf)} GF</span>
        <span>${escapeHtml(row.ga)} GA</span>
      </div>`;
    })
    .join('');
  return `
    <div class="standing-row h"><span></span><span>Equipo</span><span>Pts</span><span>GF</span><span>GA</span></div>
    ${rows}`;
}

function renderTeamGames(games, teamId) {
  if (!games.length) return '<p class="text-muted">Sin partidos programados todavía.</p>';
  return games
    .map((g) => {
      const isHome = String(g.home_team_id) === String(teamId);
      const rivalId = isHome ? g.away_team_id : g.home_team_id;
      const rivalTeam = state.teamsById[String(rivalId)];
      const rival = isHome
        ? g.away_team_label || teamNameSafe(g.away_team_id)
        : g.home_team_label || teamNameSafe(g.home_team_id);
      return `
      <div class="match-row">
        <span class="team home">${isHome ? 'Local' : 'Visitante'}</span>
        <span class="score">${escapeHtml(g.home_score ?? '-')} : ${escapeHtml(g.away_score ?? '-')}</span>
        <span class="team away">vs ${rivalTeam ? teamFlagImg(rivalTeam) : ''}${escapeHtml(rival)}</span>
        <span class="meta">${escapeHtml(g.local_date)}</span>
      </div>`;
    })
    .join('');
}

function teamNameSafe(id) {
  const t = state.teamsById[String(id)];
  return t ? t.name_en : 'Por definir';
}
