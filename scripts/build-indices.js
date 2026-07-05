#!/usr/bin/env node
/**
 * scripts/build-indices.js
 * -----------------------------------------------------------------------
 * Lee todo lo que bajó fetch-tcgdex.js para UN idioma (data/{lang}/cards/by-set/*.json
 * + data/{lang}/sets.json) y arma los índices livianos que consume el front-end,
 * dentro de esa misma carpeta de idioma:
 *
 *   data/{lang}/indices/by-pokemon/{slug}.json
 *   data/{lang}/indices/by-illustrator/{slug}.json
 *   data/{lang}/indices/by-generation/{serieId}.json
 *   data/{lang}/indices/search/{bucket}.json
 *   data/{lang}/indices/facets.json
 *
 * Regenera TODO desde cero cada vez que corre — nunca edites estos archivos
 * a mano.
 *
 * Uso:
 *   node scripts/build-indices.js              -> inglés
 *   node scripts/build-indices.js --lang=es     -> español
 */

const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value ?? true;
  return acc;
}, {});

const LANG = args.lang || 'en';
const DATA_DIR = path.join(__dirname, '..', 'data', LANG);
const BY_SET_DIR = path.join(DATA_DIR, 'cards', 'by-set');
const INDICES_DIR = path.join(DATA_DIR, 'indices');

function log(msg) {
  console.log(`[build-indices:${LANG}] ${msg}`);
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

function searchBucketFor(name) {
  const first = slugify(name).charAt(0);
  if (first >= 'a' && first <= 'e') return 'a-e';
  if (first >= 'f' && first <= 'j') return 'f-j';
  if (first >= 'k' && first <= 'o') return 'k-o';
  if (first >= 'p' && first <= 't') return 'p-t';
  if (first >= 'u' && first <= 'z') return 'u-z';
  return 'otros';
}

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
    console.error(`[build-indices:${LANG}] No existe ${BY_SET_DIR}. Corré primero scripts/fetch-tcgdex.js --lang=${LANG}.`);
    process.exit(1);
  }

  const setsMetaRaw = fs.readFileSync(path.join(DATA_DIR, 'sets.json'), 'utf8');
  const setsMeta = JSON.parse(setsMetaRaw);
  const setMetaById = setsMeta.reduce((acc, s) => {
    acc[s.id] = s;
    return acc;
  }, {});

  const setFiles = fs.readdirSync(BY_SET_DIR).filter((f) => f.endsWith('.json'));
  log(`Leyendo ${setFiles.length} archivos de data/${LANG}/cards/by-set...`);

  const byPokemon = new Map();
  const byIllustrator = new Map();
  const byGeneration = new Map();
  const bySearchBucket = new Map();
  ['a-e', 'f-j', 'k-o', 'p-t', 'u-z', 'otros'].forEach((b) => bySearchBucket.set(b, []));
  let totalCardsProcessed = 0;
  let cardsWithoutIllustrator = 0;
  const rarities = new Set();
  const types = new Set();
  const illustrators = new Map();
  const generations = new Map();

  for (const file of setFiles) {
    const setId = file.replace(/\.json$/, '');
    const setMeta = setMetaById[setId] || { id: setId, name: setId };
    const cards = JSON.parse(fs.readFileSync(path.join(BY_SET_DIR, file), 'utf8'));

    for (const card of cards) {
      const light = liftweightCard(card, setMeta);
      totalCardsProcessed += 1;

      if (light.rarity) rarities.add(light.rarity);
      if (light.types) light.types.forEach((t) => types.add(t));

      const nameSlug = slugify(card.name);
      if (!byPokemon.has(nameSlug)) byPokemon.set(nameSlug, { name: card.name, cards: [] });
      byPokemon.get(nameSlug).cards.push(light);

      if (card.illustrator) {
        const illSlug = slugify(card.illustrator);
        if (!byIllustrator.has(illSlug)) byIllustrator.set(illSlug, { name: card.illustrator, cards: [] });
        byIllustrator.get(illSlug).cards.push(light);
        illustrators.set(illSlug, card.illustrator);
      } else {
        cardsWithoutIllustrator += 1;
      }

      const serie = setMeta.serie || { id: 'sin-serie', name: 'Sin serie' };
      if (!byGeneration.has(serie.id)) byGeneration.set(serie.id, { name: serie.name, cards: [] });
      byGeneration.get(serie.id).cards.push(light);
      generations.set(serie.id, serie.name);

      const bucket = searchBucketFor(card.name);
      if (!bySearchBucket.has(bucket)) bySearchBucket.set(bucket, []);
      bySearchBucket.get(bucket).push(light);
    }
  }

  log(`Procesadas ${totalCardsProcessed} cartas de ${setFiles.length} sets.`);
  if (cardsWithoutIllustrator) {
    log(`(${cardsWithoutIllustrator} cartas sin ilustrador registrado en TCGdex.)`);
  }

  ensureDir(INDICES_DIR);

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
  log(`Listo. Índices regenerados en data/${LANG}/indices/.`);
}

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