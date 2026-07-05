/**
 * card-detail.js
 * -----------------------------------------------------------------------
 * Vista grande de una carta puntual, en un modal aparte que se apila
 * arriba del Buscador o de la Vista del binder.
 *
 * Dos modos:
 *   - 'buscador': el usuario está eligiendo una carta para un slot vacío.
 *                 Muestra el botón "Usar esta carta".
 *   - 'binder':   el usuario tocó una carta ya puesta en un slot.
 *                 Muestra "Cambiar carta" y "Quitar del slot".
 */

let cardDetailContext = null; // { card, mode, pendingSlot }

function openCardDetail(card, { mode, pendingSlot }) {
  cardDetailContext = { card, mode, pendingSlot };
  renderCardDetail();
  document.getElementById('card-detail-modal').hidden = false;
}

function closeCardDetail() {
  document.getElementById('card-detail-modal').hidden = true;
  cardDetailContext = null;
}

function detailSetName(card) {
  return card.setName || (card.set && card.set.name) || '';
}

function detailNumber(card) {
  return card.number ?? card.localId ?? '';
}

function renderCardDetail() {
  const { card, mode } = cardDetailContext;

  document.getElementById('card-detail-name').textContent = card.name;
  const setName = detailSetName(card);
  document.getElementById('card-detail-setline').textContent = setName ? `${setName} · #${detailNumber(card)}` : '';
  document.getElementById('card-detail-image').innerHTML = renderCardFaceSVG(card, { compact: true, quality: 'high' });

  const primaryTypeName = card.types && card.types[0];
  let typeChip = '—';
  if (primaryTypeName) {
    const palette = typePalette(primaryTypeName.toLowerCase());
    typeChip = `<span class="type-pill" style="background:${palette.fill};color:${palette.border};border-color:${palette.border};">${escapeHTML(primaryTypeName)}</span>`;
  }

  document.getElementById('card-detail-facts').innerHTML = `
    <dt>Número</dt><dd>#${escapeHTML(String(detailNumber(card)))}</dd>
    <dt>Tipo</dt><dd>${typeChip}</dd>
    <dt>Rareza</dt><dd>${escapeHTML(card.rarity || '—')}</dd>
    <dt>Ilustrador</dt><dd>${escapeHTML(card.illustrator || '—')}</dd>
    <dt>Set</dt><dd>${escapeHTML(setName || '—')}</dd>
  `;

  const actions = document.getElementById('card-detail-actions');

  if (mode === 'buscador') {
    actions.innerHTML = `
      <button class="btn btn-primary" id="card-detail-use-btn" type="button">Usar esta carta</button>
      <button class="btn btn-ghost" id="card-detail-back-btn" type="button">‹ Seguir buscando</button>
    `;
    document.getElementById('card-detail-use-btn').addEventListener('click', () => {
      const { binderId, pageNumber, slotIndex } = cardDetailContext.pendingSlot;
      assignCardToSlot(binderId, pageNumber, slotIndex, card.id);
      closeCardDetail();
      closeBuscador();
      renderBinderPage();
    });
    document.getElementById('card-detail-back-btn').addEventListener('click', closeCardDetail);
    return;
  }

  if (mode === 'binder') {
    actions.innerHTML = `
      <button class="btn btn-ghost" id="card-detail-remove-btn" type="button">Quitar del slot</button>
      <button class="btn btn-primary" id="card-detail-change-btn" type="button">Cambiar carta</button>
    `;
    document.getElementById('card-detail-remove-btn').addEventListener('click', () => {
      const { binderId, pageNumber, slotIndex } = cardDetailContext.pendingSlot;
      clearSlot(binderId, pageNumber, slotIndex);
      closeCardDetail();
      renderBinderPage();
    });
    document.getElementById('card-detail-change-btn').addEventListener('click', () => {
      const pendingSlot = cardDetailContext.pendingSlot;
      closeCardDetail();
      openBuscador(pendingSlot);
    });
  }
}

function wireCardDetailGlobalEvents() {
  document.getElementById('card-detail-close-btn').addEventListener('click', closeCardDetail);
  document.getElementById('card-detail-modal').addEventListener('click', (e) => {
    if (e.target.id === 'card-detail-modal') closeCardDetail();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('card-detail-modal').hidden) closeCardDetail();
  });
}
