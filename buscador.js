/**
 * buscador.js
 * -----------------------------------------------------------------------
 * Decide, según lo que el usuario tocó, qué archivo puntual pedir del
 * idioma de cartas de la carpeta activa (buscadorLang, fijado al abrir):
 *
 *   - Elige un ilustrador  -> data/{lang}/indices/by-illustrator/{slug}.json
 *   - Elige una generación -> data/{lang}/indices/by-generation/{serieId}.json
 *   - Escribe un nombre    -> data/{lang}/indices/search/{bucket}.json
 *   - Elige solo Rareza/Tipo (sin nombre/ilustrador/generación) -> se
 *     recorren todos los chunks alfabéticos, porque Rareza/Tipo no tienen
 *     su propio índice separado.
 *
 * Si la búsqueda por nombre no encuentra nada en el primer chunk (porque
 * el nombre buscado no es la primera palabra de la carta, ej. "candy" en
 * "Rare Candy"), reintenta recorriendo todos los chunks antes de rendirse.
 */

let buscadorPendingSlot = null; // { binderId, pageNumber, slotIndex }
let buscadorLang = 'en'; // idioma de cartas de la carpeta activa, fijado en openBuscador
let buscadorFilters = { query: '', rarity: null, type: null, illustratorSlug: null, generationId: null };
let buscadorFacets = null;
let buscadorSets = null; // Map<setId, setMeta> — para poder filtrar por generación aunque el pool venga de otro lado
let buscadorRequestToken = 0;
let buscadorHasAutoCollapsed = false;

async function openBuscador(pendingSlot) {
  buscadorPendingSlot = pendingSlot;
  const binderEntry = getBindersIndex().find((b) => b.id === pendingSlot.binderId);
  buscadorLang = getBinderLanguage(binderEntry);

  buscadorFilters = { query: '', rarity: null, type: null, illustratorSlug: null, generationId: null };
  buscadorHasAutoCollapsed = false;
  document.getElementById('buscador-search-input').value = '';
  document.getElementById('buscador-modal').hidden = false;
  document.getElementById('buscador-search-input').focus();
  setBuscadorFiltersCollapsed(false);

  renderBuscadorPrompt(t('loadingFilters'));

  try {
    buscadorFacets = await loadFacets(buscadorLang);
    buscadorSets = await loadSets(buscadorLang);
  } catch (err) {
    console.error('No se pudieron cargar los filtros del buscador:', err);
    renderBuscadorPrompt(t('filtersLoadError'));
    return;
  }

  renderBuscadorFilterControls();
  renderBuscadorPrompt(t('startPrompt'));
}

function setBuscadorFiltersCollapsed(collapsed) {
  document.getElementById('buscador-filters-panel').classList.toggle('collapsed', collapsed);
  document.getElementById('buscador-filters-toggle-btn').setAttribute('aria-expanded', String(!collapsed));
  document.getElementById('buscador-filters-toggle-icon').textContent = collapsed ? '▾' : '▲';
}

function closeBuscador() {
  document.getElementById('buscador-modal').hidden = true;
  buscadorPendingSlot = null;
}

function renderBuscadorFilterControls() {
  document.getElementById('buscador-rarity-chips').innerHTML = buscadorFacets.rarities.map((r) => `
    <button type="button" class="chip ${buscadorFilters.rarity === r ? 'selected' : ''}" data-rarity="${escapeHTML(r)}">${escapeHTML(r)}</button>
  `).join('');
  document.getElementById('buscador-type-chips').innerHTML = buscadorFacets.types.map((t) => `
    <button type="button" class="chip ${buscadorFilters.type === t ? 'selected' : ''}" data-type="${escapeHTML(t)}">${escapeHTML(t)}</button>
  `).join('');

  document.querySelectorAll('#buscador-rarity-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      buscadorFilters.rarity = buscadorFilters.rarity === chip.dataset.rarity ? null : chip.dataset.rarity;
      renderBuscadorFilterControls();
      runBuscadorSearch();
    });
  });
  document.querySelectorAll('#buscador-type-chips .chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      buscadorFilters.type = buscadorFilters.type === chip.dataset.type ? null : chip.dataset.type;
      renderBuscadorFilterControls();
      runBuscadorSearch();
    });
  });

  const illustratorInput = document.getElementById('buscador-illustrator-input');
  const illustratorSlugField = document.getElementById('buscador-illustrator-slug');
  if (buscadorFilters.illustratorSlug) {
    const match = buscadorFacets.illustrators.find((i) => i.slug === buscadorFilters.illustratorSlug);
    illustratorInput.value = match ? match.name : '';
    illustratorSlugField.value = buscadorFilters.illustratorSlug;
  } else {
    illustratorInput.value = '';
    illustratorSlugField.value = '';
  }

  const generationSelect = document.getElementById('buscador-generation-select');
  generationSelect.innerHTML = `<option value="">${t('generationAllOption')}</option>` +
    buscadorFacets.generations.map((g) => `<option value="${g.id}">${escapeHTML(g.name)}</option>`).join('');
  generationSelect.value = buscadorFilters.generationId || '';
}

