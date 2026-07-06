/**
 * i18n.js
 * -----------------------------------------------------------------------
 * Sistema de idiomas de la app. Inglés es siempre el idioma por defecto
 * (para portfolio/reclutadores), sin importar el idioma del navegador.
 * Siempre hay un botón para cambiar a mano, y la elección queda guardada
 * para la próxima visita.
 *
 * Cómo se usa:
 *   - HTML estático: atributos data-i18n="clave" (textContent),
 *     data-i18n-placeholder="clave" (placeholder), data-i18n-aria="clave" (aria-label).
 *     applyStaticTranslations() los recorre y aplica el texto correspondiente.
 *   - JS dinámico: t('clave') devuelve el string en el idioma actual.
 *     t('clave', {nombre: 'Ash'}) reemplaza {nombre} dentro del string.
 *
 * Cuando cambia el idioma, se dispara un evento 'languagechange' en document
 * — app.js lo escucha y vuelve a renderizar lo que esté visible en pantalla.
 */

const TRANSLATIONS = {
  en: {
    // header / nav
    brandAriaLabel: 'Go to Your Library',
    navLibrary: 'Your Library',
    navNew: '+ New Binder',

    // library view
    libraryTitle: 'Your Library',
    librarySubtitle: 'All your saved binders in this browser.',
    emptyStateText: "You haven't created any binder yet.",
    emptyStateAlt: 'Empty shelf',
    editBtn: 'Edit',
    deleteBtn: 'Delete',
    deleteConfirm: 'Delete "{name}"? This action can\'t be undone.',
    pagesLabel: '{n} pages',
    cardsProgress: '{filled} / {total} cards',

    // wizard
    wizardTitle: 'Build your binder',
    wizardStepLabel: 'Step {n} of 3 — {stepName}',
    stepCover: 'Binder Color',
    stepSize: 'Size',
    stepFolio: 'Folio Color',
    previewTitle: 'Preview',
    backBtn: 'Back',
    nextBtn: 'Next',
    saveBtn: 'Save to your library',
    nameFieldLabel: 'Binder name',
    namePlaceholder: 'E.g.: Charizard through the ages',
    coverColorLabel: 'Binder color',
    sizeFieldLabel: 'Binder size',
    folioColorLabel: 'Folio color',
    cardLanguageLabel: 'Card language',
    cardLanguageDesc: "Cards will be shown and searched in this language. Can't be changed after creating the binder.",
    langEnglishLabel: 'English',
    langSpanishLabel: 'Español',
    folioColorDesc: "Tints the area around each card. The binder and background are always black.",
    sizeSmallLabel: 'Small', sizeSmallDesc: '4 slots per page · pocket-size binder',
    sizeSquareLabel: 'Square', sizeSquareDesc: '9 slots per page · balanced 3×3 grid',
    sizeMediumLabel: 'Medium', sizeMediumDesc: '12 slots per page · the classic "12-pocket"',
    sizeLargeLabel: 'Large', sizeLargeDesc: '20 slots per page · high capacity',
    coverPreviewCaption: "This is how your binder's cover will look.",
    coverPreviewChoose: 'Choose a color to see the cover.',
    sizePreviewCaption: 'Binder {size} — {n} slots per page.',
    sizePreviewChoose: 'Choose a size to see how the page looks.',
    loadingSampleCard: 'Loading sample card…',
    folioTransparentCaption: "Transparent folio: you can see the binder's black background.",
    folioColorCaption: 'Folio color: {color}.',
    folioChooseCaption: 'Choose a folio color.',
    colorAzul: 'Blue', colorNegro: 'Black', colorVioleta: 'Purple', colorRojo: 'Red',
    colorRosa: 'Pink', colorVerde: 'Green', colorGris: 'Gray', colorTransparente: 'Transparent',

    // binder view
    backToLibrary: '← Your Library',
    prevPageAria: 'Previous page',
    nextPageAria: 'Next page',
    pageIndicator: 'Page {n} of {total}',
    pageIndicatorRange: 'Pages {a}-{b} of {total}',
    addPageBtn: '+ Add page',
    loadingCardAria: 'Loading card…',
    emptySlotAria: 'Empty slot',
    viewModeTwoBtn: '⧉ 2 Pages',
    viewModeOneBtn: '▯ 1 Page',

    // export binder
    exportBtn: '⬇ Export binder',
    exportProgressTitle: 'Preparing your binder…',
    exportProgressLabel: 'Loading cards ({done} of {total})',
    exportEmptyBinder: 'This binder has no cards yet — add some before exporting.',
    exportStartBtn: 'Start browsing',
    exportBackToCoverBtn: '← Back to cover',
    exportCredit: 'Made with <strong>CodeMate Pokédex Collection</strong>, a fan-made project.',

    // buscador
    buscadorTitle: 'Card Search',
    buscadorSubtitle: 'Pick a card for this slot.',
    searchPlaceholder: 'Search by name or card number…',
    filtersBtn: 'Filters',
    clearFiltersBtn: 'Clear filters',
    illustratorLabel: 'Illustrator',
    illustratorPlaceholder: 'All illustrators',
    illustratorHint: 'Search by first or last name, anywhere in the name.',
    generationLabel: 'Generation',
    generationAllOption: 'All generations',
    generationHint: 'Groups by era (Base, Neo, Sword & Shield...).',
    rarityLabel: 'Rarity',
    typeLabel: 'Type',
    loadingFilters: 'Loading filters…',
    filtersLoadError: 'Filters couldn\'t load (did you run "node scripts/build-indices.js"? check the console for details).',
    startPrompt: 'Type a name, or pick illustrator/generation to start.',
    loadingIllustratorCards: 'Loading cards from that illustrator…',
    loadingGenerationCards: 'Loading cards from that generation…',
    searchingByNumber: 'Searching by number…',
    searching: 'Searching…',
    searchLoadError: "Couldn't load that search. Check the console for details.",
    noMatches: 'No cards match this combination.',
    tryRemovingFilter: ' Try removing a filter.',
    noComboMatches: 'No matches.',
    loadMoreBtn: 'Load more ({shown} of {total})',

    // card detail
    useCardBtn: 'Use this card',
    keepSearchingBtn: '‹ Keep searching',
    removeBtn: 'Remove from slot',
    changeCardBtn: 'Change card',
    numberLabel: 'Number',
    setLabel: 'Set',
    closeAria: 'Close',

    // edit binder
    editBinderTitle: 'Edit binder',
    editBinderSubtitle: "Size can't be changed once created.",
    cancelBtn: 'Cancel',
    saveChangesBtn: 'Save changes',

    // render-card fallback
    imageComingSoonLine1: 'IMAGE',
    imageComingSoonLine2: 'COMING SOON',

    // storage sizes
    sizeChicaLabel: 'Small · 2×2',
    sizeCuadradaLabel: 'Square · 3×3',
    sizeMedianaLabel: 'Medium · 4×3',
    sizeGrandeLabel: 'Large · 5×4',

    // footer
    footerText: 'Fan-made, free, non-commercial project. Pokémon and character names are registered trademarks of Nintendo, Creatures Inc. and GAME FREAK Inc. © The Pokémon Company. CodeMate Pokédex Collection is not affiliated with or endorsed by these companies.',
  },
  es: {
    brandAriaLabel: 'Ir a Tu biblioteca',
    navLibrary: 'Tu biblioteca',
    navNew: '+ Nueva carpeta',

    libraryTitle: 'Tu biblioteca',
    librarySubtitle: 'Todas tus carpetas guardadas en este navegador.',
    emptyStateText: 'Todavía no armaste ninguna carpeta.',
    emptyStateAlt: 'Estantería vacía',
    editBtn: 'Editar',
    deleteBtn: 'Eliminar',
    deleteConfirm: '¿Eliminar "{name}"? Esta acción no se puede deshacer.',
    pagesLabel: '{n} hojas',
    cardsProgress: '{filled} / {total} cartas',

    wizardTitle: 'Armá tu carpeta',
    wizardStepLabel: 'Paso {n} de 3 — {stepName}',
    stepCover: 'Color de carpeta',
    stepSize: 'Tamaño',
    stepFolio: 'Color de folio',
    previewTitle: 'Vista previa',
    backBtn: 'Atrás',
    nextBtn: 'Siguiente',
    saveBtn: 'Guardar en tu biblioteca',
    nameFieldLabel: 'Nombre de la carpeta',
    namePlaceholder: 'Ej: Charizard through the ages',
    coverColorLabel: 'Color de carpeta',
    sizeFieldLabel: 'Tamaño de carpeta',
    folioColorLabel: 'Color de folio',
    cardLanguageLabel: 'Idioma de las cartas',
    cardLanguageDesc: 'Las cartas se van a mostrar y buscar en este idioma. No se puede cambiar después de crear la carpeta.',
    langEnglishLabel: 'English',
    langSpanishLabel: 'Español',
    folioColorDesc: 'Tiñe el área alrededor de cada carta. La carpeta y el fondo siempre son negros.',
    sizeSmallLabel: 'Chica', sizeSmallDesc: '4 slots por hoja · tipo binder de bolsillo',
    sizeSquareLabel: 'Cuadrada', sizeSquareDesc: '9 slots por hoja · grilla equilibrada 3×3',
    sizeMediumLabel: 'Mediana', sizeMediumDesc: '12 slots por hoja · el clásico "12-pocket"',
    sizeLargeLabel: 'Grande', sizeLargeDesc: '20 slots por hoja · alta capacidad',
    coverPreviewCaption: 'Así se va a ver la portada de tu carpeta.',
    coverPreviewChoose: 'Elegí un color para ver la portada.',
    sizePreviewCaption: 'Carpeta {size} — {n} slots por hoja.',
    sizePreviewChoose: 'Elegí un tamaño para ver cómo queda la hoja.',
    loadingSampleCard: 'Cargando carta de muestra…',
    folioTransparentCaption: 'Folio transparente: se ve el fondo negro de la carpeta.',
    folioColorCaption: 'Folio color {color}.',
    folioChooseCaption: 'Elegí un color de folio.',
    colorAzul: 'Azul', colorNegro: 'Negro', colorVioleta: 'Violeta', colorRojo: 'Rojo',
    colorRosa: 'Rosa', colorVerde: 'Verde', colorGris: 'Gris', colorTransparente: 'Transparente',

    backToLibrary: '← Tu biblioteca',
    prevPageAria: 'Página anterior',
    nextPageAria: 'Página siguiente',
    pageIndicator: 'Página {n} de {total}',
    pageIndicatorRange: 'Páginas {a}-{b} de {total}',
    addPageBtn: '+ Agregar hoja',
    loadingCardAria: 'Cargando carta…',
    emptySlotAria: 'Slot vacío',
    viewModeTwoBtn: '⧉ 2 Hojas',
    viewModeOneBtn: '▯ 1 Hoja',

    // exportar carpeta
    exportBtn: '⬇ Exportar carpeta',
    exportProgressTitle: 'Preparando tu carpeta…',
    exportProgressLabel: 'Cargando cartas ({done} de {total})',
    exportEmptyBinder: 'Esta carpeta todavía no tiene cartas — agregá alguna antes de exportar.',
    exportStartBtn: 'Empezar a hojear',
    exportBackToCoverBtn: '← Volver a la portada',
    exportCredit: 'Hecho con <strong>CodeMate Pokédex Collection</strong>, un proyecto fan-made.',

    buscadorTitle: 'Buscador de cartas',
    buscadorSubtitle: 'Elegí una carta para este slot.',
    searchPlaceholder: 'Buscar por nombre o número de carta…',
    filtersBtn: 'Filtros',
    clearFiltersBtn: 'Limpiar filtros',
    illustratorLabel: 'Ilustrador',
    illustratorPlaceholder: 'Todos los ilustradores',
    illustratorHint: 'Buscá por nombre o apellido, en cualquier parte del nombre.',
    generationLabel: 'Generación',
    generationAllOption: 'Todas las generaciones',
    generationHint: 'Agrupa por era (Base, Neo, Sword & Shield...).',
    rarityLabel: 'Rareza',
    typeLabel: 'Tipo',
    loadingFilters: 'Cargando filtros…',
    filtersLoadError: 'No se pudieron cargar los filtros (¿corriste "node scripts/build-indices.js"? revisá la consola para más detalle).',
    startPrompt: 'Escribí un nombre, o elegí ilustrador/generación para empezar.',
    loadingIllustratorCards: 'Cargando cartas de ese ilustrador…',
    loadingGenerationCards: 'Cargando cartas de esa generación…',
    searchingByNumber: 'Buscando por número…',
    searching: 'Buscando…',
    searchLoadError: 'No se pudo cargar esa búsqueda. Revisá la consola para más detalle.',
    noMatches: 'No encontramos cartas con esta combinación.',
    tryRemovingFilter: ' Probá sacar algún filtro.',
    noComboMatches: 'Sin coincidencias.',
    loadMoreBtn: 'Cargar más ({shown} de {total})',

    useCardBtn: 'Usar esta carta',
    keepSearchingBtn: '‹ Seguir buscando',
    removeBtn: 'Quitar del slot',
    changeCardBtn: 'Cambiar carta',
    numberLabel: 'Número',
    setLabel: 'Set',
    closeAria: 'Cerrar',

    editBinderTitle: 'Editar carpeta',
    editBinderSubtitle: 'El tamaño no se puede cambiar una vez creada.',
    cancelBtn: 'Cancelar',
    saveChangesBtn: 'Guardar cambios',

    imageComingSoonLine1: 'IMAGEN',
    imageComingSoonLine2: 'PRÓXIMAMENTE',

    sizeChicaLabel: 'Chica · 2×2',
    sizeCuadradaLabel: 'Cuadrada · 3×3',
    sizeMedianaLabel: 'Mediana · 4×3',
    sizeGrandeLabel: 'Grande · 5×4',

    footerText: 'Proyecto fan-made, gratuito y sin fines comerciales. Pokémon y los nombres de personajes son marcas registradas de Nintendo, Creatures Inc. y GAME FREAK Inc. © The Pokémon Company. CodeMate Pokédex Collection no está afiliado ni respaldado por estas empresas.',
  },
};

