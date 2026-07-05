/**
 * data-service.js
 * -----------------------------------------------------------------------
 * Reemplaza a mock-data.js. Todo acá es asíncrono porque los datos ahora
 * viven en archivos reales (data/...) que hay que pedir por fetch, no en
 * un array ya cargado en memoria.
 *
 * Estrategia de carga: nunca se pide todo el catálogo de una. Cada función
 * trae solo el archivo puntual que hace falta, y lo cachea en memoria para
 * no volver a pedirlo. Así, abrir el Buscador no descarga 23.000 cartas —
 * descarga como mucho un chunk alfabético (unos miles) o un ilustrador
 * puntual (unas decenas).
 */

const DATA_BASE = 'data';

const cache = {
  sets: null, // Map<setId, setMeta>
  facets: null,
  searchBuckets: new Map(), // bucket -> {totalCards, cards}
  allBucketsMerged: null, // {totalCards, cards} combinado, para búsquedas por número
  byIllustrator: new Map(), // slug -> {name, totalCards, cards}
  byGeneration: new Map(), // serieId -> {name, totalCards, cards}
  byPokemon: new Map(), // slug -> {name, totalCards, cards}
  cardsBySet: new Map(), // setId -> full card[] (detalle completo)
};

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

/** Lista de todos los sets (liviano, 209 entradas) — se pide una sola vez */
async function loadSets() {
  if (cache.sets) return cache.sets;
  const list = await fetchJSON('sets.json');
  cache.sets = new Map(list.map((s) => [s.id, s]));
  return cache.sets;
}

/** rarezas / tipos / ilustradores / generaciones disponibles, para poblar filtros */
async function loadFacets() {
  if (cache.facets) return cache.facets;
  cache.facets = await fetchJSON('indices/facets.json');
  return cache.facets;
}

async function loadSearchBucket(bucket) {
  if (cache.searchBuckets.has(bucket)) return cache.searchBuckets.get(bucket);
  const data = await fetchJSON(`indices/search/${bucket}.json`);
  cache.searchBuckets.set(bucket, data);
  return data;
}

/**
 * Para búsquedas por número de carta: no hay forma de saber en qué bloque
 * alfabético cae un número, así que traemos todos los bloques (son solo
 * unos pocos archivos) y los combinamos. Se cachea igual que el resto, así
 * que solo paga este costo la primera vez que alguien busca por número.
 */
async function loadAllSearchBuckets() {
  if (cache.allBucketsMerged) return cache.allBucketsMerged;
  const results = await Promise.all(
    SEARCH_BUCKETS.map((bucket) =>
      loadSearchBucket(bucket).catch(() => null) // el bucket "otros" puede no existir si nadie cae ahí
    )
  );
  const cards = results.filter(Boolean).flatMap((r) => r.cards);
  cache.allBucketsMerged = { totalCards: cards.length, cards };
  return cache.allBucketsMerged;
}

async function loadByIllustrator(slug) {
  if (cache.byIllustrator.has(slug)) return cache.byIllustrator.get(slug);
  const data = await fetchJSON(`indices/by-illustrator/${slug}.json`);
  cache.byIllustrator.set(slug, data);
  return data;
}

async function loadByGeneration(serieId) {
  if (cache.byGeneration.has(serieId)) return cache.byGeneration.get(serieId);
  const data = await fetchJSON(`indices/by-generation/${serieId}.json`);
  cache.byGeneration.set(serieId, data);
  return data;
}

async function loadByPokemonName(slug) {
  if (cache.byPokemon.has(slug)) return cache.byPokemon.get(slug);
  const data = await fetchJSON(`indices/by-pokemon/${slug}.json`);
  cache.byPokemon.set(slug, data);
  return data;
}

/** Detalle completo (ataques, descripción, todo) de todas las cartas de un set */
async function loadCardsBySet(setId) {
  if (cache.cardsBySet.has(setId)) return cache.cardsBySet.get(setId);
  const data = await fetchJSON(`cards/by-set/${setId}.json`);
  cache.cardsBySet.set(setId, data);
  return data;
}

/**
 * Resuelve el detalle completo de una carta puntual a partir de su id
 * (ej. "base1-4"): separa el setId, carga ese set (cacheado) y busca la carta.
 */
async function resolveCard(cardId) {
  const setId = cardId.slice(0, cardId.lastIndexOf('-'));
  const cards = await loadCardsBySet(setId);
  return cards.find((c) => c.id === cardId) || null;
}
