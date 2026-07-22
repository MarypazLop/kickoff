/**
 * state.js
 * Estado compartido en memoria para esta sesión de la app (no persistente;
 * lo persistente vive en localStorage a través de api.js).
 */
export const state = {
  teams: [],
  teamsById: {},
  stadiums: [],
  stadiumsById: {},
  groups: [],
  groupsByName: {},
  games: [],
  favoriteTeamId: localStorage.getItem('wc2026_favorite_team') || null,
  // Indicador persistente por recurso: una vez marcado "stale" (servido
  // desde caché por un 429/500/offline), se mantiene así aunque el usuario
  // cambie de vista, hasta que una petición fresca lo limpie explícitamente.
  stale: { teams: false, stadiums: false, groups: false, games: false },
  staleSavedAt: { teams: null, stadiums: null, groups: null, games: null },
};

/** Marca (o limpia) el indicador persistente de "datos no actualizados"
 *  de un recurso. Se llama tras CADA fetch (exitoso o servido desde caché),
 *  nunca cuando la vista solo reutiliza datos ya cargados en memoria. */
export function setStale(resource, value, savedAt = null) {
  if (!(resource in state.stale)) return;
  state.stale[resource] = Boolean(value);
  state.staleSavedAt[resource] = value ? savedAt : null;
}

/** true si cualquiera de los recursos indicados está marcado como stale. */
export function anyStale(...resources) {
  return resources.some((r) => state.stale[r]);
}

/** La fecha de guardado más reciente entre los recursos indicados que
 *  estén marcados como stale (para mostrarla en la insignia). */
export function staleSavedAt(...resources) {
  const dates = resources.map((r) => state.staleSavedAt[r]).filter(Boolean);
  return dates.length ? Math.max(...dates) : null;
}

export function indexTeams(list) {
  state.teams = Array.isArray(list) ? [...list] : [];
  // Orden alfabético estable, ignorando mayúsculas/minúsculas y acentos.
  state.teams.sort((a, b) =>
    (a.name_en || '').localeCompare(b.name_en || '', 'es', { sensitivity: 'base' })
  );
  state.teamsById = Object.fromEntries(state.teams.map((t) => [String(t.id), t]));
}

export function indexStadiums(list) {
  state.stadiums = Array.isArray(list) ? list : [];
  state.stadiumsById = Object.fromEntries(state.stadiums.map((s) => [String(s.id), s]));
}

export function indexGroups(list) {
  const rawGroups = Array.isArray(list) ? list : [];
  // Cada grupo se re-etiqueta una sola vez aquí, así matrix.js y dashboard.js
  // nunca necesitan saber cuál era el nombre exacto del campo en la API.
  state.groups = rawGroups.map((group, index) => ({
    ...group,
    label: resolveGroupLabel(group, index),
  }));
  state.groupsByName = Object.fromEntries(state.groups.map((g) => [g.label, g]));
}

/**
 * Resuelve el identificador real de un grupo (A, B, C…) sin asumir un único
 * nombre de campo. Se intentan, en orden, los nombres más comunes que puede
 * usar la API (`group`, `groupName`, `name`, `letter`, `code`); solo cuando
 * ninguno trae un valor utilizable se genera una letra por posición (A, B, C…),
 * y únicamente como último recurso.
 */
export function resolveGroupLabel(group, index = 0) {
  const candidates = [group?.group, group?.groupName, group?.name, group?.letter, group?.code];
  for (const candidate of candidates) {
    if (candidate === undefined || candidate === null) continue;
    const value = String(candidate).trim();
    if (value) return value.toUpperCase();
  }
  return String.fromCharCode(65 + index);
}

