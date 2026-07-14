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
import { state, indexTeams, indexGroups, setFavoriteTeam, flagColorsForTeam } from './state.js';
import { iconMarkup } from './icons.js';

const chipsEl = document.getElementById('team-chips');
const panelEl = document.getElementById('dashboard-panel');
const dashRoot = document.getElementById('view-dashboard');
const searchInput = document.getElementById('team-search-input');
const searchClearBtn = document.getElementById('team-search-clear');
const searchEmptyEl = document.getElementById('team-search-empty');

/** Quita acentos/diacríticos y pasa a minúsculas, para comparar de forma tolerante. */
function normalize(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export async function initDashboard() {
  chipsEl.innerHTML = Array.from({ length: 12 })
    .map(() => `<div class="skeleton" style="height:34px;width:96px;display:inline-block;border-radius:999px"></div>`)
    .join(' ');

  let stale = false;
  try {
    if (!state.teams.length) {
      const { data, stale: s1 } = await Endpoints.teams();
      indexTeams(data.teams || data);
      stale ||= s1;
    }
    if (!state.groups.length) {
      const { data, stale: s2 } = await Endpoints.groups();
      indexGroups(data.groups || data);
      stale ||= s2;
    }
    if (!state.games.length) {
      const { data, stale: s3 } = await Endpoints.games();
      state.games = data.games || data;
      stale ||= s3;
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
    selectTeam(saved, stale);
  } else {
    panelEl.innerHTML = `<p>Elige tu equipo favorito para ver su panel personalizado.</p>`;
  }
}

function renderChips() {
  const query = normalize(searchInput?.value || '');
  const filtered = query
    ? state.teams.filter((t) => normalize(t.name_en).includes(query))
    : state.teams;

  searchEmptyEl?.classList.toggle('hidden', filtered.length > 0);
  chipsEl.classList.toggle('hidden', filtered.length === 0);

  chipsEl.innerHTML = filtered
    .map((t) => {
      const [c1, c2] = flagColorsForTeam(t);
      return `
      <button type="button" class="team-chip" data-id="${t.id}" style="--c1:${c1};--c2:${c2}">
        <span class="flag-dot"></span>${t.name_en}
      </button>`;
    })
    .join('');

  chipsEl.querySelectorAll('.team-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      setFavoriteTeam(chip.dataset.id);
      selectTeam(chip.dataset.id, false);
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

function selectTeam(teamId, stale) {
  markActiveChip();
  const team = state.teamsById[teamId];
  if (!team) return;

  const [c1, c2] = flagColorsForTeam(team);
  // Tematización dinámica: repinta las variables CSS del dashboard con los
  // colores de la bandera del equipo elegido.
  dashRoot.style.setProperty('--c1', c1);
  dashRoot.style.setProperty('--c2', c2);

  const teamGames = state.games.filter(
    (g) => String(g.home_team_id) === String(teamId) || String(g.away_team_id) === String(teamId)
  );

  const group = state.groupsByName[team.groups];
  const standingRow = group ? group.teams.find((t) => String(t.team_id) === String(teamId)) : null;

  panelEl.innerHTML = `
    ${stale ? '<span class="badge badge-stale">Datos no actualizados</span>' : ''}
    <div class="dash-grid">
      <div class="card">
        <div class="team-header">
          <span class="flag-dot"></span>
          <h3>${team.name_en}</h3>
        </div>
        <p class="text-muted">Grupo ${team.groups} · Código FIFA ${team.fifa_code}</p>
        ${renderStanding(group, teamId)}
      </div>
      <div class="card">
        <h3>Partidos de ${team.name_en}</h3>
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
        <span>${t ? t.fifa_code : row.team_id}</span>
        <span>${t ? t.name_en : row.team_id}</span>
        <span>${row.pts} pts</span>
        <span>${row.gf} GF</span>
        <span>${row.ga} GA</span>
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
      const rival = isHome
        ? g.away_team_label || teamNameSafe(g.away_team_id)
        : g.home_team_label || teamNameSafe(g.home_team_id);
      return `
      <div class="match-row">
        <span class="team home">${isHome ? 'Local' : 'Visitante'}</span>
        <span class="score">${g.home_score ?? '-'} : ${g.away_score ?? '-'}</span>
        <span class="team away">vs ${rival}</span>
        <span class="meta">${g.local_date}</span>
      </div>`;
    })
    .join('');
}

function teamNameSafe(id) {
  const t = state.teamsById[String(id)];
  return t ? t.name_en : 'Por definir';
}
