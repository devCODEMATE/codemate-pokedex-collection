/**
 * binder.js
 * -----------------------------------------------------------------------
 * "Vista del binder": grilla dinámica según tamaño, folio tiñendo cada
 * slot, animación de vuelta de página (flip 3D), y click en slot vacío
 * para abrir el Buscador.
 */

let currentBinderEntry = null;
let currentBinderData = null;
let currentPageIndex = 0; // 0-based

function openBinder(binderId) {
  const index = getBindersIndex();
  currentBinderEntry = index.find((b) => b.id === binderId);
  if (!currentBinderEntry) return;
  currentBinderData = getBinderPages(binderId);
  currentPageIndex = 0;

  document.getElementById('binder-title').textContent = currentBinderEntry.name;
  const chip = document.getElementById('binder-cover-chip');
  chip.style.background = resolveSwatchHex(currentBinderEntry.coverColor);

  goToView('binder');
  renderBinderPage();
}

function renderBinderPage() {
  currentBinderData = getBinderPages(currentBinderEntry.id); // re-leer por si buscador escribió
  const { cols, rows } = currentBinderEntry.grid;
  const page = currentBinderData.pages[currentPageIndex];

  const pageEl = document.getElementById('binder-page');
  pageEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  const isTransparentFolio = currentBinderEntry.folioColor === 'transparente';
  const folioHex = resolveSwatchHex(currentBinderEntry.folioColor);

  pageEl.innerHTML = page.slots.map((cardId, slotIndex) => {
    const card = cardId ? MOCK_CARDS_BY_ID[cardId] : null;
    const bg = isTransparentFolio ? '' : `background:${folioHex};`;
    return `
      <div class="binder-slot ${isTransparentFolio ? 'is-transparent-folio' : ''}" style="${bg}"
        id="slot-${slotIndex}" role="button" tabindex="0"
        aria-label="${card ? escapeHTML(card.name) : 'Slot vacío'}">
        ${card ? renderCardFaceSVG(card, { compact: true }) : '<div class="binder-slot-empty"></div>'}
      </div>`;
  }).join('');

  page.slots.forEach((cardId, slotIndex) => {
    const el = document.getElementById(`slot-${slotIndex}`);
    const handler = () => openBuscador({ binderId: currentBinderEntry.id, pageNumber: page.pageNumber, slotIndex });
    el.addEventListener('click', handler);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });

  // progreso: sin sourceFilter en Fase 1, mostramos solo cantidad de slots llenos
  const filled = countFilledSlots(currentBinderData);
  const total = cols * rows * currentBinderData.pages.length;
  document.getElementById('binder-progress-label').textContent = `${filled} / ${total} cartas`;

  document.getElementById('binder-page-indicator').textContent =
    `Página ${currentPageIndex + 1} de ${currentBinderData.pages.length}`;
  document.getElementById('binder-prev-btn').disabled = currentPageIndex === 0;
  document.getElementById('binder-next-btn').disabled = currentPageIndex === currentBinderData.pages.length - 1;
}

function flipBinderPage(direction) {
  const wrap = document.getElementById('binder-page-wrap');
  const nextIndex = currentPageIndex + direction;
  if (nextIndex < 0 || nextIndex >= currentBinderData.pages.length) return;

  wrap.classList.add(direction > 0 ? 'flipping-next' : 'flipping-prev');
  setTimeout(() => {
    currentPageIndex = nextIndex;
    renderBinderPage();
    wrap.classList.remove('flipping-next', 'flipping-prev');
  }, 260);
}

function handleAddPage() {
  currentBinderData = addPageToBinder(currentBinderEntry);
  currentPageIndex = currentBinderData.pages.length - 1;
  renderBinderPage();
}
