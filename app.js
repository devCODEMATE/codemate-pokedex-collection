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

  wireBuscadorGlobalEvents();
  wireCardDetailGlobalEvents();
  wireEditBinderGlobalEvents();

  renderLibrary();
  goToView('library');
}

document.addEventListener('DOMContentLoaded', initApp);
