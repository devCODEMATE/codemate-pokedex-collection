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
        <svg class="empty-state-icon" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <!-- estante -->
          <rect x="8" y="98" width="184" height="8" rx="3" fill="#073b4c"/>
          <!-- carpetas paradas, de colores de marca -->
          <rect x="20" y="34" width="26" height="64" rx="4" fill="#5a527a"/>
          <rect x="50" y="22" width="26" height="76" rx="4" fill="#ffd166"/>
          <rect x="80" y="40" width="26" height="58" rx="4" fill="#6b9e93"/>
          <rect x="110" y="28" width="26" height="70" rx="4" fill="#073b4c"/>
          <rect x="140" y="46" width="26" height="52" rx="4" fill="#c96a90"/>
          <!-- lomo con detalle -->
          <rect x="26" y="42" width="14" height="4" rx="2" fill="#ffffff" opacity="0.5"/>
          <rect x="56" y="30" width="14" height="4" rx="2" fill="#073b4c" opacity="0.3"/>
          <rect x="86" y="48" width="14" height="4" rx="2" fill="#ffffff" opacity="0.5"/>
          <rect x="116" y="36" width="14" height="4" rx="2" fill="#ffd166" opacity="0.8"/>
          <rect x="146" y="54" width="14" height="4" rx="2" fill="#ffffff" opacity="0.5"/>
          <!-- flechita apuntando hacia abajo, al botón "+ Nueva carpeta" que está justo debajo -->
          <path d="M100 116 v16" stroke="#5a527a" stroke-width="3" fill="none" stroke-linecap="round" stroke-dasharray="1 6"/>
          <path d="M91 128 l9 10 9 -10 z" fill="#5a527a"/>
        </svg>
        <p>Todavía no armaste ninguna carpeta.</p>
        <button class="btn btn-primary" onclick="goToView('wizard')">+ Nueva carpeta</button>
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
      if (confirm(`¿Eliminar "${entry.name}"? Esta acción no se puede deshacer.`)) {
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
        <span>${SIZES[entry.size].label}</span>
        <span>${entry.pageCount} hojas</span>
      </span>
      <span class="binder-card-progress">${filled} / ${totalSlots} cartas</span>
      <span class="binder-card-actions">
        <button class="link-btn" id="edit-${entry.id}" type="button">Editar</button>
        <button class="link-btn danger" id="delete-${entry.id}" type="button">Eliminar</button>
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
      style="background:${resolveSwatchHex(c.key)}" data-color="${c.key}" title="${c.label}" aria-label="${c.label}"></button>
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
      style="${c.key === 'transparente' ? '' : `background:${resolveSwatchHex(c.key)}`}" data-color="${c.key}" title="${c.label}" aria-label="${c.label}"></button>
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