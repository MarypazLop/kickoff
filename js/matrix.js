/**
 * matrix.js — 2.5 Matriz de Enfrentamientos por Grupo
 * Objetivo técnico: cuadrícula interactiva cruzando 3 recursos (grupos,
 * equipos, partidos).
 * Reto de resiliencia: si /get/games falla, la matriz se dibuja completa
 * con todas las celdas en "Pendiente" (nunca se oculta la matriz). Al
 * recuperar la conexión, solo se actualizan las celdas afectadas.
 *
 * Nota de robustez: el render se envuelve en try/catch y todos los campos
 * externos se leen de forma defensiva, para que un dato inesperado de la
 * API nunca deje el contenedor en blanco sin explicación.
 */
import { Endpoints } from './api.js';
import { state, indexTeams, indexGroups, setStale, anyStale, staleSavedAt, escapeHtml } from './state.js';
import { iconMarkup } from './icons.js';

const containerEl = document.getElementById('matrix-container');
const staleBadgeEl = document.getElementById('matrix-stale-badge');
let gamesAvailable = false;

function renderStaleBadge() {
  if (!staleBadgeEl) return;
  const stale = anyStale('teams', 'groups', 'games');
  if (!stale) {
    staleBadgeEl.classList.add('hidden');
    staleBadgeEl.innerHTML = '';
    return;
  }
  const savedAt = staleSavedAt('teams', 'groups', 'games');
  staleBadgeEl.classList.remove('hidden');
  staleBadgeEl.innerHTML = `<span class="badge badge-stale">Datos no actualizados${savedAt ? ' · ' + new Date(savedAt).toLocaleString('es-CR') : ''}</span>`;
}

export async function initMatrix() {
  containerEl.innerHTML = Array.from({ length: 3 })
    .map(() => `<div class="skeleton skeleton-group"></div>`)
    .join('');

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
  } catch (err) {
    showBaseError();
    return;
  }

  if (!state.groups.length || !state.teams.length) {
    showBaseError();
    return;
  }

  // Los partidos pueden fallar de forma independiente: la matriz se dibuja igual.
  try {
    if (!state.games.length) {
      const { data, stale, savedAt } = await Endpoints.games();
      state.games = data.games || data;
      setStale('games', stale, savedAt);
    }
    gamesAvailable = true;
  } catch (err) {
    gamesAvailable = false;
  }

  try {
    renderAllGroups();
    renderStaleBadge();
  } catch (err) {
    console.error('Error dibujando la matriz de grupos:', err);
    showBaseError();
  }
}

function showBaseError() {
  containerEl.innerHTML = `
    <div class="inline-error">
      No se pudieron cargar los grupos o equipos del torneo.
      <button class="btn btn-sm" id="retry-matrix-base"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar</button>
    </div>`;
  document.getElementById('retry-matrix-base')?.addEventListener('click', initMatrix);
}

function findMatch(teamA, teamB) {
  return state.games.find(
    (g) =>
      (String(g.home_team_id) === String(teamA) && String(g.away_team_id) === String(teamB)) ||
      (String(g.home_team_id) === String(teamB) && String(g.away_team_id) === String(teamA))
  );
}

function cellContent(teamA, teamB) {
  if (!gamesAvailable) return { text: 'Pendiente', played: false };
  const match = findMatch(teamA, teamB);
  if (!match || String(match.finished).toUpperCase() !== 'TRUE') return { text: 'Pendiente', played: false };
  const aIsHome = String(match.home_team_id) === String(teamA);
  const scoreA = aIsHome ? match.home_score : match.away_score;
  const scoreB = aIsHome ? match.away_score : match.home_score;
  return { text: `${escapeHtml(scoreA)} - ${escapeHtml(scoreB)}`, played: true };
}

function renderAllGroups() {
  containerEl.innerHTML = '';

  // Defensivo: algunos grupos podrían no traer el campo "group" bien formado;
  // se filtran y se ordena por el nombre de grupo ya resuelto (ver state.js).
  const groups = state.groups
    .filter((g) => g && Array.isArray(g.teams) && g.teams.length)
    .slice()
    .sort((a, b) => a.label.localeCompare(b.label));

  if (!groups.length) {
    showBaseError();
    return;
  }

  groups.forEach((group) => {
    const teamIds = group.teams.map((t) => String(t.team_id));
    const teams = teamIds.map((id) => state.teamsById[id]).filter(Boolean);
    if (!teams.length) return;

    const block = document.createElement('div');
    block.className = 'group-block';
    block.dataset.group = group.label;

    const header = `
      <h3>
        <span class="group-letter">${escapeHtml(group.label)}</span>
        Grupo ${escapeHtml(group.label)}
        ${!gamesAvailable ? '<span class="badge badge-stale">Partidos no disponibles</span>' : ''}
      </h3>`;

    const headRow = `<tr><th></th>${teams.map((t) => `<th title="${escapeHtml(t.name_en)}">${escapeHtml(t.fifa_code)}</th>`).join('')}</tr>`;

    const bodyRows = teams
      .map((rowTeam) => {
        const cells = teams
          .map((colTeam) => {
            if (rowTeam.id === colTeam.id) {
              return `<td class="diagonal" data-row="${escapeHtml(rowTeam.id)}" data-col="${escapeHtml(colTeam.id)}">—</td>`;
            }
            const { text, played } = cellContent(rowTeam.id, colTeam.id);
            return `<td class="${played ? 'played' : 'pending'}" data-row="${escapeHtml(rowTeam.id)}" data-col="${escapeHtml(colTeam.id)}">${text}</td>`;
          })
          .join('');
        return `<tr><th title="${escapeHtml(rowTeam.name_en)}">${escapeHtml(rowTeam.fifa_code)}</th>${cells}</tr>`;
      })
      .join('');

    block.innerHTML = `
      ${header}
      <div class="scroll-x">
        <table class="matrix-table">
          <thead>${headRow}</thead>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>`;
    containerEl.appendChild(block);
  });

  if (!gamesAvailable) {
    const retryBar = document.createElement('div');
    retryBar.className = 'inline-error mt-1';
    retryBar.innerHTML = `Los resultados no están disponibles. <button class="btn btn-sm" id="retry-matrix-games"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar partidos</button>`;
    containerEl.appendChild(retryBar);
    document.getElementById('retry-matrix-games')?.addEventListener('click', refreshGamesOnly);
  }
}

/** Al recuperar la conexión, solo se actualizan las celdas afectadas;
 *  la matriz completa NO se reconstruye desde cero. */
async function refreshGamesOnly() {
  try {
    const { data, stale, savedAt } = await Endpoints.games();
    state.games = data.games || data;
    setStale('games', stale, savedAt);
    gamesAvailable = true;

    document.querySelectorAll('.matrix-table td:not(.diagonal)').forEach((td) => {
      const { row, col } = td.dataset;
      const { text, played } = cellContent(row, col);
      td.textContent = text;
      td.classList.toggle('played', played);
      td.classList.toggle('pending', !played);
    });
    document.querySelectorAll('.group-block .badge-stale').forEach((b) => b.remove());
    document.getElementById('retry-matrix-games')?.closest('.inline-error')?.remove();
    renderStaleBadge();
  } catch (err) {
    // Se mantiene el estado "Pendiente"; el usuario puede reintentar de nuevo.
  }
}
