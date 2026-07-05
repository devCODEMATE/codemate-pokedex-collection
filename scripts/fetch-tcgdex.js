#!/usr/bin/env node
/**
 * scripts/fetch-tcgdex.js
 * -----------------------------------------------------------------------
 * Fase 2 — Paso 1: trae el catálogo real de TCGdex (api.tcgdex.net) y lo
 * guarda en /data, con la misma forma pensada en el plan original:
 *
 *   data/sets.json
 *   data/metadata/last-updated.json
 *   data/cards/by-set/{setId}.json   (cartas completas de ese set)
 *
 * Es RESUMIBLE: si un set ya tiene su archivo en data/cards/by-set, no lo
 * vuelve a descargar (a menos que uses --force). Así, si se corta a mitad
 * de camino, correrlo de nuevo retoma donde quedó.
 *
 * Uso:
 *   node scripts/fetch-tcgdex.js                    -> TODO el catálogo (tarda horas)
 *   node scripts/fetch-tcgdex.js --sets=base1        -> solo un set, para probar
 *   node scripts/fetch-tcgdex.js --sets=base1,jungle -> varios sets puntuales
 *   node scripts/fetch-tcgdex.js --force             -> ignora la caché y re-descarga todo
 *
 * Requiere Node 18 o superior (usa fetch nativo, sin dependencias).
 */

const fs = require('fs');
const path = require('path');

const API = 'https://api.tcgdex.net/v2/en';
const DATA_DIR = path.join(__dirname, '..', 'data');
const CARDS_DIR = path.join(DATA_DIR, 'cards', 'by-set');
const CONCURRENCY = 8;

const args = process.argv.slice(2).reduce((acc, arg) => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  acc[key] = value ?? true;
  return acc;
}, {});

const onlySets = args.sets ? args.sets.split(',').map((s) => s.trim()) : null;
const force = Boolean(args.force);

function log(msg) {
  console.log(`[fetch-tcgdex] ${msg}`);
}

async function fetchJSON(url, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${url}`);
      return await res.json();
    } catch (err) {
      if (attempt === retries) throw err;
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
}

/**
 * Trae una carta con dos intentos:
 *   1) por su id combinado: /cards/{setId}-{localId}
 *   2) si falla, por set + número local por separado: /sets/{setId}/cards/{localId}
 * El segundo camino salva casos raros como el Unown "?" (id "exu-?"), donde el
 * signo de pregunta rompe el primer endpoint pero el path separado sí funciona.
 */
async function fetchCardResilient(brief, setId, failedList) {
  try {
    return await fetchJSON(`${API}/cards/${encodeURIComponent(brief.id)}`);
  } catch (firstErr) {
    try {
      const viaLocalId = await fetchJSON(
        `${API}/sets/${encodeURIComponent(setId)}/cards/${encodeURIComponent(brief.localId)}`
      );
      log(`  -> "${brief.id}" se recuperó por la vía set+localId (el id combinado falló).`);
      return viaLocalId;
    } catch (secondErr) {
      log(`  ATENCIÓN: no se pudo traer "${brief.id}" por ninguna vía (${secondErr.message}). La salteo y sigo.`);
      failedList.push({ label: brief.id, error: secondErr.message });
      return null;
    }
  }
}

/** Pool de concurrencia simple: procesa `items` con `worker`, `concurrency` a la vez */
async function runPool(items, worker, concurrency = CONCURRENCY) {
  const results = new Array(items.length);
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, runner));
  return results;
}

async function main() {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
  fs.mkdirSync(path.join(DATA_DIR, 'metadata'), { recursive: true });

  log('Trayendo lista de sets...');
  let sets = await fetchJSON(`${API}/sets`);
  log(`Total de sets disponibles en TCGdex: ${sets.length}`);

  if (onlySets) {
    sets = sets.filter((s) => onlySets.includes(s.id));
    log(`Filtro --sets aplicado: ${sets.length} set(s) a procesar (${sets.map((s) => s.id).join(', ')})`);
    const missing = onlySets.filter((id) => !sets.some((s) => s.id === id));
    if (missing.length) log(`  ATENCIÓN: no se encontraron estos IDs de set: ${missing.join(', ')}`);
  }

  const allSetsMeta = [];
  let totalCards = 0;
  let setsSkippedFromCache = 0;
  const failedCards = [];

  for (let i = 0; i < sets.length; i++) {
    const setBrief = sets[i];
    log(`Set ${i + 1}/${sets.length}: ${setBrief.id} (${setBrief.name})`);

    const outFile = path.join(CARDS_DIR, `${setBrief.id}.json`);

    if (!force && fs.existsSync(outFile)) {
      log('  -> ya está en caché, lo salteo (usá --force para re-descargar)');
      const cached = JSON.parse(fs.readFileSync(outFile, 'utf8'));
      totalCards += cached.length;
      setsSkippedFromCache += 1;
      // igual necesitamos su metadata para sets.json
      const setDetail = await fetchJSON(`${API}/sets/${setBrief.id}`);
      allSetsMeta.push(setMeta(setDetail));
      continue;
    }

    const setDetail = await fetchJSON(`${API}/sets/${setBrief.id}`);
    allSetsMeta.push(setMeta(setDetail));

    const briefs = setDetail.cards; // [{id, image, localId, name}]
    log(`  -> ${briefs.length} cartas, descargando detalle completo...`);

    let done = 0;
    const fullCards = await runPool(briefs, async (brief) => {
      const full = await fetchCardResilient(brief, setDetail.id, failedCards);
      done++;
      if (done % 20 === 0 || done === briefs.length) {
        process.stdout.write(`\r  -> ${done}/${briefs.length} cartas`);
      }
      // si falló por las dos vías, guardamos igual los datos mínimos que ya
      // teníamos (brief), marcada como incompleta, para no perder la carta del todo
      return full || { ...brief, incomplete: true };
    });
    process.stdout.write('\n');

    fs.writeFileSync(outFile, JSON.stringify(fullCards, null, 2));
    totalCards += fullCards.length;
    log(`  -> guardado en ${path.relative(process.cwd(), outFile)}`);
  }

  fs.writeFileSync(path.join(DATA_DIR, 'sets.json'), JSON.stringify(allSetsMeta, null, 2));
  fs.writeFileSync(
    path.join(DATA_DIR, 'metadata', 'last-updated.json'),
    JSON.stringify(
      { updatedAt: new Date().toISOString(), totalSets: allSetsMeta.length, totalCards },
      null,
      2
    )
  );
  fs.writeFileSync(
    path.join(DATA_DIR, 'metadata', 'failed-cards.json'),
    JSON.stringify(failedCards, null, 2)
  );

  log(`Listo. ${allSetsMeta.length} sets (${setsSkippedFromCache} ya estaban en caché), ${totalCards} cartas guardadas en /data.`);
  if (failedCards.length) {
    log(`ATENCIÓN: ${failedCards.length} carta(s) no se pudieron traer completas (quedaron con datos mínimos). Ver data/metadata/failed-cards.json.`);
  } else {
    log('Ninguna carta falló. Catálogo completo.');
  }
}

function setMeta(setDetail) {
  return {
    id: setDetail.id,
    name: setDetail.name,
    logo: setDetail.logo || null,
    symbol: setDetail.symbol || null,
    serie: setDetail.serie || null,
    releaseDate: setDetail.releaseDate || null,
    cardCount: setDetail.cardCount,
  };
}

main().catch((err) => {
  console.error('[fetch-tcgdex] ERROR:', err);
  process.exit(1);
});
