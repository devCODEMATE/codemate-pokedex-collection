/**
 * wizard.js
 * -----------------------------------------------------------------------
 * "Armá tu carpeta": 3 pasos según el plan (color de carpeta → tamaño →
 * color de folio), con preview en vivo. El nombre de la carpeta se pide
 * junto al color de carpeta en el paso 1 para no agregar un 4º paso.
 */

const COVER_COLORS = [
  { key: 'azul', hex: 'var(--swatch-azul)', label: 'Azul' },
  { key: 'negro', hex: 'var(--swatch-negro)', label: 'Negro' },
  { key: 'violeta', hex: 'var(--swatch-violeta)', label: 'Violeta' },
  { key: 'rojo', hex: 'var(--swatch-rojo)', label: 'Rojo' },
  { key: 'rosa', hex: 'var(--swatch-rosa)', label: 'Rosa' },
  { key: 'verde', hex: 'var(--swatch-verde)', label: 'Verde' },
  { key: 'gris', hex: 'var(--swatch-gris)', label: 'Gris' },
];

const FOLIO_COLORS = [
  ...COVER_COLORS,
  { key: 'transparente', hex: 'var(--swatch-transparente)', label: 'Transparente' },
];

let PREVIEW_CARD = null; // se carga async cada vez que se abre el wizard (ver loadPreviewCard)
let previewCardLoading = false;

/** Elige una carta al azar de Base Set (102 cartas, numeradas 1-102 sin huecos, así que cualquier número es válido) */
function pickRandomPreviewCardId() {
  const n = Math.floor(Math.random() * 102) + 1;
  return `base1-${n}`;
}

async function loadPreviewCard() {
  if (previewCardLoading) return;
  previewCardLoading = true;
  try {
    PREVIEW_CARD = await resolveCard(pickRandomPreviewCardId());
  } catch (err) {
    console.error('No se pudo cargar la carta de muestra del wizard, reintentando con otra:', err);
    PREVIEW_CARD = null;
  } finally {
    previewCardLoading = false;
  }
  if (wizardStep === 3 && !document.getElementById('view-wizard').hidden) {
    updateWizardPreview();
  }
}

let wizardState = { name: '', coverColor: null, size: null, folioColor: null };
let wizardStep = 1;

function resetWizard() {
  wizardState = { name: '', coverColor: null, size: null, folioColor: null };
  wizardStep = 1;
  PREVIEW_CARD = null;
  loadPreviewCard(); // dispara la carga de una carta nueva al azar; se resuelve en segundo plano
  renderWizardStep();
}

function resolveSwatchHex(colorKey) {
  const match = [...COVER_COLORS, ...FOLIO_COLORS].find((c) => c.key === colorKey);
  if (!match) return '#000';
  // var(--x) no sirve como background inline directo en algunos casos; resolvemos a valor real
  const map = {
    azul: '#2b6cb0', negro: '#1a1a1a', violeta: '#5a527a', rojo: '#b3432f',
    rosa: '#c96a90', verde: '#2f7a52', gris: '#6b7280', transparente: 'transparent',
  };
  return map[colorKey];
}

function renderWizardStep() {
  document.getElementById('wizard-step-label').textContent =
    `Paso ${wizardStep} de 3 — ${['Color de carpeta', 'Tamaño', 'Color de folio'][wizardStep - 1]}`;

  document.querySelectorAll('.wizard-step-dot').forEach((dot) => {
    const n = Number(dot.dataset.step);
    dot.classList.toggle('done', n < wizardStep);
    dot.classList.toggle('current', n === wizardStep);
  });

  const panel = document.getElementById('wizard-panel');
  if (wizardStep === 1) panel.innerHTML = wizardStepCoverHTML();
  if (wizardStep === 2) panel.innerHTML = wizardStepSizeHTML();
  if (wizardStep === 3) panel.innerHTML = wizardStepFolioHTML();

  wireWizardStepEvents();
  updateWizardPreview();

  document.getElementById('wizard-back-btn').disabled = false;
  document.getElementById('wizard-back-btn').style.visibility = wizardStep === 1 ? 'hidden' : 'visible';

  const nextBtn = document.getElementById('wizard-next-btn');
  nextBtn.textContent = wizardStep === 3 ? 'Guardar en tu biblioteca' : 'Siguiente';
  nextBtn.disabled = !isWizardStepValid();
}

