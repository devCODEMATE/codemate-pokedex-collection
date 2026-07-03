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
        <img class="naga-pixel" src="images/codemate-avatar.png" alt="CodeMate" />
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
        <button class="link-btn danger" id="delete-${entry.id}" type="button">Eliminar</button>
      </span>
    </div>`;
}

function escapeHTML(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[c]));
}
