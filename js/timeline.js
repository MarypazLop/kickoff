/**
 * timeline.js — 2.3 Timeline Infinito
 * Objetivo técnico: IntersectionObserver para carga progresiva en el DOM
 * (los 104 partidos se piden en UNA sola llamada; la paginación es visual).
 * Reto de resiliencia: si la carga inicial falla, el observer no se activa
 * indefinidamente: se muestra un botón de reintento manual que dispara el
 * backoff exponencial. Al recuperar, la inserción arranca desde el principio
 * sin duplicar partidos ya insertados.
 */
import { Endpoints } from './api.js';
import { state, indexTeams, teamName } from './state.js';
import { iconMarkup } from './icons.js';

const containerEl = document.getElementById('timeline-container');
const statusEl = document.getElementById('timeline-status');

const BLOCK_SIZE = 10;

let sortedGames = [];
let insertedCount = 0;
let insertedIds = new Set();
let observer = null;
let sentinelEl = null;

export async function initTimeline() {
  resetTimelineDOM();
  statusEl.textContent = 'Cargando los 104 partidos…';
  statusEl.classList.remove('hidden');

  try {
    if (!state.teams.length) {
      const { data: teamsData } = await Endpoints.teams();
      indexTeams(teamsData.teams || teamsData);
    }
    const { data } = await Endpoints.games();
    const games = data.games || data;

    sortedGames = games
      .slice()
      .sort((a, b) => new Date(a.local_date) - new Date(b.local_date));

    startProgressiveInsertion();
  } catch (err) {
    statusEl.innerHTML = `
      No se pudo cargar el calendario del torneo.
      <button class="btn btn-sm" id="timeline-retry"><span class="icon" aria-hidden="true">${iconMarkup('refresh')}</span>Reintentar</button>`;
    document.getElementById('timeline-retry')?.addEventListener('click', initTimeline);
  }
}

function resetTimelineDOM() {
  if (observer) observer.disconnect();
  containerEl.innerHTML = '';
  insertedCount = 0;
  insertedIds = new Set();
}

function startProgressiveInsertion() {
  statusEl.classList.add('hidden');
  insertNextBlock();
  createSentinel();

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && insertedCount < sortedGames.length) {
          insertNextBlock();
          repositionSentinel();
        }
        if (insertedCount >= sortedGames.length) {
          statusEl.textContent = 'Fin del calendario del torneo.';
          statusEl.classList.remove('hidden');
          observer.disconnect();
        }
      });
    },
    { root: null, rootMargin: '200px', threshold: 0 }
  );
  observer.observe(sentinelEl);
}

function createSentinel() {
  sentinelEl = document.createElement('div');
  sentinelEl.className = 'sentinel';
  containerEl.appendChild(sentinelEl);
}
function repositionSentinel() {
  containerEl.appendChild(sentinelEl); // siempre al final
}

function insertNextBlock() {
  const slice = sortedGames.slice(insertedCount, insertedCount + BLOCK_SIZE);
  const block = document.createElement('div');
  block.className = 'timeline-block';

  const label = document.createElement('div');
  label.className = 'day-label';
  label.textContent = `Partidos ${insertedCount + 1}–${insertedCount + slice.length} de ${sortedGames.length}`;
  block.appendChild(label);

  slice.forEach((g) => {
    // Evita duplicar partidos ya insertados en intentos previos.
    if (insertedIds.has(g.id)) return;
    insertedIds.add(g.id);

    const row = document.createElement('div');
    row.className = 'match-row';
    row.innerHTML = `
      <span class="team home">${g.home_team_label || teamName(g.home_team_id)}</span>
      <span class="score">${g.home_score ?? '-'} : ${g.away_score ?? '-'}</span>
      <span class="team away">${g.away_team_label || teamName(g.away_team_id)}</span>
      <span class="meta">${g.local_date} · Grupo ${g.group}</span>`;
    block.appendChild(row);
  });

  containerEl.insertBefore(block, sentinelEl);
  insertedCount += slice.length;
}