function wizardStepCoverHTML() {
  return `
    <label class="field-label" for="wizard-name-input">Nombre de la carpeta</label>
    <input type="text" class="text-input" id="wizard-name-input" placeholder="Ej: Charizard through the ages" maxlength="40" value="${escapeAttr(wizardState.name)}" />
    <label class="field-label">Color de carpeta</label>
    <div class="swatch-row" id="cover-swatch-row">
      ${COVER_COLORS.map((c) => `
        <button type="button" class="swatch ${wizardState.coverColor === c.key ? 'selected' : ''}"
          style="background:${resolveSwatchHex(c.key)}" data-color="${c.key}" title="${c.label}" aria-label="${c.label}"></button>
      `).join('')}
    </div>
  `;
}

function wizardStepSizeHTML() {
  const sizes = [
    { key: 'chica', cols: 2, rows: 2, label: 'Chica', desc: '4 slots por hoja · tipo binder de bolsillo' },
    { key: 'mediana', cols: 4, rows: 3, label: 'Mediana', desc: '12 slots por hoja · el clásico "12-pocket"' },
    { key: 'grande', cols: 5, rows: 4, label: 'Grande', desc: '20 slots por hoja · alta capacidad' },
  ];
  return `
    <label class="field-label">Tamaño de carpeta</label>
    <div class="size-option-row">
      ${sizes.map((s) => `
        <button type="button" class="size-option ${wizardState.size === s.key ? 'selected' : ''}" data-size="${s.key}">
          <div class="size-option-grid-icon" style="grid-template-columns:repeat(${s.cols},6px)">
            ${Array.from({ length: s.cols * s.rows }).map(() => '<span style="width:6px;height:6px;"></span>').join('')}
          </div>
          <div class="size-option-text">
            <strong>${s.label} · ${s.cols}×${s.rows}</strong>
            <small>${s.desc}</small>
          </div>
        </button>
      `).join('')}
    </div>
  `;
}

function wizardStepFolioHTML() {
  return `
    <label class="field-label">Color de folio</label>
    <p class="view-subtitle" style="margin-top:-4px;">Tiñe el área alrededor de cada carta. La carpeta y el fondo siempre son negros.</p>
    <div class="swatch-row" id="folio-swatch-row">
      ${FOLIO_COLORS.map((c) => `
        <button type="button" class="swatch ${c.key === 'transparente' ? 'is-transparent' : ''} ${wizardState.folioColor === c.key ? 'selected' : ''}"
          style="${c.key === 'transparente' ? '' : `background:${resolveSwatchHex(c.key)}`}" data-color="${c.key}" title="${c.label}" aria-label="${c.label}"></button>
      `).join('')}
    </div>
  `;
}

function wireWizardStepEvents() {
  if (wizardStep === 1) {
    document.getElementById('wizard-name-input').addEventListener('input', (e) => {
      wizardState.name = e.target.value;
      document.getElementById('wizard-next-btn').disabled = !isWizardStepValid();
    });
    document.querySelectorAll('#cover-swatch-row .swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        wizardState.coverColor = btn.dataset.color;
        renderWizardStep();
      });
    });
  }
  if (wizardStep === 2) {
    document.querySelectorAll('.size-option').forEach((btn) => {
      btn.addEventListener('click', () => {
        wizardState.size = btn.dataset.size;
        renderWizardStep();
      });
    });
  }
  if (wizardStep === 3) {
    document.querySelectorAll('#folio-swatch-row .swatch').forEach((btn) => {
      btn.addEventListener('click', () => {
        wizardState.folioColor = btn.dataset.color;
        renderWizardStep();
      });
    });
  }
}