/** Combobox de ilustrador: filtra por cualquier parte del nombre, no solo el principio */
function renderIllustratorSuggestions(query) {
  const list = document.getElementById('buscador-illustrator-list');
  const qLower = query.trim().toLowerCase();

  const matches = qLower
    ? buscadorFacets.illustrators.filter((i) => i.name.toLowerCase().includes(qLower)).slice(0, 40)
    : buscadorFacets.illustrators.slice(0, 40);

  if (matches.length === 0) {
    list.innerHTML = `<div class="combo-empty">${t('noComboMatches')}</div>`;
  } else {
    list.innerHTML = matches.map((i) => `<button type="button" class="combo-option" data-slug="${i.slug}" data-name="${escapeHTML(i.name)}">${escapeHTML(i.name)}</button>`).join('');
  }
  list.hidden = false;

  list.querySelectorAll('.combo-option').forEach((opt) => {
    opt.addEventListener('mousedown', (e) => {
      e.preventDefault();
      document.getElementById('buscador-illustrator-input').value = opt.dataset.name;
      document.getElementById('buscador-illustrator-slug').value = opt.dataset.slug;
      buscadorFilters.illustratorSlug = opt.dataset.slug;
      list.hidden = true;
      runBuscadorSearch();
    });
  });
}

function clearBuscadorFilters() {
  buscadorFilters = { query: '', rarity: null, type: null, illustratorSlug: null, generationId: null };
  document.getElementById('buscador-search-input').value = '';
  renderBuscadorFilterControls();
  renderBuscadorPrompt(t('startPrompt'));
}

function wireBuscadorGlobalEvents() {
  document.getElementById('buscador-close-btn').addEventListener('click', closeBuscador);
  document.getElementById('buscador-modal').addEventListener('click', (e) => {
    if (e.target.id === 'buscador-modal') closeBuscador();
  });
  document.getElementById('buscador-search-input').addEventListener('input', (e) => {
    buscadorFilters.query = e.target.value;
    runBuscadorSearch();
  });
  document.getElementById('buscador-illustrator-input').addEventListener('focus', (e) => {
    renderIllustratorSuggestions(e.target.value);
  });
  document.getElementById('buscador-illustrator-input').addEventListener('input', (e) => {
    renderIllustratorSuggestions(e.target.value);
    if (e.target.value.trim() === '') {
      buscadorFilters.illustratorSlug = null;
      document.getElementById('buscador-illustrator-slug').value = '';
      runBuscadorSearch();
    }
  });
  document.getElementById('buscador-illustrator-input').addEventListener('blur', () => {
    const input = document.getElementById('buscador-illustrator-input');
    const slugField = document.getElementById('buscador-illustrator-slug');
    if (!slugField.value || input.value.trim() === '') {
      input.value = '';
      buscadorFilters.illustratorSlug = null;
    }
    document.getElementById('buscador-illustrator-list').hidden = true;
  });
  document.getElementById('buscador-generation-select').addEventListener('change', (e) => {
    buscadorFilters.generationId = e.target.value || null;
    runBuscadorSearch();
  });
  document.getElementById('buscador-filters-toggle-btn').addEventListener('click', () => {
    const panel = document.getElementById('buscador-filters-panel');
    setBuscadorFiltersCollapsed(!panel.classList.contains('collapsed'));
  });
  document.getElementById('buscador-clear-filters-btn').addEventListener('click', clearBuscadorFilters);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('buscador-modal').hidden) closeBuscador();
  });
}

function renderBuscadorPrompt(message) {
  document.getElementById('buscador-results').innerHTML = `<p class="buscador-empty">${escapeHTML(message)}</p>`;
}