/** Compara ignorando mayúsculas/minúsculas y acentos (búsquedas, filtros). */
export function normalizeText(str) {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/* -------------------------------------------------------------------------
 * Fotos reales de sedes. Cada estadio del Mundial 2026 ya tiene su imagen en
 * assets/images; se relaciona por palabra clave (tolerante a acentos y
 * mayúsculas) en vez de por id, para no depender de que el nombre de la API
 * coincida carácter a carácter con el nombre del archivo.
 * ---------------------------------------------------------------------- */
const STADIUM_IMAGES_DIR = 'assets/images/';
const STADIUM_IMAGE_KEYWORDS = [
  ['azteca', 'azteca.webp'],
  ['akron', 'akron.webp'],
  ['bbva', 'bbva.webp'],
  ['bc place', 'bcplace.webp'],
  ['bmo', 'bmo.webp'],
  ['lumen', 'lumenfield.webp'],
  ['hard rock', 'hardrock-stadium.webp'],
  ['levi', 'levis-stadium.webp'],
  ['at&t', 'AT&T.webp'],
  ['att stadium', 'AT&T.webp'],
  ['arrowhead', 'arrowhead.webp'],
  ['gillette', 'gillette.webp'],
  ['lincoln', 'lincoln.webp'],
  ['mercedes', 'mercedes-benz.webp'],
  ['metlife', 'metlife.webp'],
  ['nrg', 'nrg.webp'],
  ['sofi', 'sofi.webp'],
];

/** Devuelve la ruta de la foto real del estadio, o null si no hay coincidencia. */
export function stadiumImagePath(stadium) {
  const name = normalizeText(stadium?.name_en);
  const match = STADIUM_IMAGE_KEYWORDS.find(([keyword]) => name.includes(keyword));
  return match ? `${STADIUM_IMAGES_DIR}${match[1]}` : null;
}

export function setFavoriteTeam(teamId) {
  state.favoriteTeamId = teamId;
  localStorage.setItem('wc2026_favorite_team', teamId);
}

export function teamName(id) {
  const t = state.teamsById[String(id)];
  if (t) return t.name_en;
  return id === '0' || !id ? 'Por definir' : `Equipo ${id}`;
}

export function stadiumName(id) {
  const s = state.stadiumsById[String(id)];
  return s ? s.name_en : `Sede ${id}`;
}

/* -------------------------------------------------------------------------
 * Colores de bandera por equipo (código FIFA de 3 letras -> 2 colores
 * dominantes de su bandera nacional). Se usan para tematizar dinámicamente
 * el Dashboard del Fanático y las burbujas de selección de equipo.
 * Si un equipo no está en la tabla (p. ej. un cupo de repechaje todavía sin
 * definir), se usa el verde institucional de la app como respaldo.
 * ---------------------------------------------------------------------- */
const FLAG_COLORS = {
  MEX: ['#006341', '#CE1126'], RSA: ['#007A4D', '#FFB612'], KOR: ['#003478', '#CD2E3A'], CZE: ['#11457E', '#D7141A'],
  CAN: ['#FF0000', '#B71234'], SUI: ['#FF0000', '#D52B1E'], QAT: ['#8D1B3D', '#FFFFFF'], BIH: ['#002395', '#FECB00'],
  BRA: ['#009739', '#FEDD00'], MAR: ['#C1272D', '#006233'], HAI: ['#00209F', '#D21034'], SCO: ['#0065BD', '#FFFFFF'],
  USA: ['#3C3B6E', '#B22234'], PAR: ['#D52B1E', '#0038A8'], AUS: ['#00843D', '#FFCD00'], TUR: ['#E30A17', '#FFFFFF'],
  GER: ['#000000', '#DD0000'], CUW: ['#002B7F', '#F9E814'], CIV: ['#FF8200', '#009A44'], ECU: ['#FFD100', '#034EA2'],
  NED: ['#FF6C00', '#21468B'], JPN: ['#BC002D', '#FFFFFF'], TUN: ['#E70013', '#FFFFFF'], SWE: ['#006AA7', '#FECC02'],
  BEL: ['#000000', '#ED2939'], EGY: ['#CE1126', '#C09300'], IRN: ['#239F40', '#DA0000'], NZL: ['#00247D', '#CC142B'],
  ESP: ['#AA151B', '#F1BF00'], CPV: ['#003893', '#CF2027'], KSA: ['#006C35', '#FFFFFF'], URU: ['#0038A8', '#FFFFFF'],
  FRA: ['#0055A4', '#EF4135'], SEN: ['#00853F', '#E31B23'], NOR: ['#BA0C2F', '#00205B'], IRQ: ['#CE1126', '#000000'],
  ARG: ['#74ACDF', '#FFFFFF'], ALG: ['#006233', '#D21034'], AUT: ['#ED2939', '#FFFFFF'], JOR: ['#007A3D', '#CE1126'],
  POR: ['#006600', '#FF0000'], COL: ['#FCD116', '#003893'], UZB: ['#0099B5', '#1EB53A'], COD: ['#007FFF', '#F7D618'],
  ENG: ['#CE1124', '#FFFFFF'], CRO: ['#FF0000', '#0093DD'], GHA: ['#CE1126', '#006B3F'], PAN: ['#0A3161', '#D21034'],
};
const FALLBACK = ['#e3b23c', '#4fb875'];

/** Devuelve [colorPrimario, colorSecundario] inspirados en la bandera del equipo. */
export function flagColorsForTeam(team) {
  if (!team) return FALLBACK;
  return FLAG_COLORS[team.fifa_code] || FALLBACK;
}
