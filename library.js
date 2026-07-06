/**
 * library.js
 * -----------------------------------------------------------------------
 * "Tu biblioteca": lee únicamente codemate-binders-index (liviano).
 */

function renderLibrary() {
  const container = document.getElementById('library-content');
  const index = getBindersIndex();

  if (index.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <img class="empty-state-icon" src="images/rack.png" alt="${t('emptyStateAlt')}" />
        <p>${t('emptyStateText')}</p>
        <button class="btn btn-primary" onclick="resetWizard(); goToView('wizard');">${t('navNew')}</button>
      </div>`;
    return;
  }

  container.innerHTML = `<div class="library-grid">${index.map(binderCardHTML).join('')}</div>`;

  index.forEach((entry) => {
    const card = document.getElementById(`open-${entry.id}`);
    card.addEventListener('click', () => openBinder(entry.id));
    card.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openBinder(entry.id); }
    });
    document.getElementById(`delete-${entry.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      if (confirm(t('deleteConfirm', { name: entry.name }))) {
        deleteBinder(entry.id);
        renderLibrary();
      }
    });
    document.getElementById(`edit-${entry.id}`).addEventListener('click', (e) => {
      e.stopPropagation();
      openEditBinder(entry);
    });
  });
}

function binderCardHTML(entry) {
  const pagesData = getBinderPages(entry.id);
  const filled = pagesData ? countFilledSlots(pagesData) : 0;
  const totalSlots = entry.grid.cols * entry.grid.rows * entry.pageCount;
  const coverHex = resolveSwatchHex(entry.coverColor);
  const folioHex = resolveSwatchHex(entry.folioColor);
  const isTransparentFolio = entry.folioColor === 'transparente';

  return `
    <div class="binder-card" id="open-${entry.id}" role="button" tabindex="0">
      <div class="binder-card-cover" style="background:${coverHex}">
        <span class="folio-dot ${isTransparentFolio ? 'is-transparent' : ''}" style="${isTransparentFolio ? '' : `background:${folioHex}`}"></span>
      </div>
      <span class="binder-card-name">${escapeHTML(entry.name)}</span>
      <span class="binder-card-meta">
        <span>${sizeLabel(entry.size)} · ${cardLanguageLabel(getBinderLanguage(entry))}</span>
        <span>${t('pagesLabel', { n: entry.pageCount })}</span>
      </span>
      <span class="binder-card-progress">${t('cardsProgress', { filled, total: totalSlots })}</span>
      <span class="binder-card-actions">
        <button class="link-btn" id="edit-${entry.id}" type="button">${t('editBtn')}</button>
        <button class="link-btn danger" id="delete-${entry.id}" type="button">${t('deleteBtn')}</button>
      </span>
    </div>`;
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[c]));
}

/**
 * Editar carpeta: reusa las mismas paletas de color del wizard (COVER_COLORS,
 * FOLIO_COLORS, definidas en wizard.js). A propósito no permite tocar el
 * tamaño — ver el comentario en storage.js/updateBinderMeta.
 */
let editBinderEntry = null;
let editBinderState = { coverColor: null, folioColor: null };

function openEditBinder(entry) {
  editBinderEntry = entry;
  editBinderState = { coverColor: entry.coverColor, folioColor: entry.folioColor };
  document.getElementById('edit-binder-name-input').value = entry.name;
  renderEditBinderSwatches();
  document.getElementById('edit-binder-modal').hidden = false;
}

function closeEditBinder() {
  document.getElementById('edit-binder-modal').hidden = true;
  editBinderEntry = null;
}

function renderEditBinderSwatches() {
  const coverRow = document.getElementById('edit-binder-cover-row');
  coverRow.innerHTML = COVER_COLORS.map((c) => `
    <button type="button" class="swatch ${editBinderState.coverColor === c.key ? 'selected' : ''}"
      style="background:${resolveSwatchHex(c.key)}" data-color="${c.key}" title="${colorLabel(c.key)}" aria-label="${colorLabel(c.key)}"></button>
  `).join('');
  coverRow.querySelectorAll('.swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      editBinderState.coverColor = btn.dataset.color;
      renderEditBinderSwatches();
    });
  });

  const folioRow = document.getElementById('edit-binder-folio-row');
  folioRow.innerHTML = FOLIO_COLORS.map((c) => `
    <button type="button" class="swatch ${c.key === 'transparente' ? 'is-transparent' : ''} ${editBinderState.folioColor === c.key ? 'selected' : ''}"
      style="${c.key === 'transparente' ? '' : `background:${resolveSwatchHex(c.key)}`}" data-color="${c.key}" title="${colorLabel(c.key)}" aria-label="${colorLabel(c.key)}"></button>
  `).join('');
  folioRow.querySelectorAll('.swatch').forEach((btn) => {
    btn.addEventListener('click', () => {
      editBinderState.folioColor = btn.dataset.color;
      renderEditBinderSwatches();
    });
  });
}

function saveEditBinder() {
  const name = document.getElementById('edit-binder-name-input').value;
  updateBinderMeta(editBinderEntry.id, {
    name,
    coverColor: editBinderState.coverColor,
    folioColor: editBinderState.folioColor,
  });
  closeEditBinder();
  renderLibrary();
}

function wireEditBinderGlobalEvents() {
  document.getElementById('edit-binder-close-btn').addEventListener('click', closeEditBinder);
  document.getElementById('edit-binder-cancel-btn').addEventListener('click', closeEditBinder);
  document.getElementById('edit-binder-save-btn').addEventListener('click', saveEditBinder);
  document.getElementById('edit-binder-modal').addEventListener('click', (e) => {
    if (e.target.id === 'edit-binder-modal') closeEditBinder();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !document.getElementById('edit-binder-modal').hidden) closeEditBinder();
  });
}