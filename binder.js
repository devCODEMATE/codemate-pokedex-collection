/**
 * binder.js
 * -----------------------------------------------------------------------
 * "Vista del binder": grilla dinámica según tamaño, folio tiñendo cada
 * slot, animación de vuelta de página (flip 3D), click en slot vacío para
 * abrir el Buscador, y arrastrar-y-soltar (con Pointer Events, funciona
 * igual con mouse que con el dedo en celular) para reordenar cartas dentro
 * de la misma hoja.
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

/** Intercambia el contenido de dos slots de una misma hoja (funciona aunque uno esté vacío) */
function swapBinderSlots(pageNumber, indexA, indexB) {
  if (indexA === indexB) return;
  const data = getBinderPages(currentBinderEntry.id);
  const page = data.pages.find((p) => p.pageNumber === pageNumber);
  const tmp = page.slots[indexA];
  page.slots[indexA] = page.slots[indexB];
  page.slots[indexB] = tmp;
  saveBinderPages(currentBinderEntry.id, data);
}

/**
 * Habilita arrastrar un slot que tiene carta. Usa Pointer Events (no el
 * drag-and-drop nativo de HTML5) para que funcione igual con mouse que con
 * el dedo en celular. Un "click" normal (sin moverse) sigue abriendo el
 * detalle de la carta como siempre — solo se activa el arrastre si el
 * puntero se mueve más de DRAG_THRESHOLD píxeles antes de soltar.
 */
const DRAG_THRESHOLD = 8;

function wireSlotDragging(el, slotIndex, hasCard, pageNumber) {
  if (!hasCard) return; // solo se puede arrastrar un slot que tiene carta

  el.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return; // solo click izquierdo en mouse

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

      if (!dragging) return; // fue un click normal, no un arrastre — no hacemos nada acá

      el.classList.remove('slot-drag-source');
      if (ghost) { ghost.remove(); ghost = null; }
      document.querySelectorAll('.binder-slot.slot-drag-over').forEach((s) => s.classList.remove('slot-drag-over'));

      const under = document.elementFromPoint(upEvent.clientX, upEvent.clientY);
      const targetSlot = under && under.closest('.binder-slot');
      if (targetSlot) {
        const targetIndex = Number(targetSlot.dataset.slotIndex);
        if (!Number.isNaN(targetIndex) && targetIndex !== slotIndex) {
          swapBinderSlots(pageNumber, slotIndex, targetIndex);
          renderBinderPage();
        }
      }

      // evita que el 'click' que el navegador dispara justo después del
      // soltar abra el detalle de carta por accidente
      el.dataset.suppressClick = 'true';
      setTimeout(() => { delete el.dataset.suppressClick; }, 0);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
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
        id="slot-${slotIndex}" data-slot-index="${slotIndex}" role="button" tabindex="0"
        aria-label="${cardId ? t('loadingCardAria') : t('emptySlotAria')}">
        ${cardId ? '<div class="binder-slot-loading"></div>' : '<div class="binder-slot-empty"></div>'}
      </div>`;
  }).join('');

  currentPageCardsBySlot = {};

  page.slots.forEach((cardId, slotIndex) => {
    const el = document.getElementById(`slot-${slotIndex}`);
    const handler = () => {
      if (el.dataset.suppressClick) return; // se acaba de soltar un arrastre, no abrir nada
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
    wireSlotDragging(el, slotIndex, Boolean(cardId), page.pageNumber);
  });

  // progreso: sin sourceFilter todavía, mostramos solo cantidad de slots llenos
  const filled = countFilledSlots(currentBinderData);
  const total = cols * rows * currentBinderData.pages.length;
  document.getElementById('binder-progress-label').textContent = t('cardsProgress', { filled, total });

  document.getElementById('binder-page-indicator').textContent =
    t('pageIndicator', { n: currentPageIndex + 1, total: currentBinderData.pages.length });
  document.getElementById('binder-prev-btn').disabled = currentPageIndex === 0;
  document.getElementById('binder-next-btn').disabled = currentPageIndex === currentBinderData.pages.length - 1;

  // 2) resolvemos las cartas reales (agrupando por set para no pedir el mismo archivo dos veces)
  const renderToken = (currentBinderData.__renderToken = Symbol());
  const pendingSlots = page.slots
    .map((cardId, slotIndex) => ({ cardId, slotIndex }))
    .filter((s) => s.cardId);

  await Promise.all(pendingSlots.map(async ({ cardId, slotIndex }) => {
    try {
      const card = await resolveCard(cardId, getBinderLanguage(currentBinderEntry));
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