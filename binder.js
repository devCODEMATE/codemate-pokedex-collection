/**
 * binder.js
 * -----------------------------------------------------------------------
 * "Vista del binder": grilla dinámica según tamaño, folio tiñendo cada
 * slot, animación de vuelta de página (flip 3D), click en slot vacío para
 * abrir el Buscador, arrastrar-y-soltar para reordenar cartas, y una vista
 * de "una hoja" o "dos hojas enfrentadas" (como una carpeta física real,
 * con lomo en el medio) que la persona puede alternar.
 */

let currentBinderEntry = null;
let currentBinderData = null;
let currentPageIndex = 0; // 0-based; en modo "2 hojas" es el índice de la hoja IZQUIERDA
let currentPageCardsBySlot = {}; // "L-0" / "R-3" -> carta ya resuelta, para el click de "ver más grande"

const VIEW_MODE_KEY = 'codemate-binder-view-mode';

function getViewMode() {
  const saved = localStorage.getItem(VIEW_MODE_KEY);
  return saved === 'spread' ? 'spread' : 'single';
}

function setViewMode(mode) {
  localStorage.setItem(VIEW_MODE_KEY, mode);
}

function openBinder(binderId) {
  const index = getBindersIndex();
  currentBinderEntry = index.find((b) => b.id === binderId);
  if (!currentBinderEntry) return;
  currentBinderData = getBinderPages(binderId);
  currentPageIndex = 0;

  document.getElementById('binder-title').textContent = currentBinderEntry.name;
  const chip = document.getElementById('binder-cover-chip');
  chip.style.background = resolveSwatchHex(currentBinderEntry.coverColor);

  updateViewModeBtnLabel();
  goToView('binder');
  renderBinderPage();
}

function updateViewModeBtnLabel() {
  const btn = document.getElementById('binder-view-mode-btn');
  btn.textContent = getViewMode() === 'spread' ? t('viewModeOneBtn') : t('viewModeTwoBtn');
}

function toggleViewMode() {
  setViewMode(getViewMode() === 'spread' ? 'single' : 'spread');
  updateViewModeBtnLabel();
  renderBinderPage();
}

/** Intercambia el contenido de dos slots (puede ser dentro de la misma hoja o entre las dos hojas de un spread) */
function swapBinderSlots(pageNumberA, indexA, pageNumberB, indexB) {
  if (pageNumberA === pageNumberB && indexA === indexB) return;
  const data = getBinderPages(currentBinderEntry.id);
  const pageA = data.pages.find((p) => p.pageNumber === pageNumberA);
  const pageB = data.pages.find((p) => p.pageNumber === pageNumberB);
  const tmp = pageA.slots[indexA];
  pageA.slots[indexA] = pageB.slots[indexB];
  pageB.slots[indexB] = tmp;
  saveBinderPages(currentBinderEntry.id, data);
}

const DRAG_THRESHOLD = 8;

/**
 * Habilita arrastrar un slot que tiene carta, con Pointer Events (funciona
 * igual con mouse que con el dedo en celular). Un click normal sin moverse
 * sigue abriendo el detalle de la carta — solo se activa el arrastre si el
 * puntero se mueve más de DRAG_THRESHOLD píxeles antes de soltar.
 */
function wireSlotDragging(el, slotIndex, hasCard, pageNumber) {
  if (!hasCard) return;

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    const startX = e.clientX;
    const startY = e.clientY;
    let dragging = false;
    let ghost = null;

    const onMove = (moveEvent) => {
      const dx = moveEvent.clientX - startX;
      const dy = moveEvent.clientY - startY;

      if (!dragging && Math.hypot(dx, dy) > DRAG_THRESHOLD) {
        dragging = true;
        el.classList.add('slot-drag-source');
        ghost = el.cloneNode(true);
        ghost.classList.add('slot-drag-ghost');
        ghost.style.width = `${el.offsetWidth}px`;
        ghost.style.height = `${el.offsetHeight}px`;
        document.body.appendChild(ghost);
      }

      if (dragging && ghost) {
        ghost.style.left = `${moveEvent.clientX - el.offsetWidth / 2}px`;
        ghost.style.top = `${moveEvent.clientY - el.offsetHeight / 2}px`;
        document.querySelectorAll('.binder-slot.slot-drag-over').forEach((s) => s.classList.remove('slot-drag-over'));
        const under = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY);
        const targetSlot = under && under.closest('.binder-slot');
        if (targetSlot && targetSlot !== el) targetSlot.classList.add('slot-drag-over');
      }
    };

    const onUp = (upEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      if (!dragging) return;

      el.classList.remove('slot-drag-source');
      if (ghost) { ghost.remove(); ghost = null; }
      document.querySelectorAll('.binder-slot.slot-drag-over').forEach((s) => s.classList.remove('slot-drag-over'));

      const under = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const targetSlot = under && under.closest('.binder-slot');
      if (targetSlot) {
        const targetIndex = Number(targetSlot.dataset.slotIndex);
        const targetPageNumber = Number(targetSlot.dataset.pageNumber);
        if (!Number.isNaN(targetIndex) && !Number.isNaN(targetPageNumber)) {
          swapBinderSlots(pageNumber, slotIndex, targetPageNumber, targetIndex);
          renderBinderPage();
        }
      }

      el.dataset.suppressClick = 'true';
      setTimeout(() => { delete el.dataset.suppressClick; }, 0);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
}

