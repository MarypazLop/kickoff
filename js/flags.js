/**
 * flags.js — fuente única de banderas de países/selecciones.
 * Los archivos SVG viven en assets/flags/<iso>.svg (código ISO 3166-1
 * alpha-2 en minúscula, tal como los nombra la librería flag-icons) para que
 * funcionen sin conexión y sin depender de un enlace remoto frágil.
 *
 * La API del torneo solo entrega `fifa_code` (3 letras) por equipo, sin
 * código ISO ni URL de bandera, así que aquí se centraliza el único mapeo
 * FIFA -> ISO de todo el proyecto. Ninguna vista debe repetir esta tabla.
 */
import { escapeHtml } from './state.js';

/** FIFA (3 letras) -> ISO 3166-1 alpha-2 (nombre de archivo en assets/flags). */
const FIFA_TO_ISO = {
  MEX: 'mx', RSA: 'za', KOR: 'kr', CZE: 'cz', CAN: 'ca', SUI: 'ch', QAT: 'qa', BIH: 'ba',
  BRA: 'br', MAR: 'ma', HAI: 'ht', SCO: 'gb-sct', USA: 'us', PAR: 'py', AUS: 'au', TUR: 'tr',
  GER: 'de', CUW: 'cw', CIV: 'ci', ECU: 'ec', NED: 'nl', JPN: 'jp', TUN: 'tn', SWE: 'se',
  BEL: 'be', EGY: 'eg', IRN: 'ir', NZL: 'nz', ESP: 'es', CPV: 'cv', KSA: 'sa', URU: 'uy',
  FRA: 'fr', SEN: 'sn', NOR: 'no', IRQ: 'iq', ARG: 'ar', ALG: 'dz', AUT: 'at', JOR: 'jo',
  POR: 'pt', COL: 'co', UZB: 'uz', COD: 'cd', ENG: 'gb-eng', CRO: 'hr', GHA: 'gh', PAN: 'pa',
};

/** Alias por nombre (sin acentos, minúsculas) para equipos con nombres alternos. */
const NAME_TO_ISO = {
  'mexico': 'mx', 'sudafrica': 'za', 'south africa': 'za', 'corea del sur': 'kr', 'south korea': 'kr',
  'republica checa': 'cz', 'czechia': 'cz', 'czech republic': 'cz', 'canada': 'ca', 'suiza': 'ch',
  'switzerland': 'ch', 'catar': 'qa', 'qatar': 'qa', 'bosnia y herzegovina': 'ba', 'bosnia': 'ba',
  'brasil': 'br', 'brazil': 'br', 'marruecos': 'ma', 'morocco': 'ma', 'haiti': 'ht', 'escocia': 'gb-sct',
  'scotland': 'gb-sct', 'estados unidos': 'us', 'united states': 'us', 'usa': 'us', 'paraguay': 'py',
  'australia': 'au', 'turquia': 'tr', 'turkiye': 'tr', 'turkey': 'tr', 'alemania': 'de', 'germany': 'de',
  'curazao': 'cw', 'curacao': 'cw', 'costa de marfil': 'ci', 'ivory coast': 'ci', "cote d'ivoire": 'ci',
  'ecuador': 'ec', 'paises bajos': 'nl', 'holanda': 'nl', 'netherlands': 'nl', 'japon': 'jp', 'japan': 'jp',
  'tunez': 'tn', 'tunisia': 'tn', 'suecia': 'se', 'sweden': 'se', 'belgica': 'be', 'belgium': 'be',
  'egipto': 'eg', 'egypt': 'eg', 'iran': 'ir', 'nueva zelanda': 'nz', 'new zealand': 'nz', 'espana': 'es',
  'spain': 'es', 'cabo verde': 'cv', 'cape verde': 'cv', 'arabia saudita': 'sa', 'saudi arabia': 'sa',
  'uruguay': 'uy', 'francia': 'fr', 'france': 'fr', 'senegal': 'sn', 'noruega': 'no', 'norway': 'no',
  'irak': 'iq', 'iraq': 'iq', 'argentina': 'ar', 'argelia': 'dz', 'algeria': 'dz', 'austria': 'at',
  'jordania': 'jo', 'jordan': 'jo', 'portugal': 'pt', 'colombia': 'co', 'uzbekistan': 'uz',
  'republica democratica del congo': 'cd', 'dr congo': 'cd', 'congo': 'cd', 'inglaterra': 'gb-eng',
  'england': 'gb-eng', 'croacia': 'hr', 'croatia': 'hr', 'ghana': 'gh', 'panama': 'pa',
};

