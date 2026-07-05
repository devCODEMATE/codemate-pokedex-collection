#!/usr/bin/env node
/**
 * scripts/build-indices.js
 * -----------------------------------------------------------------------
 * Fase 2 — Paso 2: lee todo lo que bajó fetch-tcgdex.js (data/cards/by-set/*.json
 * + data/sets.json) y arma los índices livianos que va a consumir el front-end:
 *
 *   data/indices/by-pokemon/{slug}.json        -> todas las versiones de una carta a través de la historia
 *   data/indices/by-illustrator/{slug}.json    -> todo lo que dibujó un ilustrador
 *   data/indices/by-generation/{serieId}.json  -> agrupado por serie (base, neo, swsh, sv, ...)
 *   data/indices/search/{bucket}.json          -> catálogo completo, chunkeado alfabéticamente
 *
 * Cada índice guarda solo los campos livianos que necesita el buscador
 * (id, name, set, setName, number, rarity, image) — el detalle completo
 * (ataques, descripción, etc.) sigue viviendo únicamente en by-set/*.json
 * y se carga solo al abrir el detalle de una carta puntual.
 *
 * Regenera TODO desde cero cada vez que corre — nunca edites estos archivos
 * a mano, ni les toques nada Programáticamente aparte de este script.
 *
 * Uso:
 *   node scripts/build-indices.js
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const BY_SET_DIR = path.join(DATA_DIR, 'cards', 'by-set');
const INDICES_DIR = path.join(DATA_DIR, 'indices');

function log(msg) {
  console.log(`[build-indices] ${msg}`);
}

/** Normaliza un nombre a un slug de archivo: sin acentos, sin símbolos, minúscula, guiones */
function slugify(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // saca acentos
    .replace(/♀/g, '-f')
    .replace(/♂/g, '-m')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'sin-nombre';
}

function searchBucketFor(name) {
  const first = slugify(name).charAt(0);
  if (first >= 'a' && first <= 'e') return 'a-e';
  if (first >= 'f' && first <= 'j') return 'f-j';
  if (first >= 'k' && first <= 'o') return 'k-o';
  if (first >= 'p' && first <= 't') return 'p-t';
  if (first >= 'u' && first <= 'z') return 'u-z';
  return 'otros';
}

