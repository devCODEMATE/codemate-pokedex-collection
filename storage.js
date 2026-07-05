/**
 * storage.js
 * -----------------------------------------------------------------------
 * Capa de acceso a localStorage. Implementa el modelo de datos definido
 * en el plan:
 *
 *  - "codemate-binders-index"   -> array liviano, lo único que lee Tu biblioteca
 *  - "codemate-binder-{id}"     -> { pages: [{ pageNumber, slots: [] }] }
 *
 * Nada fuera de este archivo debería llamar a localStorage directamente.
 */

const STORAGE_INDEX_KEY = 'codemate-binders-index';
const storageBinderKey = (id) => `codemate-binder-${id}`;

const SIZES = {
  chica: { cols: 2, rows: 2, defaultPages: 8 },
  mediana: { cols: 4, rows: 3, defaultPages: 12 },
  grande: { cols: 5, rows: 4, defaultPages: 15 },
};

/** Traduce el nombre de un tamaño de carpeta al idioma actual */
function sizeLabel(sizeKey) {
  const keys = { chica: 'sizeChicaLabel', mediana: 'sizeMedianaLabel', grande: 'sizeGrandeLabel' };
  return t(keys[sizeKey] || 'sizeChicaLabel');
}

/**
 * Idioma de las cartas de una carpeta. Las carpetas creadas antes de esta
 * feature no tienen `cardLanguage` guardado — en ese caso asumimos 'en',
 * que era el único catálogo que existía hasta ahora.
 */
function getBinderLanguage(entry) {
  return entry && entry.cardLanguage ? entry.cardLanguage : 'en';
}

function cardLanguageLabel(langKey) {
  const keys = { en: 'langEnglishLabel', es: 'langSpanishLabel' };
  return t(keys[langKey] || 'langEnglishLabel');
}

function getBindersIndex() {
  try {
    const raw = localStorage.getItem(STORAGE_INDEX_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error('No se pudo leer el índice de carpetas:', err);
    return [];
  }
}

function saveBindersIndex(index) {
  localStorage.setItem(STORAGE_INDEX_KEY, JSON.stringify(index));
}

function getBinderPages(id) {
  try {
    const raw = localStorage.getItem(storageBinderKey(id));
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error('No se pudo leer la carpeta', id, err);
    return null;
  }
}

function saveBinderPages(id, data) {
  localStorage.setItem(storageBinderKey(id), JSON.stringify(data));
}

function makeEmptyPages(pageCount, slotsPerPage) {
  const pages = [];
  for (let p = 1; p <= pageCount; p++) {
    pages.push({ pageNumber: p, slots: new Array(slotsPerPage).fill(null) });
  }
  return pages;
}

/**
 * Crea una carpeta nueva a partir de las respuestas del wizard y la
 * persiste en ambas claves de localStorage. `cardLanguage` queda fijo
 * para siempre — igual que el tamaño, cambiarlo después mezclaría
 * catálogos distintos y rompería las cartas ya puestas.
 */
function createBinder({ name, coverColor, folioColor, size, cardLanguage }) {
  const sizeConfig = SIZES[size];
  const slotsPerPage = sizeConfig.cols * sizeConfig.rows;
  const id = `binder-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const indexEntry = {
    id,
    name: name && name.trim() ? name.trim() : 'Mi carpeta',
    coverColor,
    folioColor,
    size,
    cardLanguage: cardLanguage || 'en',
    grid: { cols: sizeConfig.cols, rows: sizeConfig.rows },
    pageCount: sizeConfig.defaultPages,
    sourceFilter: null, // Fase 3 lo conecta a un índice real (by-pokemon, etc.)
    createdAt: new Date().toISOString(),
  };

  const index = getBindersIndex();
  index.push(indexEntry);
  saveBindersIndex(index);
  saveBinderPages(id, { pages: makeEmptyPages(sizeConfig.defaultPages, slotsPerPage) });

  return indexEntry;
}

function deleteBinder(id) {
  const index = getBindersIndex().filter((b) => b.id !== id);
  saveBindersIndex(index);
  localStorage.removeItem(storageBinderKey(id));
}

/**
 * Edita nombre/color de carpeta/color de folio de una carpeta ya existente.
 * A propósito NO permite cambiar el tamaño ni el idioma de las cartas: eso
 * implicaría rearmar la grilla o mezclar catálogos distintos, y las cartas
 * ya puestas quedarían mal ubicadas o inexistentes en el nuevo idioma.
 */
function updateBinderMeta(id, { name, coverColor, folioColor }) {
  const index = getBindersIndex();
  const entry = index.find((b) => b.id === id);
  if (!entry) return null;
  entry.name = name && name.trim() ? name.trim() : entry.name;
  entry.coverColor = coverColor;
  entry.folioColor = folioColor;
  saveBindersIndex(index);
  return entry;
}

/** Agrega una hoja más al final de la carpeta ("comprar repuestos") */
function addPageToBinder(binderEntry) {
  const data = getBinderPages(binderEntry.id);
  const slotsPerPage = binderEntry.grid.cols * binderEntry.grid.rows;
  const nextPageNumber = data.pages.length + 1;
  data.pages.push({ pageNumber: nextPageNumber, slots: new Array(slotsPerPage).fill(null) });
  saveBinderPages(binderEntry.id, data);

  const index = getBindersIndex();
  const entry = index.find((b) => b.id === binderEntry.id);
  entry.pageCount = data.pages.length;
  saveBindersIndex(index);

  return data;
}

/** Cuenta slots llenos. Si sourceFilter existe, en Fase 3 esto se cruza contra totalCards. */
function countFilledSlots(pagesData) {
  let filled = 0;
  pagesData.pages.forEach((page) => {
    page.slots.forEach((slot) => {
      if (slot) filled += 1;
    });
  });
  return filled;
}

function assignCardToSlot(binderId, pageNumber, slotIndex, cardId) {
  const data = getBinderPages(binderId);
  const page = data.pages.find((p) => p.pageNumber === pageNumber);
  page.slots[slotIndex] = cardId;
  saveBinderPages(binderId, data);
  return data;
}

function clearSlot(binderId, pageNumber, slotIndex) {
  return assignCardToSlot(binderId, pageNumber, slotIndex, null);
}