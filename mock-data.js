/**
 * mock-data.js
 * -----------------------------------------------------------------------
 * Catálogo de prueba para Fase 1. Estructura pensada para calcar la forma
 * final de cards/by-set/{setId}.json una vez que exista el pipeline real
 * (Fase 2). Cuando eso pase, MOCK_CARDS se reemplaza por datos fetch-eados
 * y el resto de la app no debería tener que cambiar.
 *
 * id canónico = `${setId}-${number}` (mismo estándar que TCGdex / pokemontcg.io)
 */

const MOCK_SETS = {
  base1: { name: 'Base Set', releaseYear: 1999 },
  jungle: { name: 'Jungle', releaseYear: 1999 },
  neo1: { name: 'Neo Genesis', releaseYear: 2000 },
  aquapolis: { name: 'Aquapolis', releaseYear: 2003 },
};

const MOCK_CARDS = [
  { id: 'base1-4', name: 'Charizard', hp: 120, type: 'fire', rarity: 'Rare Holo', setId: 'base1', number: '4', illustrator: 'Mitsuhiro Arita', attack: { name: 'Fire Spin', damage: 100, text: 'Descartá 2 Energía de Fuego unida a este Pokémon.' } },
  { id: 'base1-2', name: 'Blastoise', hp: 100, type: 'water', rarity: 'Rare Holo', setId: 'base1', number: '2', illustrator: 'Ken Sugimori', attack: { name: 'Hydro Pump', damage: 40, text: 'Hace 10 de daño extra por cada Energía de Agua adicional.' } },
  { id: 'base1-15', name: 'Venusaur', hp: 100, type: 'grass', rarity: 'Rare Holo', setId: 'base1', number: '15', illustrator: 'Mitsuhiro Arita', attack: { name: 'Solar Beam', damage: 60, text: '' } },
  { id: 'base1-58', name: 'Pikachu', hp: 40, type: 'electric', rarity: 'Common', setId: 'base1', number: '58', illustrator: 'Atsuko Nishida', attack: { name: 'Gnaw', damage: 10, text: '' } },
  { id: 'base1-10', name: 'Mewtwo', hp: 60, type: 'psychic', rarity: 'Rare Holo', setId: 'base1', number: '10', illustrator: 'Ken Sugimori', attack: { name: 'Psychic', damage: 10, text: 'Hace 10 más por cada carta de Energía unida al Pokémon defensor.' } },
  { id: 'base1-8', name: 'Machamp', hp: 100, type: 'fighting', rarity: 'Rare Holo', setId: 'base1', number: '8', illustrator: 'Ken Sugimori', attack: { name: 'Seismic Toss', damage: 60, text: '' } },
  { id: 'base1-46', name: 'Diglett', hp: 30, type: 'fighting', rarity: 'Common', setId: 'base1', number: '46', illustrator: 'Keiji Kinebuchi', attack: { name: 'Dig', damage: 10, text: '' } },
  { id: 'base1-33', name: 'Gastly', hp: 30, type: 'psychic', rarity: 'Common', setId: 'base1', number: '33', illustrator: 'Mitsuhiro Arita', attack: { name: 'Sleeping Gas', damage: 0, text: 'El Pokémon defensor queda Dormido.' } },

  { id: 'jungle-1', name: 'Clefable', hp: 70, type: 'colorless', rarity: 'Rare Holo', setId: 'jungle', number: '1', illustrator: 'Ken Sugimori', attack: { name: 'Metronome', damage: 0, text: 'Copiá el ataque de un Pokémon defensor.' } },
  { id: 'jungle-6', name: 'Scyther', hp: 70, type: 'grass', rarity: 'Rare Holo', setId: 'jungle', number: '6', illustrator: 'Ken Sugimori', attack: { name: 'Slash', damage: 30, text: '' } },
  { id: 'jungle-18', name: 'Flareon', hp: 60, type: 'fire', rarity: 'Uncommon', setId: 'jungle', number: '18', illustrator: 'Mitsuhiro Arita', attack: { name: 'Flamethrower', damage: 50, text: 'Descartá 1 Energía de Fuego unida a este Pokémon.' } },
  { id: 'jungle-46', name: 'Pinsir', hp: 60, type: 'grass', rarity: 'Common', setId: 'jungle', number: '46', illustrator: 'Keiji Kinebuchi', attack: { name: 'Guillotine', damage: 20, text: '' } },
  { id: 'jungle-54', name: 'Wigglytuff', hp: 80, type: 'colorless', rarity: 'Rare Holo', setId: 'jungle', number: '54', illustrator: 'Ken Sugimori', attack: { name: 'Sing', damage: 0, text: 'El Pokémon defensor queda Dormido.' } },

  { id: 'neo1-9', name: 'Lugia', hp: 90, type: 'colorless', rarity: 'Rare Holo', setId: 'neo1', number: '9', illustrator: 'Ken Sugimori', attack: { name: 'Aeroblast', damage: 40, text: '' } },
  { id: 'neo1-17', name: 'Ampharos', hp: 100, type: 'electric', rarity: 'Rare Holo', setId: 'neo1', number: '17', illustrator: 'Mitsuhiro Arita', attack: { name: 'Strong Charge', damage: 20, text: '' } },
  { id: 'neo1-38', name: 'Chikorita', hp: 40, type: 'grass', rarity: 'Common', setId: 'neo1', number: '38', illustrator: 'Ken Sugimori', attack: { name: 'Vine Whip', damage: 10, text: '' } },
  { id: 'neo1-45', name: 'Cyndaquil', hp: 40, type: 'fire', rarity: 'Common', setId: 'neo1', number: '45', illustrator: 'Mitsuhiro Arita', attack: { name: 'Smokescreen', damage: 10, text: '' } },
  { id: 'neo1-53', name: 'Totodile', hp: 40, type: 'water', rarity: 'Common', setId: 'neo1', number: '53', illustrator: 'Ken Sugimori', attack: { name: 'Scratch', damage: 10, text: '' } },

  { id: 'aquapolis-1', name: 'Alakazam', hp: 70, type: 'psychic', rarity: 'Rare Holo', setId: 'aquapolis', number: '1', illustrator: 'Kagemaru Himeno', attack: { name: 'Shock Wave', damage: 20, text: '' } },
  { id: 'aquapolis-6', name: 'Feraligatr', hp: 100, type: 'water', rarity: 'Rare Holo', setId: 'aquapolis', number: '6', illustrator: 'Mitsuhiro Arita', attack: { name: 'Hyper Claws', damage: 40, text: '' } },
  { id: 'aquapolis-17', name: 'Magneton', hp: 70, type: 'metal', rarity: 'Uncommon', setId: 'aquapolis', number: '17', illustrator: 'Ken Sugimori', attack: { name: 'Magnetic Lines', damage: 0, text: '' } },
  { id: 'aquapolis-70', name: 'Sneasel', hp: 50, type: 'darkness', rarity: 'Common', setId: 'aquapolis', number: '70', illustrator: 'Kagemaru Himeno', attack: { name: 'Scratch Up', damage: 20, text: '' } },
  { id: 'aquapolis-88', name: 'Togepi', hp: 40, type: 'fairy', rarity: 'Common', setId: 'aquapolis', number: '88', illustrator: 'Ken Sugimori', attack: { name: 'Call for Family', damage: 0, text: '' } },
  { id: 'aquapolis-95', name: 'Dratini', hp: 40, type: 'dragon', rarity: 'Common', setId: 'aquapolis', number: '95', illustrator: 'Mitsuhiro Arita', attack: { name: 'Pound', damage: 10, text: '' } },
];

/** Índice rápido id -> carta, simulando el cacheo en memoria de by-set/*.json */
const MOCK_CARDS_BY_ID = MOCK_CARDS.reduce((acc, card) => {
  acc[card.id] = card;
  return acc;
}, {});
