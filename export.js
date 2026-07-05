/**
 * export.js
 * -----------------------------------------------------------------------
 * Exporta una carpeta como un archivo .html standalone: portada + cada
 * hoja hojeable con el mismo flip 3D de la app, para que la persona se
 * lleve un "recuerdo" descargable de su colección.
 *
 * No requiere el resto de los archivos de la app para funcionar — todo el
 * CSS/JS necesario para hojearlo queda embebido en el propio archivo
 * exportado. Sí necesita internet para cargar las imágenes de las cartas
 * (viven en el CDN de TCGdex), así el archivo pesa poco.
 */

function slugifyFileName(str) {
  return String(str || 'carpeta')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'carpeta';
}

function showExportProgress() {
  document.getElementById('export-progress-modal').hidden = false;
  updateExportProgress(0, 0);
}

function updateExportProgress(done, total) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  document.getElementById('export-progress-fill').style.width = `${pct}%`;
  document.getElementById('export-progress-label').textContent = t('exportProgressLabel', { done, total });
}

function hideExportProgress() {
  document.getElementById('export-progress-modal').hidden = true;
}

function downloadTextFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function exportBinderHTML(binderEntry) {
  const lang = getBinderLanguage(binderEntry);
  const data = getBinderPages(binderEntry.id);

  const allCardIds = [];
  data.pages.forEach((page) => page.slots.forEach((id) => { if (id) allCardIds.push(id); }));

  if (allCardIds.length === 0) {
    alert(t('exportEmptyBinder'));
    return;
  }

  showExportProgress();

  // Agrupamos por set para pedir cada archivo una sola vez, sin importar
  // cuántas cartas de ese set haya en la carpeta.
  const bySet = new Map();
  allCardIds.forEach((id) => {
    const setId = id.slice(0, id.lastIndexOf('-'));
    if (!bySet.has(setId)) bySet.set(setId, []);
    bySet.get(setId).push(id);
  });

  const total = allCardIds.length;
  let done = 0;
  const cardById = new Map();
  const setIds = [...bySet.keys()];
  const CONCURRENCY = 4;
  let next = 0;

  async function worker() {
    while (next < setIds.length) {
      const setId = setIds[next++];
      try {
        const cards = await loadCardsBySet(setId, lang);
        bySet.get(setId).forEach((cardId) => {
          const card = cards.find((c) => c.id === cardId);
          if (card) cardById.set(cardId, card);
          done += 1;
          updateExportProgress(done, total);
        });
      } catch (err) {
        console.error('Export: no se pudo cargar el set', setId, err);
        bySet.get(setId).forEach(() => { done += 1; updateExportProgress(done, total); });
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, setIds.length) }, worker));

  const pagesForExport = data.pages.map((page) => page.slots.map((cardId) => {
    if (!cardId) return null;
    const card = cardById.get(cardId);
    if (!card || !card.image) return null;
    return { image: card.image, name: card.name };
  }));

  hideExportProgress();

  const html = buildStandaloneHTML(binderEntry, pagesForExport);
  downloadTextFile(`${slugifyFileName(binderEntry.name)}.html`, html, 'text/html');
}

