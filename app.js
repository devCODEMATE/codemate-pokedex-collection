/**
 * app.js
 * -----------------------------------------------------------------------
 * Router mínimo: alterna entre las 3 vistas (library / wizard / binder) y
 * cablea los botones globales. Todo el resto de la lógica vive en su
 * propio archivo (wizard.js, library.js, binder.js, buscador.js).
 */

const VIEWS = ['library', 'wizard', 'binder'];

function goToView(name) {
  VIEWS.forEach((v) => {
    document.getElementById(`view-${v}`).hidden = v !== name;
  });
  document.getElementById('nav-library').classList.toggle('active', name === 'library');
}

function initApp() {
  applyStaticTranslations(); // fija el idioma inicial en el HTML estático

  document.getElementById('lang-toggle-btn').addEventListener('click', () => {
    setLanguage(getLanguage() === 'en' ? 'es' : 'en');
  });
  document.addEventListener('languagechange', () => {
    if (!document.getElementById('view-library').hidden) renderLibrary();
    if (!document.getElementById('view-wizard').hidden) renderWizardStep();
    if (!document.getElementById('view-binder').hidden) renderBinderPage();
    if (!document.getElementById('buscador-modal').hidden) { renderBuscadorFilterControls(); runBuscadorSearch(); }
    if (!document.getElementById('card-detail-modal').hidden) renderCardDetail();
  });

  document.getElementById('brand-home-btn').addEventListener('click', () => {
    renderLibrary();
    goToView('library');
  });
  document.getElementById('brand-home-btn').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      renderLibrary();
      goToView('library');
    }
  });

  document.getElementById('nav-library').addEventListener('click', () => {
    renderLibrary();
    goToView('library');
  });

  document.getElementById('nav-new').addEventListener('click', () => {
    resetWizard();
    goToView('wizard');
  });

  document.getElementById('wizard-next-btn').addEventListener('click', wizardGoNext);
  document.getElementById('wizard-back-btn').addEventListener('click', wizardGoBack);

  document.getElementById('binder-back-btn').addEventListener('click', () => {
    renderLibrary();
    goToView('library');
  });
  document.getElementById('binder-prev-btn').addEventListener('click', () => flipBinderPage(-1));
  document.getElementById('binder-next-btn').addEventListener('click', () => flipBinderPage(1));
  document.getElementById('binder-add-page-btn').addEventListener('click', handleAddPage);
document.getElementById('binder-export-btn').addEventListener('click', () => exportBinderHTML(currentBinderEntry));

  wireBuscadorGlobalEvents();
  wireCardDetailGlobalEvents();
  wireCardZoomGlobalEvents();
  wireEditBinderGlobalEvents();

  renderLibrary();
  goToView('library');
}

document.addEventListener('DOMContentLoaded', initApp);