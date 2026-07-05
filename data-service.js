/**
 * data-service.js
 * -----------------------------------------------------------------------
 * Reemplaza a mock-data.js. Todo acá es asíncrono porque los datos ahora
 * viven en archivos reales (data/{lang}/...) que hay que pedir por fetch.
 *
 * Cada carpeta ("binder") tiene su propio idioma de cartas (cardLanguage:
 * 'en' o 'es'), así que cada función de carga recibe `lang` como parámetro
 * y arma la ruta dentro de data/{lang}/... El caché se guarda separado por
 * idioma, para que tener abierta una carpeta en inglés y otra en español
 * en la misma sesión no mezcle resultados.
 *
 * Estrategia de carga: nunca se pide todo el catálogo de una. Cada función
 * trae solo el archivo puntual que hace falta, y lo cachea en memoria para
 * no volver a pedirlo.
 */

const DATA_BASE = 'data';

const cacheByLang = {}; // lang -> { sets, facets, searchBuckets, allBucketsMerged, byIllustrator, byGeneration, byPokemon, cardsBySet }

function cacheFor(lang) {
  if (!cacheByLang[lang]) {
    cacheByLang[lang] = {
      sets: null,
      facets: null,
      searchBuckets: new Map(),
      allBucketsMerged: null,
      byIllustrator: new Map(),
      byGeneration: new Map(),
      byPokemon: new Map(),
      cardsBySet: new Map(),
    };
  }
  return cacheByLang[lang];
}

async function fetchJSON(relativePath) {
  const res = await fetch(`${DATA_BASE}/${relativePath}`);
  if (!res.ok) throw new Error(`No se pudo cargar ${relativePath} (HTTP ${res.status})`);
  return res.json();
}

function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-nombre';
}

const SEARCH_BUCKETS = ['a-e', 'f-j', 'k-o', 'p-t', 'u-z', 'otros'];

function searchBucketFor(name) {
  const first = slugify(name).charAt(0);
  if (first >= 'a' && first <= 'e') return 'a-e';
  if (first >= 'f' && first <= 'j') return 'f-j';
  if (first >= 'k' && first <= 'o') return 'k-o';
  if (first >= 'p' && first <= 't') return 'p-t';
  if (first >= 'u' && first <= 'z') return 'u-z';
  return 'otros';
}

/** Todo texto/número que empiece con algo que no sea una letra (números, "#189", etc.) */
function looksLikeNumberQuery(query) {
  const first = slugify(query.replace(/^#/, '')).charAt(0);
  return !(first >= 'a' && first <= 'z');
}

/** Lista de todos los sets del idioma pedido (liviano) — se pide una sola vez por idioma */
async function loadSets(lang = 'en') {
  const c = cacheFor(lang);
  if (c.sets) return c.sets;
  const list = await fetchJSON(`${lang}/sets.json`);
  c.sets = new Map(list.map((s) => [s.id, s]));
  return c.sets;
}

/** rarezas / tipos / ilustradores / generaciones disponibles, para poblar filtros */
async function loadFacets(lang = 'en') {
  const c = cacheFor(lang);
  if (c.facets) return c.facets;
  c.facets = await fetchJSON(`${lang}/indices/facets.json`);
  return c.facets;
}

async function loadSearchBucket(bucket, lang = 'en') {
  const c = cacheFor(lang);
  if (c.searchBuckets.has(bucket)) return c.searchBuckets.get(bucket);
  const data = await fetchJSON(`${lang}/indices/search/${bucket}.json`);
  c.searchBuckets.set(bucket, data);
  return data;
}

/**
 * Para búsquedas por número de carta: traemos todos los bloques alfabéticos
 * y los combinamos. Se cachea por idioma igual que el resto.
 */
async function loadAllSearchBuckets(lang = 'en') {
  const c = cacheFor(lang);
  if (c.allBucketsMerged) return c.allBucketsMerged;
  const results = await Promise.all(
    SEARCH_BUCKETS.map((bucket) => loadSearchBucket(bucket, lang).catch(() => null))
  );
  const cards = results.filter(Boolean).flatMap((r) => r.cards);
  c.allBucketsMerged = { totalCards: cards.length, cards };
  return c.allBucketsMerged;
}

async function loadByIllustrator(slug, lang = 'en') {
  const c = cacheFor(lang);
  if (c.byIllustrator.has(slug)) return c.byIllustrator.get(slug);
  const data = await fetchJSON(`${lang}/indices/by-illustrator/${slug}.json`);
  c.byIllustrator.set(slug, data);
  return data;
}

async function loadByGeneration(serieId, lang = 'en') {
  const c = cacheFor(lang);
  if (c.byGeneration.has(serieId)) return c.byGeneration.get(serieId);
  const data = await fetchJSON(`${lang}/indices/by-generation/${serieId}.json`);
  c.byGeneration.set(serieId, data);
  return data;
}

async function loadByPokemonName(slug, lang = 'en') {
  const c = cacheFor(lang);
  if (c.byPokemon.has(slug)) return c.byPokemon.get(slug);
  const data = await fetchJSON(`${lang}/indices/by-pokemon/${slug}.json`);
  c.byPokemon.set(slug, data);
  return data;
}

/** Detalle completo (ataques, descripción, todo) de todas las cartas de un set, en un idioma */
async function loadCardsBySet(setId, lang = 'en') {
  const c = cacheFor(lang);
  if (c.cardsBySet.has(setId)) return c.cardsBySet.get(setId);
  const data = await fetchJSON(`${lang}/cards/by-set/${setId}.json`);
  c.cardsBySet.set(setId, data);
  return data;
}

/**
 * Resuelve el detalle completo de una carta puntual a partir de su id
 * (ej. "base1-4") en el idioma pedido.
 */
async function resolveCard(cardId, lang = 'en') {
  const setId = cardId.slice(0, cardId.lastIndexOf('-'));
  const cards = await loadCardsBySet(setId, lang);
  return cards.find((c) => c.id === cardId) || null;
}