/** Arma el documento HTML completo, standalone, con CSS y JS embebidos */
function buildStandaloneHTML(entry, pages) {
  const coverHex = resolveSwatchHex(entry.coverColor);
  const isTransparentFolio = entry.folioColor === 'transparente';
  const folioHex = resolveSwatchHex(entry.folioColor);
  const { cols, rows } = entry.grid;
  const shellWidth = cols * 100 + (cols - 1) * 8 + 40; // ancho fijo: cols de 100px + gaps de 8px + padding del shell

  const meta = {
    name: entry.name,
    coverHex,
    folioHex,
    isTransparentFolio,
    cols,
    rows,
    pageCount: pages.length,
    sizeLabel: sizeLabel(entry.size),
    cardLanguageLabel: cardLanguageLabel(getBinderLanguage(entry)),
    strings: {
      startBtn: t('exportStartBtn'),
      pageIndicator: t('pageIndicator', { n: '__N__', total: '__TOTAL__' }),
      emptySlotAlt: t('emptySlotAria'),
      prevAria: t('prevPageAria'),
      nextAria: t('nextPageAria'),
      backToCoverBtn: t('exportBackToCoverBtn'),
      credit: t('exportCredit'),
    },
  };

  return `<!DOCTYPE html>
<html lang="${getLanguage()}">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHTML(entry.name)} — CodeMate Pokédex Collection</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
<style>
  :root {
    --navy: #073b4c; --purple: #5a527a; --yellow: #ffd166; --teal: #6b9e93;
    --white: #ffffff; --black: #000000; --bg: #f4f2ee; --ink: #10222b; --ink-soft: #4a5a61; --line: #d9d4c9;
    --font-display: 'Space Mono', monospace; --font-body: 'DM Sans', sans-serif;
  }
  * { box-sizing: border-box; }
  html, body { margin:0; padding:0; background:var(--bg); color:var(--ink); font-family:var(--font-body); min-height:100vh; }
  .export-header { background:var(--navy); color:var(--white); padding:16px 24px; text-align:center; }
  .export-header h1 { font-family:var(--font-display); margin:0; font-size:22px; }
  .export-header p { margin:4px 0 0; font-size:12px; color:var(--yellow); text-transform:uppercase; letter-spacing:0.06em; }
  .export-stage { display:flex; flex-direction:column; align-items:center; padding:32px 16px 60px; }
  .cover-card { width:240px; aspect-ratio:63/88; border-radius:12px; position:relative; overflow:hidden;
    box-shadow:0 20px 40px rgba(0,0,0,0.35); background:${coverHex}; margin-bottom:24px; }
  .cover-card::before { content:''; position:absolute; inset:0;
    background:linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 35%, rgba(0,0,0,0.18) 100%); }
  .cover-card::after { content:''; position:absolute; top:0; bottom:0; right:16%; width:9%; background:rgba(0,0,0,0.3); }
  .export-title { font-family:var(--font-display); color:var(--navy); font-size:26px; margin:0 0 6px; text-align:center; }
  .export-subtitle { color:var(--ink-soft); font-size:13px; margin:0 0 24px; text-align:center; }
  .btn { border:none; border-radius:999px; padding:12px 26px; font-weight:700; font-size:14px; cursor:pointer; background:var(--teal); color:var(--white); }
  .btn:hover { background:#7bb2a6; }
  .btn:disabled { opacity:0.35; cursor:not-allowed; }
  .binder-stage { perspective:2400px; display:flex; justify-content:center; }
  .binder-shell { background:var(--black); border-radius:14px; padding:20px; width:${shellWidth}px; max-width:92vw;
    box-shadow:0 20px 40px rgba(0,0,0,0.35); }
  .binder-page-wrap { transform-style:preserve-3d; transition:transform 0.5s cubic-bezier(.45,.05,.55,.95); transform-origin:left center; }
  .binder-page-wrap.flipping-next { transform:rotateY(-14deg); }
  .binder-page-wrap.flipping-prev { transform:rotateY(14deg); }
  .binder-page { display:grid; gap:8px; background:var(--black); grid-template-columns:repeat(${cols}, 100px); }
  .binder-slot { aspect-ratio:63/88; border-radius:6px; display:flex; align-items:center; justify-content:center; padding:3%; }
  .binder-slot img { width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 3px 6px rgba(0,0,0,0.4)); border-radius:4px; }
  .binder-slot-empty { width:60%; height:60%; border:1.5px dashed rgba(255,255,255,0.25); border-radius:6px; }
  .binder-pager { display:flex; align-items:center; justify-content:center; gap:20px; margin-top:20px; }
  .page-corner-btn { background:var(--purple); color:var(--white); border:none; border-radius:8px; width:42px; height:42px; font-size:16px; font-weight:700; cursor:pointer; }
  .page-corner-btn:disabled { opacity:0.3; cursor:not-allowed; }
  .page-corner-btn:not(:disabled):hover { background:var(--teal); }
  .page-indicator { font-family:var(--font-display); font-size:12px; color:var(--ink-soft); }
  .back-to-cover-btn { margin-top:26px; background:none; border:1.5px solid var(--line); color:var(--ink-soft);
    border-radius:999px; padding:8px 18px; font-size:12.5px; cursor:pointer; }
  .back-to-cover-btn:hover { border-color:var(--teal); color:var(--navy); }
  .export-credit { margin-top:40px; font-size:11px; color:var(--ink-soft); text-align:center; line-height:1.5; }
  .export-credit strong { color:var(--navy); }
  [hidden] { display:none !important; }
</style>
</head>
<body>

<div class="export-header">
  <h1>&lt;CodeMate&gt;</h1>
  <p>Pokédex Collection</p>
</div>

<div class="export-stage">

  <div id="cover-view">
    <div class="cover-card"></div>
    <h2 class="export-title">${escapeHTML(entry.name)}</h2>
    <p class="export-subtitle">${escapeHTML(meta.sizeLabel)} · ${escapeHTML(meta.cardLanguageLabel)}</p>
    <button class="btn" id="start-btn">${escapeHTML(meta.strings.startBtn)}</button>
  </div>

  <div id="binder-view" hidden>
    <div class="binder-stage">
      <div class="binder-shell">
        <div class="binder-page-wrap" id="page-wrap">
          <div class="binder-page" id="page-grid"></div>
        </div>
      </div>
    </div>
    <div class="binder-pager">
      <button class="page-corner-btn" id="prev-btn">‹</button>
      <span class="page-indicator" id="page-indicator"></span>
      <button class="page-corner-btn" id="next-btn">›</button>
    </div>
    <div style="text-align:center;">
      <button class="back-to-cover-btn" id="back-to-cover-btn">${escapeHTML(meta.strings.backToCoverBtn)}</button>
    </div>
  </div>

  <p class="export-credit">${meta.strings.credit}</p>

</div>

<script>
  const PAGES = ${JSON.stringify(pages)};
  const META = ${JSON.stringify(meta)};
  let currentPage = 0;

  function renderPage() {
    const grid = document.getElementById('page-grid');
    const slots = PAGES[currentPage];
    grid.innerHTML = slots.map((card) => {
      const bg = META.isTransparentFolio ? '' : \`background:\${META.folioHex};\`;
      if (!card) {
        return \`<div class="binder-slot" style="\${bg}"><div class="binder-slot-empty"></div></div>\`;
      }
      return \`<div class="binder-slot" style="\${bg}"><img src="\${card.image}/high.webp" alt="\${card.name.replace(/"/g, '&quot;')}" loading="lazy" /></div>\`;
    }).join('');

    document.getElementById('page-indicator').textContent =
      META.strings.pageIndicator.replace('__N__', currentPage + 1).replace('__TOTAL__', META.pageCount);
    document.getElementById('prev-btn').disabled = currentPage === 0;
    document.getElementById('next-btn').disabled = currentPage === META.pageCount - 1;
  }

  function flip(direction) {
    const next = currentPage + direction;
    if (next < 0 || next >= META.pageCount) return;
    const wrap = document.getElementById('page-wrap');
    wrap.classList.add(direction > 0 ? 'flipping-next' : 'flipping-prev');
    setTimeout(() => {
      currentPage = next;
      renderPage();
      wrap.classList.remove('flipping-next', 'flipping-prev');
    }, 240);
  }

  document.getElementById('start-btn').addEventListener('click', () => {
    document.getElementById('cover-view').hidden = true;
    document.getElementById('binder-view').hidden = false;
    currentPage = 0;
    renderPage();
  });
  document.getElementById('back-to-cover-btn').addEventListener('click', () => {
    document.getElementById('binder-view').hidden = true;
    document.getElementById('cover-view').hidden = false;
  });
  document.getElementById('prev-btn').addEventListener('click', () => flip(-1));
  document.getElementById('next-btn').addEventListener('click', () => flip(1));
  document.addEventListener('keydown', (e) => {
    if (document.getElementById('binder-view').hidden) return;
    if (e.key === 'ArrowLeft') flip(-1);
    if (e.key === 'ArrowRight') flip(1);
  });
</script>
</body>
</html>`;
}