/** Solo los campos livianos que necesitan las grillas/buscador */
function liftweightCard(card, setMeta) {
  return {
    id: card.id,
    name: card.name,
    set: card.set ? card.set.id : setMeta.id,
    setName: card.set ? card.set.name : setMeta.name,
    number: card.localId,
    rarity: card.rarity || null,
    image: card.image || null,
    types: card.types || null,
    illustrator: card.illustrator || null,
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  if (!fs.existsSync(BY_SET_DIR)) {
    console.error(`[build-indices] No existe ${BY_SET_DIR}. Corré primero scripts/fetch-tcgdex.js.`);
    process.exit(1);
  }

  const setsMetaRaw = fs.readFileSync(path.join(DATA_DIR, 'sets.json'), 'utf8');
  const setsMeta = JSON.parse(setsMetaRaw);
  const setMetaById = setsMeta.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  const setFiles = fs.readdirSync(BY_SET_DIR).filter((f) => f.endsWith('.json'));
  log(`Leyendo ${setFiles.length} archivos de data/cards/by-set...`);

  const byPokemon = new Map(); // slug -> { name, cards: [] }
  const byIllustrator = new Map();
  const byGeneration = new Map(); // serieId -> { serieName, cards: [] }
  const bySearchBucket = new Map(); // bucket -> cards[]
  ['a-e', 'f-j', 'k-o', 'p-t', 'u-z', 'otros'].forEach((b) => bySearchBucket.set(b, []));
  let totalCardsProcessed = 0;
  let cardsWithoutIllustrator = 0;
  const rarities = new Set();
  const types = new Set();
  const illustrators = new Map(); // slug -> name
  const generations = new Map(); // serieId -> name

  for (const file of setFiles) {
    const setId = file.replace(/\.json$/, '');
    const setMeta = setMetaById[setId] || { id: setId, name: setId };
    const cards = JSON.parse(fs.readFileSync(path.join(BY_SET_DIR, file), 'utf8'));

    for (const card of cards) {
      const light = liftweightCard(card, setMeta);
      totalCardsProcessed += 1;

      if (light.rarity) rarities.add(light.rarity);
      if (light.types) light.types.forEach((t) => types.add(t));

      // --- by-pokemon (agrupa por nombre de carta, sea Pokémon o Entrenador) ---
      const nameSlug = slugify(card.name);
      if (!byPokemon.has(nameSlug)) byPokemon.set(nameSlug, { name: card.name, cards: [] });
      byPokemon.get(nameSlug).cards.push(light);

      // --- by-illustrator ---
      if (card.illustrator) {
        const illSlug = slugify(card.illustrator);
        if (!byIllustrator.has(illSlug)) byIllustrator.set(illSlug, { name: card.illustrator, cards: [] });
        byIllustrator.get(illSlug).cards.push(light);
        illustrators.set(illSlug, card.illustrator);
      } else {
        cardsWithoutIllustrator += 1;
      }

      // --- by-generation (agrupa por serie: base, neo, ex, swsh, sv, ...) ---
      const serie = setMeta.serie || { id: 'sin-serie', name: 'Sin serie' };
      if (!byGeneration.has(serie.id)) byGeneration.set(serie.id, { name: serie.name, cards: [] });
      byGeneration.get(serie.id).cards.push(light);
      generations.set(serie.id, serie.name);

      // --- search (chunks alfabéticos) ---
      const bucket = searchBucketFor(card.name);
      if (!bySearchBucket.has(bucket)) bySearchBucket.set(bucket, []);
      bySearchBucket.get(bucket).push(light);
    }
  }

  log(`Procesadas ${totalCardsProcessed} cartas de ${setFiles.length} sets.`);
  if (cardsWithoutIllustrator) {
    log(`(${cardsWithoutIllustrator} cartas sin ilustrador registrado en TCGdex — normal para Energías básicas.)`);
  }

  // --- facets.json: listas chicas para poblar los filtros del buscador sin cargar todo el catálogo ---
  const facets = {
    rarities: [...rarities].sort(),
    types: [...types].sort(),
    illustrators: [...illustrators.entries()]
      .map(([slug, name]) => ({ slug, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    generations: [...generations.entries()]
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
  };
  fs.writeFileSync(path.join(INDICES_DIR, 'facets.json'), JSON.stringify(facets, null, 2));
  log(`facets.json: ${facets.rarities.length} rarezas, ${facets.types.length} tipos, ${facets.illustrators.length} ilustradores, ${facets.generations.length} generaciones.`);

  // --- escribir a disco (regenerando todo desde cero) ---
  writeIndexGroup(path.join(INDICES_DIR, 'by-pokemon'), byPokemon);
  writeIndexGroup(path.join(INDICES_DIR, 'by-illustrator'), byIllustrator);
  writeIndexGroup(path.join(INDICES_DIR, 'by-generation'), byGeneration);

  const searchDir = path.join(INDICES_DIR, 'search');
  fs.rmSync(searchDir, { recursive: true, force: true });
  ensureDir(searchDir);
  for (const [bucket, cards] of bySearchBucket) {
    cards.sort((a, b) => a.name.localeCompare(b.name));
    fs.writeFileSync(
      path.join(searchDir, `${bucket}.json`),
      JSON.stringify({ totalCards: cards.length, cards }, null, 2)
    );
  }
  log(`search/: ${bySearchBucket.size} chunks alfabéticos.`);

  log(`by-pokemon/: ${byPokemon.size} nombres distintos.`);
  log(`by-illustrator/: ${byIllustrator.size} ilustradores distintos.`);
  log(`by-generation/: ${byGeneration.size} series distintas.`);
  log('Listo. Índices regenerados en data/indices/.');
}

/** Escribe un grupo de índices tipo Map(slug -> {name, cards}) como archivos individuales */
function writeIndexGroup(dir, map) {
  fs.rmSync(dir, { recursive: true, force: true });
  ensureDir(dir);
  for (const [slug, entry] of map) {
    entry.cards.sort((a, b) => (a.set + a.number).localeCompare(b.set + b.number));
    fs.writeFileSync(
      path.join(dir, `${slug}.json`),
      JSON.stringify({ name: entry.name, totalCards: entry.cards.length, cards: entry.cards }, null, 2)
    );
  }
}

main();