const FLAGS_DIR = 'assets/flags/';
const PLACEHOLDER_FLAG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="15" viewBox="0 0 20 15">' +
    '<rect width="20" height="15" rx="2" fill="#3a4a3f"/>' +
    '<path d="M6 4h8M6 7.5h8M6 11h5" stroke="#93a89c" stroke-width="1.1" stroke-linecap="round"/>' +
    '</svg>'
  );

function normalize(str) {
  return (str || '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Resuelve el código ISO de un equipo probando, en orden: código FIFA,
 * código ISO ya presente en el dato de la API, y por último el nombre
 * (normalizado, sin acentos ni mayúsculas) contra la tabla de alias.
 * @param {object} team objeto de equipo devuelto por /get/teams
 * @returns {string|null}
 */
export function resolveTeamIso(team) {
  if (!team) return null;

  const fifa = String(team.fifa_code || '').toUpperCase().trim();
  if (fifa && FIFA_TO_ISO[fifa]) return FIFA_TO_ISO[fifa];

  const explicitIso = String(team.iso_code || team.iso2 || team.country_code || '').toLowerCase().trim();
  if (explicitIso && explicitIso.length <= 6) return explicitIso;

  const byName = normalize(team.name_en || team.name || '');
  if (byName && NAME_TO_ISO[byName]) return NAME_TO_ISO[byName];

  return null;
}

/**
 * Devuelve { src, alt, iso, found } para un equipo. Si no hay bandera
 * reconocida, src apunta a un placeholder neutral (nunca una imagen rota)
 * y found queda en false para que quien llame decida si registrar el aviso.
 * @param {object} team
 */
export function getTeamFlag(team) {
  const iso = resolveTeamIso(team);
  const label = team?.name_en || team?.name || 'equipo';
  if (!iso) {
    console.warn(`[FLAGS] Sin bandera reconocida para "${label}" (fifa_code=${team?.fifa_code || '?'}). Se usa placeholder.`);
    return { src: PLACEHOLDER_FLAG, alt: `Bandera no disponible para ${label}`, iso: null, found: false };
  }
  return { src: `${FLAGS_DIR}${iso}.svg`, alt: `Bandera de ${label}`, iso, found: true };
}

/**
 * Devuelve el markup <img> listo para insertar con innerHTML, con tamaño
 * fijo (evita saltos de layout) y alt descriptivo.
 * @param {object} team
 * @param {{class?: string}} [opts]
 */
export function teamFlagImg(team, opts = {}) {
  const { src, alt } = getTeamFlag(team);
  const extraClass = opts.class ? ` ${opts.class}` : '';
  // alt viene del nombre del equipo (dato de la API externa): se escapa
  // antes de interpolarlo en el atributo para evitar una fuga de HTML/
  // atributos si el valor trae comillas o símbolos "<", ">".
  // Sin loading="lazy": son imágenes pequeñas (unas pocas KB, máximo 48 en
  // toda la app) y varias vistas las insertan de una sola vez dentro de
  // celdas de tabla (matriz de grupos); ahí el cálculo de "está en
  // viewport" que usa loading="lazy" puede no dispararse nunca y la
  // bandera se queda sin cargar. No vale la pena la carga diferida para
  // algo tan liviano.
  return `<img class="flag-icon${extraClass}" src="${src}" alt="${escapeHtml(alt)}" width="20" height="15" decoding="async">`;
}

/**
 * Fallback centralizado si una imagen de bandera falla al cargar (archivo
 * ausente o corrupto): se reemplaza una sola vez por el placeholder neutral.
 * Se usa un listener delegado en `document` (fase de captura, porque el
 * evento "error" de <img> no burbujea) en vez de un atributo `onerror`
 * en línea, para no depender de manejadores de eventos inline en el HTML
 * generado — más seguro y compatible con una Content-Security-Policy que
 * bloquee scripts/inline handlers.
 */
document.addEventListener(
  'error',
  (event) => {
    const img = event.target;
    if (
      img instanceof HTMLImageElement &&
      img.classList.contains('flag-icon') &&
      img.src !== PLACEHOLDER_FLAG
    ) {
      img.src = PLACEHOLDER_FLAG;
      img.alt = 'Bandera no disponible';
    }
  },
  true
);