function isWizardStepValid() {
  if (wizardStep === 1) return Boolean(wizardState.coverColor);
  if (wizardStep === 2) return Boolean(wizardState.size);
  if (wizardStep === 3) return Boolean(wizardState.folioColor);
  return false;
}

function renderClosedCoverHTML(hex) {
  return `
    <div style="position:relative;width:78%;height:88%;border-radius:6px;overflow:hidden;
      background:${hex};
      box-shadow:0 10px 22px rgba(0,0,0,0.45), inset 0 0 0 1px rgba(255,255,255,0.08);">
      <div style="position:absolute;inset:0;background:linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.04) 35%, rgba(0,0,0,0.18) 100%);"></div>
      <div style="position:absolute;top:0;bottom:0;right:16%;width:9%;background:rgba(0,0,0,0.3);"></div>
      <div style="position:absolute;top:8%;bottom:8%;right:11%;width:4%;background:rgba(0,0,0,0.55);border-radius:2px;"></div>
    </div>`;
}

function updateWizardPreview() {
  const slot = document.getElementById('wizard-preview-slot');
  const caption = document.getElementById('wizard-preview-caption');
  const coverHex = wizardState.coverColor ? resolveSwatchHex(wizardState.coverColor) : '#3a3a3a';

  if (wizardStep === 1) {
    slot.style.background = 'var(--black)';
    if (wizardState.coverColor) {
      slot.innerHTML = renderClosedCoverHTML(coverHex);
      caption.textContent = 'Así se va a ver la portada de tu carpeta.';
    } else {
      slot.innerHTML = `<div style="width:78%;height:88%;border-radius:6px;border:2px dashed rgba(255,255,255,0.3);"></div>`;
      caption.textContent = 'Elegí un color para ver la portada.';
    }
    return;
  }

  if (wizardStep === 2) {
    slot.style.background = 'var(--black)';
    if (wizardState.size) {
      const { cols, rows } = SIZES[wizardState.size];
      const cells = cols * rows;
      slot.innerHTML = renderClosedCoverHTML(coverHex);
      caption.textContent = `Carpeta ${SIZES[wizardState.size].label} — ${cells} slots por hoja.`;
    } else {
      slot.innerHTML = renderClosedCoverHTML(coverHex);
      caption.textContent = 'Elegí un tamaño para ver cómo queda la hoja.';
    }
    return;
  }

  // Paso 3: folio real — franja fina de color, predomina el negro (como un binder físico)
  if (!PREVIEW_CARD) {
    slot.innerHTML = '';
    slot.style.background = 'var(--black)';
    caption.textContent = 'Cargando carta de muestra…';
    if (!previewCardLoading) loadPreviewCard(); // por si la primera carga falló, reintenta sola
    return;
  }
  slot.innerHTML = renderCardFaceSVG(PREVIEW_CARD, { compact: true });
  if (wizardState.folioColor) {
    const hex = resolveSwatchHex(wizardState.folioColor);
    slot.style.background = hex === 'transparent' ? 'var(--black)' : hex;
    caption.textContent = wizardState.folioColor === 'transparente'
      ? 'Folio transparente: se ve el fondo negro de la carpeta.'
      : `Folio color ${wizardState.folioColor}.`;
  } else {
    slot.style.background = 'var(--black)';
    caption.textContent = 'Elegí un color de folio.';
  }
}

function wizardGoNext() {
  if (!isWizardStepValid()) return;
  if (wizardStep < 3) {
    wizardStep += 1;
    renderWizardStep();
  } else {
    createBinder(wizardState);
    resetWizard();
    renderLibrary();
    goToView('library');
  }
}

function wizardGoBack() {
  if (wizardStep === 1) return;
  wizardStep -= 1;
  renderWizardStep();
}

function escapeAttr(str) {
  return String(str || '').replace(/"/g, '&quot;');
}
