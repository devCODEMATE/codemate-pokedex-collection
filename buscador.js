/**
 * buscador.js
 * -----------------------------------------------------------------------
 * Fase 1: busca/filtra sobre MOCK_CARDS. En Fase 3 esto se reemplaza por
 * fetch a los índices reales (indices/search/*.json, indices/by-*.json)
 * pero la interfaz (input + chips + grilla clickeable) queda igual.
 */

let buscadorPendingSlot = null; // { binderId, pageNumber, slotIndex }
let buscadorFilters = { query: '', rarity: null, type: null, illustrator: null, year: null };

function openBuscador(pendingSlot) {
  buscadorPendingSlot = pendingSlot;
  buscadorFilters = { query: '', rarity: null, type: null, illustrator: null, year: null };
  document.getElementById('buscador-search-input').value = '';
  renderBuscadorChips();
  renderBuscadorResults();
  document.getElementById('buscador-modal').hidden = false;
  document.getElementById('buscador-search-input').focus();
}

function closeBuscador() {
  document.getElementById('buscador-modal').hidden = true;
  buscadorPendingSlot = null;
}

/** Devuelve el año de una carta a partir de su set (MOCK_SETS). En Fase 2 esto viene directo del índice real. */
function cardYear(card) {
  const set = MOCK_SETS[card.setId];
  return set ? set.releaseYear : null;
}

const BUSCADOR_FACETS = [
  { key: 'rarity', containerId: 'buscador-rarity-chips', getValue: (c) => c.rarity },
  { key: 'type', containerId: 'buscador-type-chips', getValue: (c) => c.type },
  { key: 'illustrator', containerId: 'buscador-illustrator-chips', getValue: (c) => c.illustrator },
  { key: 'year', containerId: 'buscador-year-chips', getValue: (c) => cardYear(c) },
];

function renderBuscadorChips() {
  BUSCADOR_FACETS.forEach((facet) => {
    const values = [...new Set(MOCK_CARDS.map(facet.getValue))].sort();
    const container = document.getElementById(facet.containerId);
    container.innerHTML = values.map((v) => `
      <button type="button" class="chip ${buscadorFilters[facet.key] === v ? 'selected' : ''}" data-value="${v}">${v}</button>
    `).join('');
    container.querySelectorAll('.chip').forEach((chip) => {
      chip.addEventListener('click', () => {
        const raw = chip.dataset.value;
        const value = facet.key === 'year' ? Number(raw) : raw;
        buscadorFilters[facet.key] = buscadorFilters[facet.key] === value ? null : value;
        renderBuscadorChips();
        renderBuscadorResults();
      });
    });
  });
}

function renderBuscadorResults() {
  const q = buscadorFilters.query.trim().toLowerCase();
  const results = MOCK_CARDS.filter((card) => {
    if (q && !card.name.toLowerCase().includes(q)) return false;
    if (buscadorFilters.rarity && card.rarity !== buscadorFilters.rarity) return false;
    if (buscadorFilters.type && card.type !== buscadorFilters.type) return false;
    if (buscadorFilters.illustrator && card.illustrator !== buscadorFilters.illustrator) return false;
    if (buscadorFilters.year && cardYear(card) !== buscadorFilters.year) return false;
    return true;
  });

  const container = document.getElementById('buscador-results');
  if (results.length === 0) {
    container.innerHTML = `<p class="buscador-empty">No encontramos cartas con esos filtros.</p>`;
    return;
  }

  container.innerHTML = results.map((card) => `
    <button type="button" class="buscador-result-btn" data-card-id="${card.id}" title="${escapeHTML(card.name)}">
      ${renderCardFaceSVG(card, { compact: true })}
    </button>
  `).join('');

  container.querySelectorAll('.buscador-result-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      if (!buscadorPendingSlot) return;
      const { binderId, pageNumber, slotIndex } = buscadorPendingSlot;
      assignCardToSlot(binderId, pageNumber, slotIndex, btn.dataset.cardId);
      closeBuscador();
      renderBinderPage();
    });
  });
}

function wireBuscadorGlobalEvents() {
  document.getElementById('buscador-close-btn').addEventListener('click', closeBuscador);
  document.getElementById('buscador-modal').addEventListener('click', (e) => {
    if (e.target.id === 'buscador-modal') closeBuscador();
  });
  document.getElementById('buscador-search-input').addEventListener('input', (e) => {
    buscadorFilters.query = e.target.value;
    renderBuscadorResults();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('buscador-modal').hidden) closeBuscador();
  });
}