const LANG_STORAGE_KEY = 'codemate-lang';

/** Siempre arranca en inglés salvo que la persona ya haya elegido un idioma antes */
function detectDefaultLanguage() {
  const saved = localStorage.getItem(LANG_STORAGE_KEY);
  if (saved === 'en' || saved === 'es') return saved;
  return 'en';
}

let currentLang = detectDefaultLanguage();

function t(key, vars) {
  let str = (TRANSLATIONS[currentLang] && TRANSLATIONS[currentLang][key]) ?? TRANSLATIONS.en[key] ?? key;
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  }
  return str;
}

function getLanguage() {
  return currentLang;
}

function setLanguage(lang) {
  if (lang !== 'en' && lang !== 'es') return;
  currentLang = lang;
  localStorage.setItem(LANG_STORAGE_KEY, lang);
  applyStaticTranslations();
  document.dispatchEvent(new CustomEvent('languagechange'));
}

/** Recorre el HTML estático (el que no se regenera por JS) y aplica el idioma actual */
function applyStaticTranslations() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    el.setAttribute('aria-label', t(el.dataset.i18nAria));
  });
  document.documentElement.lang = currentLang === 'es' ? 'es-AR' : 'en';
  const toggleBtn = document.getElementById('lang-toggle-btn');
  if (toggleBtn) toggleBtn.textContent = currentLang === 'es' ? 'EN' : 'ES';
}