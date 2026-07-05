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
let currentPageCardsBySlot = {}; // slotIndex -> carta ya resuelta, para el click de "ver más grande"

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

async function renderBinderPage() {
  currentBinderData = getBinderPages(currentBinderEntry.id); // re-leer por si buscador escribió
  const { cols, rows } = currentBinderEntry.grid;
  const page = currentBinderData.pages[currentPageIndex];

  const pageEl = document.getElementById('binder-page');
  pageEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  const isTransparentFolio = currentBinderEntry.folioColor === 'transparente';
  const folioHex = resolveSwatchHex(currentBinderEntry.folioColor);

  // 1) pintamos ya mismo el esqueleto (vacíos + "cargando" para los que tienen carta)
  pageEl.innerHTML = page.slots.map((cardId, slotIndex) => {
    const bg = isTransparentFolio ? '' : `background:${folioHex};`;
    return `
      <div class="binder-slot ${isTransparentFolio ? 'is-transparent-folio' : ''}" style="${bg}"
        id="slot-${slotIndex}" role="button" tabindex="0"
        aria-label="${cardId ? 'Cargando carta…' : 'Slot vacío'}">
        ${cardId ? '<div class="binder-slot-loading"></div>' : '<div class="binder-slot-empty"></div>'}
      </div>`;
  }).join('');

  currentPageCardsBySlot = {};

  page.slots.forEach((cardId, slotIndex) => {
    const el = document.getElementById(`slot-${slotIndex}`);
    const handler = () => {
      const pendingSlot = { binderId: currentBinderEntry.id, pageNumber: page.pageNumber, slotIndex };
      if (cardId) {
        const card = currentPageCardsBySlot[slotIndex];
        if (card) openCardDetail(card, { mode: 'binder', pendingSlot });
      } else {
        openBuscador(pendingSlot);
      }
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
  });

  // progreso: sin sourceFilter todavía, mostramos solo cantidad de slots llenos
  const filled = countFilledSlots(currentBinderData);
  const total = cols * rows * currentBinderData.pages.length;
  document.getElementById('binder-progress-label').textContent = `${filled} / ${total} cartas`;

  document.getElementById('binder-page-indicator').textContent =
    `Página ${currentPageIndex + 1} de ${currentBinderData.pages.length}`;
  document.getElementById('binder-prev-btn').disabled = currentPageIndex === 0;
  document.getElementById('binder-next-btn').disabled = currentPageIndex === currentBinderData.pages.length - 1;

  // 2) resolvemos las cartas reales (agrupando por set para no pedir el mismo archivo dos veces)
  const renderToken = (currentBinderData.__renderToken = Symbol());
  const pendingSlots = page.slots
    .map((cardId, slotIndex) => ({ cardId, slotIndex }))
    .filter((s) => s.cardId);

  await Promise.all(pendingSlots.map(async ({ cardId, slotIndex }) => {
    try {
      const card = await resolveCard(cardId);
      if (currentBinderData.__renderToken !== renderToken) return; // el usuario ya cambió de página
      const el = document.getElementById(`slot-${slotIndex}`);
      if (el && card) {
        el.innerHTML = renderCardFaceSVG(card, { compact: true });
        el.setAttribute('aria-label', card.name);
        currentPageCardsBySlot[slotIndex] = card;
      }
    } catch (err) {
      console.error(`No se pudo cargar la carta ${cardId}:`, err);
    }
  }));
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