/**
 * Dibuja una hoja puntual dentro del elemento grid dado. No usa ids
 * globales para los slots (para poder tener dos hojas en pantalla a la vez
 * sin que sus ids choquen) — todo se resuelve con querySelectorAll
 * acotado al propio `gridEl`.
 */
async function renderPageIntoGrid(gridEl, page, cols) {
  gridEl.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
  const isTransparentFolio = currentBinderEntry.folioColor === 'transparente';
  const folioHex = resolveSwatchHex(currentBinderEntry.folioColor);

  gridEl.innerHTML = page.slots.map((cardId, slotIndex) => {
    const bg = isTransparentFolio ? '' : `background:${folioHex};`;
    return `
      <div class="binder-slot ${isTransparentFolio ? 'is-transparent-folio' : ''}" style="${bg}"
        data-slot-index="${slotIndex}" data-page-number="${page.pageNumber}" role="button" tabindex="0"
        aria-label="${cardId ? t('loadingCardAria') : t('emptySlotAria')}">
        ${cardId ? '<div class="binder-slot-loading"></div>' : '<div class="binder-slot-empty"></div>'}
      </div>`;
  }).join('');

  const slotEls = gridEl.querySelectorAll('.binder-slot');
  page.slots.forEach((cardId, slotIndex) => {
    const el = slotEls[slotIndex];
    const handler = () => {
      if (el.dataset.suppressClick) return;
      const pendingSlot = { binderId: currentBinderEntry.id, pageNumber: page.pageNumber, slotIndex };
      if (cardId) {
        const card = currentPageCardsBySlot[`${page.pageNumber}-${slotIndex}`];
        if (card) openCardDetail(card, { mode: 'binder', pendingSlot });
      } else {
        openBuscador(pendingSlot);
      }
    };
    el.addEventListener('click', handler);
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handler(); } });
    wireSlotDragging(el, slotIndex, Boolean(cardId), page.pageNumber);
  });

  const renderToken = Symbol();
  gridEl.dataset.renderToken = renderToken.toString();
  const pendingSlots = page.slots
    .map((cardId, slotIndex) => ({ cardId, slotIndex }))
    .filter((s) => s.cardId);

  await Promise.all(pendingSlots.map(async ({ cardId, slotIndex }) => {
    try {
      const card = await resolveCard(cardId, getBinderLanguage(currentBinderEntry));
      if (gridEl.dataset.renderToken !== renderToken.toString()) return; // cambió de página mientras cargaba
      const el = slotEls[slotIndex];
      if (el && card) {
        el.innerHTML = renderCardFaceSVG(card, { compact: true });
        el.setAttribute('aria-label', card.name);
        currentPageCardsBySlot[`${page.pageNumber}-${slotIndex}`] = card;
      }
    } catch (err) {
      console.error(`No se pudo cargar la carta ${cardId}:`, err);
    }
  }));
}

async function renderBinderPage() {
  currentBinderData = getBinderPages(currentBinderEntry.id); // re-leer por si buscador escribió
  const { cols, rows } = currentBinderEntry.grid;
  const pages = currentBinderData.pages;
  const viewMode = getViewMode();

  currentPageCardsBySlot = {};

  const leftPage = pages[currentPageIndex];
  const rightPage = viewMode === 'spread' ? pages[currentPageIndex + 1] : null;

  document.getElementById('binder-shell').classList.toggle('is-spread', viewMode === 'spread' && Boolean(rightPage));
  document.getElementById('binder-spine').hidden = !(viewMode === 'spread' && rightPage);
  document.getElementById('binder-page-wrap-right').hidden = !(viewMode === 'spread' && rightPage);

  await renderPageIntoGrid(document.getElementById('binder-page-left'), leftPage, cols);
  if (viewMode === 'spread' && rightPage) {
    await renderPageIntoGrid(document.getElementById('binder-page-right'), rightPage, cols);
  }

  const filled = countFilledSlots(currentBinderData);
  const total = cols * rows * pages.length;
  document.getElementById('binder-progress-label').textContent = t('cardsProgress', { filled, total });

  const indicator = document.getElementById('binder-page-indicator');
  if (viewMode === 'spread' && rightPage) {
    indicator.textContent = t('pageIndicatorRange', { a: currentPageIndex + 1, b: currentPageIndex + 2, total: pages.length });
  } else {
    indicator.textContent = t('pageIndicator', { n: currentPageIndex + 1, total: pages.length });
  }

  const step = viewMode === 'spread' ? 2 : 1;
  document.getElementById('binder-prev-btn').disabled = currentPageIndex === 0;
  document.getElementById('binder-next-btn').disabled = currentPageIndex + step >= pages.length;
}

function flipBinderPage(direction) {
  const step = getViewMode() === 'spread' ? 2 : 1;
  const nextIndex = currentPageIndex + direction * step;
  if (nextIndex < 0 || nextIndex >= currentBinderData.pages.length) return;

  const wraps = [document.getElementById('binder-page-wrap-left'), document.getElementById('binder-page-wrap-right')];
  wraps.forEach((w) => w.classList.add(direction > 0 ? 'flipping-next' : 'flipping-prev'));
  setTimeout(() => {
    currentPageIndex = nextIndex;
    renderBinderPage();
    wraps.forEach((w) => w.classList.remove('flipping-next', 'flipping-prev'));
  }, 260);
}

function handleAddPage() {
  currentBinderData = addPageToBinder(currentBinderEntry);
  currentPageIndex = currentBinderData.pages.length - 1;
  if (getViewMode() === 'spread' && currentPageIndex % 2 === 1) currentPageIndex -= 1;
  renderBinderPage();
}