/** Decide de dónde traer el "pool" base de cartas según lo que el usuario tocó, y filtra en memoria */
async function runBuscadorSearch() {
  const token = ++buscadorRequestToken;
  const q = buscadorFilters.query.trim();
  const hasRarityOrType = Boolean(buscadorFilters.rarity || buscadorFilters.type);
  let searchedAllBuckets = false;

  let pool = null;
  try {
    if (buscadorFilters.illustratorSlug) {
      renderBuscadorPrompt(t('loadingIllustratorCards'));
      const data = await loadByIllustrator(buscadorFilters.illustratorSlug, buscadorLang);
      pool = data.cards;
    } else if (buscadorFilters.generationId) {
      renderBuscadorPrompt(t('loadingGenerationCards'));
      const data = await loadByGeneration(buscadorFilters.generationId, buscadorLang);
      pool = data.cards;
    } else if (q.length >= 1) {
      if (looksLikeNumberQuery(q)) {
        renderBuscadorPrompt(t('searchingByNumber'));
        const data = await loadAllSearchBuckets(buscadorLang);
        pool = data.cards;
        searchedAllBuckets = true;
      } else {
        renderBuscadorPrompt(t('searching'));
        const bucket = searchBucketFor(q);
        const data = await loadSearchBucket(bucket, buscadorLang);
        pool = data.cards;
      }
    } else if (hasRarityOrType) {
      // Solo se tocó Rareza y/o Tipo, sin nombre/ilustrador/generación:
      // no hay un índice propio para esto, así que recorremos todo.
      renderBuscadorPrompt(t('searching'));
      const data = await loadAllSearchBuckets(buscadorLang);
      pool = data.cards;
      searchedAllBuckets = true;
    } else {
      renderBuscadorPrompt(t('startPrompt'));
      return;
    }
  } catch (err) {
    if (token !== buscadorRequestToken) return;
    console.error('No se pudo cargar el resultado de la búsqueda:', err);
    renderBuscadorPrompt(t('searchLoadError'));
    return;
  }

  if (token !== buscadorRequestToken) return; // el usuario ya cambió el filtro, este resultado quedó viejo

  const qParts = q.toLowerCase().replace(/^#/, '').split('/');
  const qLower = qParts[0].trim();
  const qSetTotal = qParts[1] ? qParts[1].trim() : null;

  const matchesQuery = (card) => {
    if (qLower) {
      const matchesName = slugify(card.name).includes(slugify(qLower));
      const matchesNumber = String(card.number ?? '').toLowerCase() === qLower;
      if (!matchesName && !matchesNumber) return false;
    }
    if (qSetTotal && buscadorSets) {
      const setMeta = buscadorSets.get(card.set);
      const officialTotal = setMeta && setMeta.cardCount
        ? String(setMeta.cardCount.official ?? setMeta.cardCount.total ?? '')
        : '';
      if (officialTotal !== qSetTotal) return false;
    }
    if (buscadorFilters.rarity && card.rarity !== buscadorFilters.rarity) return false;
    if (buscadorFilters.type && !(card.types || []).includes(buscadorFilters.type)) return false;
    if (buscadorFilters.generationId && buscadorFilters.illustratorSlug) {
      const setMeta = buscadorSets.get(card.set);
      if (!setMeta || !setMeta.serie || setMeta.serie.id !== buscadorFilters.generationId) return false;
    }
    return true;
  };

  let filtered = pool.filter(matchesQuery);

  // Reintento ampliado: si buscamos por nombre en un solo chunk alfabético
  // y no encontramos nada, puede ser que el nombre buscado no sea la
  // primera palabra de la carta (ej. "candy" en "Rare Candy") — probamos
  // de nuevo mirando todos los chunks antes de rendirnos.
  if (filtered.length === 0 && qLower && !searchedAllBuckets && !buscadorFilters.illustratorSlug && !buscadorFilters.generationId) {
    try {
      const allData = await loadAllSearchBuckets(buscadorLang);
      if (token !== buscadorRequestToken) return;
      filtered = allData.cards.filter(matchesQuery);
    } catch (err) {
      console.error('No se pudo completar la búsqueda ampliada:', err);
    }
  }

  const activeFilterCount = [qLower, buscadorFilters.rarity, buscadorFilters.type, buscadorFilters.illustratorSlug, buscadorFilters.generationId]
    .filter(Boolean).length;
  renderBuscadorResults(filtered, activeFilterCount);
}

const BUSCADOR_BATCH_SIZE = 60;
let buscadorFullResults = [];
let buscadorShownCount = 0;

function renderBuscadorResults(results, activeFilterCount = 0) {
  buscadorFullResults = results;
  buscadorShownCount = 0;

  if (results.length > 0 && !buscadorHasAutoCollapsed) {
    setBuscadorFiltersCollapsed(true);
    buscadorHasAutoCollapsed = true;
  }

  const container = document.getElementById('buscador-results');
  if (results.length === 0) {
    const hint = activeFilterCount > 1 ? t('tryRemovingFilter') : '';
    container.innerHTML = `<p class="buscador-empty">${t('noMatches')}${hint}</p>`;
    return;
  }

  renderBuscadorResultsBatch();
}

function renderBuscadorResultsBatch() {
  const container = document.getElementById('buscador-results');
  buscadorShownCount = Math.min(buscadorShownCount + BUSCADOR_BATCH_SIZE, buscadorFullResults.length);
  const toShow = buscadorFullResults.slice(0, buscadorShownCount);

  container.innerHTML = `<div class="buscador-results-grid">${toShow.map((card) => `
    <button type="button" class="buscador-result-btn" data-card-id="${card.id}" title="${escapeHTML(card.name)} · ${escapeHTML(card.setName || '')}">
      ${renderCardFaceSVG(card, { compact: true })}
    </button>
  `).join('')}</div>`;

  if (buscadorShownCount < buscadorFullResults.length) {
    container.innerHTML += `
      <button type="button" class="load-more-btn" id="buscador-load-more-btn">
        ${t('loadMoreBtn', { shown: buscadorShownCount, total: buscadorFullResults.length })}
      </button>`;
    document.getElementById('buscador-load-more-btn').addEventListener('click', renderBuscadorResultsBatch);
  }

  container.querySelectorAll('.buscador-result-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = buscadorFullResults.find((c) => c.id === btn.dataset.cardId);
      if (!card || !buscadorPendingSlot) return;
      openCardDetail(card, { mode: 'buscador', pendingSlot: buscadorPendingSlot });
    });
  });
}