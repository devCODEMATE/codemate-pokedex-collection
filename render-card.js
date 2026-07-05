/**
 * render-card.js
 * -----------------------------------------------------------------------
 * Fase 1: dibujaba un boceto SVG por tipo (no había artwork real todavía).
 * Fase 2: cada carta real de TCGdex trae `image`, así que mostramos el arte
 * de verdad. El boceto SVG queda como respaldo para cuando no hay imagen.
 *
 * Acepta tanto el formato liviano de los índices (`number`, `types`) como
 * el objeto completo de una carta (`localId`, `types`, `attacks`, etc.) —
 * ambos comparten `id`, `name`, `rarity`, `illustrator`, `image`.
 */

const TYPE_COLORS = {
  fire: { border: '#e0653a', fill: '#fdece4' },
  water: { border: '#4f8ecf', fill: '#e7f1fb' },
  grass: { border: '#5fa561', fill: '#eaf5ea' },
  lightning: { border: '#e8c53d', fill: '#fdf7e2' },
  psychic: { border: '#a568b0', fill: '#f4eaf6' },
  fighting: { border: '#b06a3f', fill: '#f5ece2' },
  darkness: { border: '#4b4652', fill: '#e6e4e9' },
  metal: { border: '#8d97a1', fill: '#eef1f3' },
  fairy: { border: '#e08fb0', fill: '#fbecf2' },
  dragon: { border: '#c99a3e', fill: '#f9f0dd' },
  colorless: { border: '#b7ae9c', fill: '#f6f4ee' },
};

function typePalette(type) {
  return TYPE_COLORS[type] || TYPE_COLORS.colorless;
}

/** Silueta simple por tipo — solo se usa si la carta no tiene imagen */
function typeGlyphPath(type) {
  const glyphs = {
    fire: 'M12 2c-1 4-5 5-5 10a5 5 0 0 0 10 0c0-2-1-3-2-4 0 2-1 3-2 2-1-1 0-3-1-8z',
    water: 'M12 2c4 6 6 9 6 12a6 6 0 1 1-12 0c0-3 2-6 6-12z',
    grass: 'M12 3c4 0 7 3 7 7 0 5-4 9-7 11-3-2-7-6-7-11 0-4 3-7 7-7z',
    lightning: 'M13 2 4 14h6l-1 8 9-12h-6z',
    psychic: 'M12 2a7 7 0 0 1 4 12.7V17a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-2.3A7 7 0 0 1 12 2z',
    fighting: 'M6 4h4v6H6zM14 4h4v16h-4zM6 12h4v8H6z',
    darkness: 'M20 14a8 8 0 1 1-9-11 6.5 6.5 0 0 0 9 11z',
    metal: 'M12 2 4 6v6c0 5 3.5 8.7 8 10 4.5-1.3 8-5 8-10V6z',
    fairy: 'M12 2l2.2 5.8L20 10l-5.8 2.2L12 18l-2.2-5.8L4 10l5.8-2.2z',
    dragon: 'M3 12c3-6 8-9 13-9-1 3-1 5 1 6-3 1-4 3-3 6-5 1-9-1-11-3z',
    colorless: 'M12 4a8 8 0 1 0 0 16 8 8 0 0 0 0-16z',
  };
  return glyphs[type] || glyphs.colorless;
}

function primaryType(card) {
  if (card.type) return card.type; // compatibilidad con datos viejos de Fase 1
  if (card.types && card.types[0]) return card.types[0].toLowerCase();
  return 'colorless';
}

function cardNumber(card) {
  return card.number ?? card.localId ?? '';
}

/**
 * Devuelve el marcado para la cara de una carta: <img> con el arte real si
 * `card.image` existe, o el boceto SVG de respaldo si no.
 */
function renderCardFaceSVG(card, { compact = false, quality = 'low' } = {}) {
  if (card.image) {
    return `<img class="card-face" src="${card.image}/${quality}.webp" alt="${escapeXML(card.name)}" loading="lazy" />`;
  }
  return renderCardFaceFallbackSVG(card, { compact });
}

function renderCardFaceFallbackSVG(card, { compact = false } = {}) {
  const type = primaryType(card);
  const palette = typePalette(type);
  const glyph = typeGlyphPath(type);

  return `
  <svg viewBox="0 0 126 176" class="card-face" role="img" aria-label="${escapeXML(card.name)} — imagen próximamente">
    <rect x="2" y="2" width="122" height="172" rx="8" fill="${palette.fill}" stroke="${palette.border}" stroke-width="4"/>
    <rect x="8" y="8" width="110" height="80" rx="4" fill="#ffffff" stroke="${palette.border}" stroke-width="1.5" opacity="0.9"/>
    <g transform="translate(45, 24) scale(1.4)" fill="${palette.border}" opacity="0.6">
      <path d="${glyph}"/>
    </g>
    <text x="63" y="70" font-family="'DM Sans', sans-serif" font-size="6" font-weight="700" fill="${palette.border}" text-anchor="middle" opacity="0.85">${t('imageComingSoonLine1')}</text>
    <text x="63" y="80" font-family="'DM Sans', sans-serif" font-size="6" font-weight="700" fill="${palette.border}" text-anchor="middle" opacity="0.85">${t('imageComingSoonLine2')}</text>
    <text x="10" y="16" font-family="'Space Mono', monospace" font-size="9" font-weight="700" fill="#1a1a1a">${escapeXML(card.name)}</text>
    ${card.hp ? `<text x="116" y="16" font-family="'Space Mono', monospace" font-size="8" font-weight="700" fill="${palette.border}" text-anchor="end">HP${card.hp}</text>` : ''}
    ${!compact ? `
    <rect x="8" y="96" width="110" height="34" rx="3" fill="#ffffff" stroke="${palette.border}" stroke-width="1" opacity="0.9"/>
    <text x="10" y="150" font-family="'DM Sans', sans-serif" font-size="6" fill="#555">${escapeXML(card.rarity || '')}</text>
    <text x="116" y="150" font-family="'DM Sans', sans-serif" font-size="6" fill="#555" text-anchor="end">#${escapeXML(String(cardNumber(card)))}</text>
    <text x="10" y="164" font-family="'DM Sans', sans-serif" font-size="5.5" fill="#888">Ilus. ${escapeXML(card.illustrator || '')}</text>
    ` : `
    <text x="10" y="164" font-family="'DM Sans', sans-serif" font-size="6" font-weight="700" fill="#555">#${escapeXML(String(cardNumber(card)))}</text>
    <text x="116" y="164" font-family="'DM Sans', sans-serif" font-size="5.5" fill="#888" text-anchor="end">${escapeXML(card.setName || '')}</text>
    `}
  </svg>`;
}

function escapeXML(str) {
  return String(str || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  }[c]));
}
